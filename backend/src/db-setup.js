const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up database schema...');
    
    // Create tables
    await client.query(`
      -- Tenants
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Integrations
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_name VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        connected BOOLEAN DEFAULT false,
        connected_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, provider)
      );

      -- Orders
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
        external_id VARCHAR(255),
        source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        total DECIMAL(12, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'THB',
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        shipping_address TEXT,
        items JSONB DEFAULT '[]',
        raw JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, external_id)
      );

      -- Conversations (for Chat)
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        external_id VARCHAR(255),
        customer_name VARCHAR(255),
        customer_avatar TEXT,
        last_message TEXT,
        last_message_at TIMESTAMP,
        unread_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Messages
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50),
        direction VARCHAR(20) NOT NULL,
        content TEXT,
        type VARCHAR(50) DEFAULT 'text',
        status VARCHAR(50) DEFAULT 'sent',
        raw JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Auto-reply Rules
      CREATE TABLE IF NOT EXISTS auto_reply_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(50),
        keyword VARCHAR(255) NOT NULL,
        response TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Activity Logs
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        message TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        message TEXT,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_tenant_id ON auto_reply_rules(tenant_id);
    `);
    
    console.log('✅ Database schema created successfully!');
    
    // Create test tenant and demo data
    await createTestData(client);
    
  } catch (err) {
    console.error('❌ Database setup error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function createTestData(client) {
  // Check if test tenant exists
  const existingTenant = await client.query(
    "SELECT id FROM tenants WHERE id = 'test-shop' OR email = 'demo@example.com'"
  );
  
  if (existingTenant.rows.length === 0) {
    console.log('📝 Creating test tenant and demo data...');
    
    // Create test tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (id, name, email, plan)
      VALUES ('test-shop', 'Demo Shop', 'demo@example.com', 'pro')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `;
    
    const tenantId = tenantResult.rows[0]?.id || 'test-shop';
    
    // Create demo orders
    const sources = ['shopee', 'lazada', 'tiktok', 'shopify'];
    const statuses = ['pending', 'paid', 'packed', 'shipped', 'completed'];
    const customerNames = ['สมชาย วิเชียร', 'สมหญิง รักสุข', 'วิน ใจดี', 'มาร์ค แซ่อึ้ง', 'ซาร่า ณัฐพล'];
    
    for (let i = 0; i < 30; i++) {
      const source = sources[Math.floor(Math.random() * sources.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
      const total = Math.floor(Math.random() * 5000) + 200;
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      await client.query(`
        INSERT INTO orders (tenant_id, source, external_id, status, total, customer_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, external_id) DO NOTHING
      `, [tenantId, source, `${source}_${Date.now()}_${i}`, status, total, customer, createdAt]);
    }
    
    console.log('✅ Demo data created!');
  } else {
    console.log('ℹ️ Test tenant already exists, skipping demo data');
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase, pool };

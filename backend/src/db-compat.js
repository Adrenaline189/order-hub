/**
 * PostgreSQL Database Layer for Order Hub
 * Provides compatibility with the existing LowDB-style API
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
});

// Initialize database tables
const initDatabase = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected!');
    
    // Drop existing tables to recreate with correct schema
    await pool.query(`
      DROP TABLE IF EXISTS oauth_states CASCADE;
      DROP TABLE IF EXISTS webhooks CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS activity_logs CASCADE;
      DROP TABLE IF EXISTS auto_reply_rules CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS conversations CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS integrations CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
    `);
    console.log('🗑️ Dropped existing tables');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY DEFAULT 'test-shop',
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_name VARCHAR(255),
        shop_domain VARCHAR(255),
        shop_name VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        connected BOOLEAN DEFAULT false,
        connected_at TIMESTAMP,
        sync_enabled BOOLEAN DEFAULT true,
        oauth_state VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, provider)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        integration_id TEXT,
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

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        provider VARCHAR(50),
        direction VARCHAR(20) NOT NULL,
        content TEXT,
        type VARCHAR(50) DEFAULT 'text',
        status VARCHAR(50) DEFAULT 'sent',
        raw JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS auto_reply_rules (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        provider VARCHAR(50),
        keyword VARCHAR(255) NOT NULL,
        response TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        action VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        message TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        message TEXT,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        mode VARCHAR(50),
        verification_token VARCHAR(255),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS oauth_states (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        state VARCHAR(255) NOT NULL,
        tenant_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conv_tenant ON conversations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_rules_tenant ON auto_reply_rules(tenant_id);
    `);
    
    // Seed demo data if empty
    await seedDemoData();
    
    return true;
  } catch (err) {
    console.error('❌ Database init error:', err);
    return false;
  }
};

const seedDemoData = async () => {
  try {
    // Check if tenant exists
    const tenantCheck = await pool.query("SELECT id FROM tenants WHERE id = 'test-shop'");
    
    if (tenantCheck.rows.length === 0) {
      console.log('📝 Seeding demo data...');
      
      // Create test tenant
      await pool.query(`
        INSERT INTO tenants (id, name, email, plan)
        VALUES ('test-shop', 'Demo Shop', 'demo@example.com', 'pro')
      `);
      
      // Demo integrations
      await pool.query(`
        INSERT INTO integrations (id, tenant_id, provider, provider_name, connected, connected_at)
        VALUES 
          ('int_shopify_demo', 'test-shop', 'shopify', 'Demo Shopify Store', true, NOW()),
          ('int_line_demo', 'test-shop', 'line', 'LINE Official Account', true, NOW())
        ON CONFLICT (tenant_id, provider) DO NOTHING
      `);
      
      // Demo orders
      const sources = ['shopee', 'lazada', 'tiktok', 'shopify'];
      const statuses = ['pending', 'paid', 'packed', 'shipped', 'completed', 'cancelled'];
      const customers = ['สมชาย วิเชียร', 'สมหญิง รักสุข', 'วิน ใจดี', 'มาร์ค แซ่อึ้ง', 'ซาร่า ณัฐพล'];
      
      for (let i = 0; i < 36; i++) {
        const source = sources[Math.floor(Math.random() * sources.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const total = Math.floor(Math.random() * 5000) + 200;
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        
        await pool.query(`
          INSERT INTO orders (tenant_id, source, external_id, status, total, customer_name, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['test-shop', source, `${source}_${Date.now()}_${i}`, status, total, customer, createdAt]);
      }
      
      // Demo conversations
      const convProviders = ['line', 'shopee', 'lazada', 'tiktok'];
      const convCustomers = ['ลูกค้าสมชาย', 'ลูกค้าสมหญิง', 'คุณวิน', 'คุณมาร์ค'];
      for (let i = 0; i < 4; i++) {
        await pool.query(`
          INSERT INTO conversations (tenant_id, provider, external_id, customer_name, last_message, last_message_at, unread_count)
          VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i} hours', $6)
        `, ['test-shop', convProviders[i], `ext_${i}`, convCustomers[i], 'สอบถามสินค้าค่ะ', Math.floor(Math.random() * 3)]);
      }
      
      // Demo messages for each conversation
      const convs = await pool.query("SELECT id FROM conversations WHERE tenant_id = 'test-shop'");
      for (const conv of convs.rows) {
        await pool.query(`
          INSERT INTO messages (conversation_id, tenant_id, provider, direction, content, created_at)
          VALUES ($1, 'test-shop', 'line', 'inbound', 'สวัสดีค่ะ สนใจสินค้า', NOW() - INTERVAL '30 minutes')
        `, [conv.id]);
        await pool.query(`
          INSERT INTO messages (conversation_id, tenant_id, provider, direction, content, created_at)
          VALUES ($1, 'test-shop', 'line', 'outbound', 'สวัสดีค่ะ ยินดีช่วยเหลือค่ะ', NOW() - INTERVAL '25 minutes')
        `, [conv.id]);
      }
      
      // Demo auto-reply rules
      await pool.query(`
        INSERT INTO auto_reply_rules (tenant_id, keyword, response, enabled)
        VALUES 
          ('test-shop', 'ราคา', 'สินค้านี้ราคา XXX บาทค่ะ สนใจสั่งซื้อได้เลยนะคะ!', true),
          ('test-shop', 'มีของ', 'มีของค่ะ! พร้อมส่งทันที', true),
          ('test-shop', 'ส่ง', 'ส่งฟรีค่ะ สั่งซื้อวันนี้พรุ่งนี้ได้เลย!', true)
      `);
      
      console.log('✅ Demo data seeded!');
    }
  } catch (err) {
    console.error('⚠️ Seed error:', err.message);
  }
};

// Query helper
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('❌ Query error:', err.message);
    throw err;
  }
};

// Save function (no-op for PostgreSQL)
const save = async () => true;

// Legacy-style data access for compatibility
const data = {
  tenants: [],
  integrations: [],
  orders: [],
  conversations: [],
  messages: [],
  auto_reply_rules: [],
  activity_logs: [],
  notifications: [],
  webhooks: [],
  oauth_states: [],
};

const db = {
  data,
  save,
  query,
};

const refresh = async () => true;

module.exports = {
  pool,
  query,
  initDatabase,
  save,
  refresh,
  db,
};

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simple query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Query:', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('❌ Query error:', err.message);
    throw err;
  }
};

// In-memory cache for development (sync operations)
const cache = {
  data: {
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
  }
};

// Initialize database and seed demo data
const initDatabase = async () => {
  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully!');
    
    // Seed demo data if empty
    const tenantCheck = await pool.query("SELECT id FROM tenants WHERE id = 'test-shop'");
    
    if (tenantCheck.rows.length === 0) {
      console.log('📝 Seeding demo data...');
      
      // Create test tenant
      await pool.query(`
        INSERT INTO tenants (id, name, email, plan)
        VALUES ('test-shop', 'Demo Shop', 'demo@example.com', 'pro')
        ON CONFLICT (id) DO NOTHING
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
          VALUES ('test-shop', $1, $2, $3, $4, $5, $6)
          ON CONFLICT (tenant_id, external_id) DO NOTHING
        `, [source, `${source}_ord_${Date.now()}_${i}`, status, total, customer, createdAt]);
      }
      
      // Demo conversations
      const convCustomers = ['ลูกค้าสมชาย', 'ลูกค้าสมหญิง', 'คุณวิน', 'คุณมาร์ค'];
      for (let i = 0; i < 4; i++) {
        await pool.query(`
          INSERT INTO conversations (id, tenant_id, provider, external_id, customer_name, last_message, last_message_at, unread_count)
          VALUES ($1, 'test-shop', $2, $3, $4, $5, NOW() - INTERVAL '${i} hours', $6)
          ON CONFLICT (id) DO NOTHING
        `, [`conv_${i}`, ['line', 'shopee', 'lazada', 'tiktok'][i], `ext_${i}`, convCustomers[i], 'สอบถามสินค้าค่ะ', Math.floor(Math.random() * 3)]);
      }
      
      // Demo messages
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
        ON CONFLICT DO NOTHING
      `);
      
      console.log('✅ Demo data seeded!');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Database init error:', err);
    return false;
  }
};

// Export for use
module.exports = {
  pool,
  query,
  initDatabase,
  
  // Legacy API compatibility
  db: {
    data: cache.data,
    save: async () => {
      // No-op for PostgreSQL (data is persisted directly)
      return true;
    },
    read: async () => {
      // No-op for PostgreSQL
      return cache.data;
    }
  },
  
  refresh: async () => {
    // No-op for PostgreSQL
    return true;
  },
  
  save: async () => {
    // No-op for PostgreSQL (data is persisted directly)
    return true;
  }
};

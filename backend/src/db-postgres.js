const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orderhub',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query helper
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
  return result;
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Migrate function
async function migrate() {
  console.log('🔄 Running PostgreSQL migration...');
  
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    await pool.query(schema);
    console.log('✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

// Import data from LowDB
async function importFromLowDB() {
  console.log('🔄 Importing data from LowDB...');
  
  const dbPath = path.join(__dirname, '../data/db.json');
  if (!fs.existsSync(dbPath)) {
    console.log('⚠️ No LowDB file found, skipping import');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  await transaction(async (client) => {
    // Import orders
    if (data.orders && data.orders.length > 0) {
      console.log(`📦 Importing ${data.orders.length} orders...`);
      
      for (const order of data.orders) {
        await client.query(`
          INSERT INTO orders (id, tenant_id, external_id, source, status, total, currency,
            customer_name, customer_phone, customer_email, shipping_address, items, notes, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (tenant_id, external_id, source) DO UPDATE SET
            status = EXCLUDED.status,
            total = EXCLUDED.total,
            updated_at = EXCLUDED.updated_at
        `, [
          order.id,
          order.tenant_id || 'test-shop',
          order.external_id,
          order.source,
          order.status,
          order.total || 0,
          order.currency || 'THB',
          order.customer_name,
          order.customer_phone,
          order.customer_email,
          order.shipping_address,
          JSON.stringify(order.items || []),
          order.notes,
          order.created_at || new Date().toISOString(),
          order.updated_at || new Date().toISOString(),
        ]);
      }
    }
    
    // Import integrations
    if (data.integrations && data.integrations.length > 0) {
      console.log(`🔗 Importing ${data.integrations.length} integrations...`);
      
      for (const int of data.integrations) {
        await client.query(`
          INSERT INTO integrations (id, tenant_id, provider, shop_name, status, last_sync_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, provider, shop_id) DO UPDATE SET
            status = EXCLUDED.status,
            last_sync_at = EXCLUDED.last_sync_at
        `, [
          int.id,
          int.tenant_id || 'test-shop',
          int.provider,
          int.shop_name,
          int.status || 'pending',
          int.last_sync_at,
          int.created_at || new Date().toISOString(),
        ]);
      }
    }
    
    // Import activity logs
    if (data.activity_logs && data.activity_logs.length > 0) {
      console.log(`📋 Importing ${data.activity_logs.length} activity logs...`);
      
      for (const log of data.activity_logs) {
        await client.query(`
          INSERT INTO activity_logs (id, tenant_id, action, entity_type, entity_id, details, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          log.id,
          log.tenant_id || 'test-shop',
          log.action,
          log.entity_type,
          log.entity_id,
          JSON.stringify(log.details || {}),
          log.created_at || new Date().toISOString(),
        ]);
      }
    }
  });
  
  console.log('✅ Import completed successfully');
}

// Rollback (drop all tables)
async function rollback() {
  console.log('🔄 Rolling back database...');
  
  await pool.query(`
    DROP TABLE IF EXISTS usage CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS sync_logs CASCADE;
    DROP TABLE IF EXISTS activity_logs CASCADE;
    DROP TABLE IF EXISTS order_notes CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS integrations CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS tenants CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  `);
  
  console.log('✅ Rollback completed');
}

// Check database connection
async function checkConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  transaction,
  migrate,
  importFromLowDB,
  rollback,
  checkConnection
};

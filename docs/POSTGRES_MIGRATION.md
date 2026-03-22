# PostgreSQL Migration Guide

Order Hub รองรับทั้ง LowDB (JSON) และ PostgreSQL

## เหตุผลที่ควร migrate เป็น PostgreSQL

| LowDB (JSON) | PostgreSQL |
|--------------|------------|
| เก็บข้อมูลในไฟล์ | Database จริง |
| เหมาะสำหรับ dev/MVP | Production ready |
| ไม่รองรับ concurrent writes | รองรับ concurrent access |
| ไม่มี indexing | Indexing + Query optimization |
| ไม่มี transactions | ACID transactions |
| Limited to single server | Scalable |

## Quick Start

### 1. ติดตั้ง PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql
```

### 2. สร้าง Database

```bash
# Create database
createdb orderhub

# Or via psql
psql postgres
CREATE DATABASE orderhub;
\q
```

### 3. ตั้งค่า Environment Variables

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/orderhub
```

### 4. Migrate

```bash
cd backend
npm run db:migrate
```

## Schema

### Tables

```sql
-- Tenants (ร้านค้า)
CREATE TABLE tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integrations (ช่องทางขาย)
CREATE TABLE integrations (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  provider VARCHAR(50) NOT NULL,
  shop_name VARCHAR(255),
  credentials TEXT, -- encrypted
  status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  integration_id VARCHAR(50) REFERENCES integrations(id),
  external_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  total DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'THB',
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  shipping_address TEXT,
  items JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, external_id, source)
);

-- Create indexes
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_source ON orders(source);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Activity Logs
CREATE TABLE activity_logs (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- Sync Logs
CREATE TABLE sync_logs (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  integration_id VARCHAR(50) REFERENCES integrations(id),
  status VARCHAR(50) NOT NULL,
  orders_synced INTEGER DEFAULT 0,
  orders_skipped INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

## Migration Script

```javascript
// backend/src/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/orderhub'
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  try {
    await pool.query(schema);
    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
```

## Data Migration (JSON → PostgreSQL)

```bash
npm run db:import
```

## Rollback

```bash
npm run db:rollback
```

## Connection Pooling

```javascript
// backend/src/db-postgres.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/orderhub

# Optional: SSL for production
PGSSLMODE=require
```

## Production (Railway/Render)

Railway และ Render มี PostgreSQL ให้ฟรี:

### Railway
```bash
railway init
railway add --plugin postgresql
railway run npm run db:migrate
```

### Render
1. Create PostgreSQL database
2. Copy Internal Database URL
3. Set as `DATABASE_URL` environment variable
4. Run migration

## Monitoring

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

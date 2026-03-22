# Order Hub Backend

ระบบรวมออเดอร์หลายแพลตฟอร์ม - Backend API

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server will be running at http://localhost:3000

## 📡 API Endpoints

### Health
- `GET /health` - Check if server is running
- `GET /ready` - Check if server is ready (DB connected)

### Integrations
- `GET /integrations?tenant_id=xxx` - List integrations
- `POST /integrations/connect` - Connect new integration
- `POST /integrations/disconnect` - Disconnect integration
- `POST /integrations/sync` - Trigger manual sync

### Orders
- `GET /orders?tenant_id=xxx` - List orders with filters
- `POST /orders/ingest` - Ingest orders (with dedupe)
- `GET /orders/:id` - Get single order

### Dashboard
- `GET /dashboard/summary?tenant_id=xxx` - Get summary stats
- `GET /dashboard/activity?tenant_id=xxx` - Get recent activity

## 🧪 Testing

```bash
# Health check
curl http://localhost:3000/health

# Create tenant (for testing)
sqlite3 data/orderhub.db "INSERT INTO tenants (id, name) VALUES ('test-tenant', 'Test Shop');"

# Connect integration
curl -X POST http://localhost:3000/integrations/connect \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test-tenant","provider":"shopee","credentials":{"api_key":"test"}}'

# List integrations
curl "http://localhost:3000/integrations?tenant_id=test-tenant"

# Ingest orders
curl -X POST http://localhost:3000/orders/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":"test-tenant",
    "source":"shopee",
    "orders":[
      {"external_id":"SH001","status":"paid","total":1500,"customer_name":"John Doe"},
      {"external_id":"SH002","status":"pending","total":2000,"customer_name":"Jane Smith"}
    ]
  }'

# List orders
curl "http://localhost:3000/orders?tenant_id=test-tenant"

# Dashboard summary
curl "http://localhost:3000/dashboard/summary?tenant_id=test-tenant"
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.js          # Main entry point
│   ├── db.js             # Database setup
│   └── routes/
│       ├── health.js     # Health endpoints
│       ├── integrations.js
│       ├── orders.js
│       └── dashboard.js
├── data/                 # SQLite database (auto-created)
├── package.json
├── .env.example
└── README.md
```

## 🔧 Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 4
- **Database:** SQLite (better-sqlite3)
- **UUID:** uuid

## 📝 Notes

- Credentials are stored as-is for MVP (encrypt in production!)
- SQLite for development (migrate to PostgreSQL for production)
- No authentication yet (add JWT/OAuth for production)

# Order Hub API Specification

## Base URL

```
Development: http://localhost:3000
Production: https://api.orderhub.app
```

---

## Authentication

All APIs require `Authorization: Bearer <token>` header (except health endpoints).

---

## Endpoints

### Health

#### GET /health
Check if server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-19T00:00:00Z"
}
```

#### GET /ready
Check if server is ready (DB connected).

**Response:**
```json
{
  "status": "ready",
  "database": "connected"
}
```

---

### Integrations

#### GET /integrations
List all integrations for a tenant.

**Query:**
- `tenant_id` (required): Tenant ID

**Response:**
```json
{
  "integrations": [
    {
      "id": "int_abc123",
      "provider": "shopee",
      "status": "connected",
      "shop_name": "My Shop",
      "last_sync_at": "2026-03-19T00:00:00Z",
      "orders_count": 150
    }
  ]
}
```

#### POST /integrations/connect
Connect a new integration.

**Body:**
```json
{
  "tenant_id": "tenant_abc",
  "provider": "shopee",
  "credentials": {
    "api_key": "xxx",
    "api_secret": "xxx",
    "shop_id": "12345"
  }
}
```

**Response:**
```json
{
  "id": "int_abc123",
  "provider": "shopee",
  "status": "connected",
  "message": "Successfully connected to Shopee"
}
```

#### POST /integrations/disconnect
Disconnect an integration.

**Body:**
```json
{
  "integration_id": "int_abc123"
}
```

#### POST /integrations/sync
Trigger manual sync for an integration.

**Body:**
```json
{
  "integration_id": "int_abc123"
}
```

---

### Orders

#### GET /orders
List orders with filters.

**Query:**
- `tenant_id` (required)
- `status` (optional): pending | paid | packed | shipped | completed | cancelled
- `source` (optional): shopee | lazada | tiktok | shopify
- `from` (optional): ISO date
- `to` (optional): ISO date
- `page` (default: 1)
- `limit` (default: 50)

**Response:**
```json
{
  "orders": [
    {
      "id": "ord_abc123",
      "external_id": "SH12345",
      "source": "shopee",
      "status": "paid",
      "total": 1500.00,
      "currency": "THB",
      "customer_name": "John Doe",
      "customer_phone": "0812345678",
      "items_count": 2,
      "created_at": "2026-03-19T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

#### POST /orders/ingest
Ingest orders from a source (used by sync job).

**Body:**
```json
{
  "tenant_id": "tenant_abc",
  "source": "shopee",
  "orders": [
    {
      "external_id": "SH12345",
      "status": "paid",
      "total": 1500.00,
      "currency": "THB",
      "customer_name": "John Doe",
      "customer_phone": "0812345678",
      "items": [...]
    }
  ]
}
```

**Response:**
```json
{
  "ingested": 10,
  "duplicates_skipped": 2,
  "errors": []
}
```

---

### Dashboard

#### GET /dashboard/summary
Get summary stats for dashboard.

**Query:**
- `tenant_id` (required)
- `period` (optional): today | week | month (default: today)

**Response:**
```json
{
  "period": "today",
  "total_orders": 45,
  "total_revenue": 67500.00,
  "by_status": {
    "pending": 5,
    "paid": 20,
    "packed": 10,
    "shipped": 8,
    "completed": 2,
    "cancelled": 0
  },
  "by_source": {
    "shopee": 25,
    "lazada": 15,
    "tiktok": 5
  },
  "top_products": [
    {"name": "Product A", "count": 10},
    {"name": "Product B", "count": 8}
  ]
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Error |

---

## Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "tenant_id is required"
  }
}
```

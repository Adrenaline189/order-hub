# Order Hub 🚀

ระบบรวมออเดอร์หลายแพลตฟอร์มสำหรับร้านค้าออนไลน์ไทย

## ✨ Features

### 📊 Dashboard
- ภาพรวมร้านค้าแบบ real-time
- สถิติตามสถานะและช่องทาง
- กราฟแนวโน้มรายได้

### 📦 Order Management
- รวมออเดอร์จากทุกช่องทางในที่เดียว
- ค้นหา, กรอง, เปลี่ยนสถานะ
- Bulk actions (เลือกหลายรายการ)
- Export CSV/Excel
- พิมพ์ใบรายการ

### 💰 Revenue Tracking
- รายได้ตามช่วงเวลา
- เปรียบเทียบรายได้แต่ละช่องทาง
- แนวโน้มการขาย

### 🔗 Integrations
- **Shopee** - API integration
- **Lazada** - API integration
- **TikTok Shop** - API integration
- **Shopify** - API integration
- **CSV Import** - นำเข้าไฟล์ CSV

### 📋 Activity Log
- บันทึกกิจกรรมทั้งหมด
- Audit trail สำหรับ compliance
- Filter ตามประเภทและการกระทำ

### 🔄 Sync Status
- สถานะการ sync แบบ real-time
- Health monitoring
- Alerts และ notifications

### 🌙 Modern UI
- Dark/Light mode
- Responsive design
- 2 Languages (TH/EN)

## 🛠 Tech Stack

| Frontend | Backend | Database |
|----------|---------|----------|
| Next.js 15 | Node.js 24 | LowDB / PostgreSQL |
| React 18 | Fastify 4 | JSON / SQL |
| Tailwind CSS | JWT Auth | AES-256 encryption |
| TypeScript | LowDB | |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/your-username/order-hub.git
cd order-hub

# Backend
cd backend
npm install
cp .env.example .env
npm start

# Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Demo: demo@orderhub.app / demo123

## 📁 Project Structure

```
order-hub/
├── backend/
│   ├── src/
│   │   ├── index.js          # Fastify server
│   │   ├── db.js             # LowDB adapter
│   │   ├── db-postgres.js    # PostgreSQL adapter
│   │   ├── auth.js           # Auth utilities
│   │   ├── routes/
│   │   │   ├── auth.js       # Login/Register
│   │   │   ├── orders.js     # Orders CRUD
│   │   │   ├── dashboard.js  # Dashboard stats
│   │   │   ├── revenue.js    # Revenue stats
│   │   │   ├── integrations.js
│   │   │   ├── activity-logs.js
│   │   │   ├── sync-status.js
│   │   │   ├── notifications.js
│   │   │   ├── excel.js      # Excel export
│   │   │   └── ...
│   │   └── schema.sql        # PostgreSQL schema
│   └── data/
│       └── db.json           # LowDB data
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/    # Dashboard page
│   │   │   ├── orders/       # Orders list & detail
│   │   │   ├── revenue/      # Revenue stats
│   │   │   ├── integrations/ # Connect channels
│   │   │   ├── sync-status/  # Sync dashboard
│   │   │   ├── activity-logs/
│   │   │   ├── notifications/
│   │   │   ├── settings/
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── Layout.tsx    # Main layout
│   │   │   └── Header.tsx
│   │   └── context/
│   │       ├── ThemeContext.tsx
│   │       ├── LanguageContext.tsx
│   │       └── AuthContext.tsx
│   └── ...
│
└── docs/
    ├── API_SPEC.md
    ├── MVP_PLAN.md
    ├── POSTGRES_MIGRATION.md
    └── DEPLOY.md
```

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login user |
| GET | `/orders` | List orders |
| GET | `/orders/:id` | Get order detail |
| GET | `/orders/:id/timeline` | Order timeline |
| PATCH | `/orders/:id/status` | Update status |
| POST | `/orders/:id/notes` | Add note |
| POST | `/orders/bulk-update` | Bulk update |
| GET | `/dashboard/summary` | Dashboard stats |
| GET | `/revenue` | Revenue stats |
| GET | `/integrations` | List integrations |
| POST | `/integrations/connect` | Connect channel |
| GET | `/sync/status` | Sync status |
| GET | `/sync/alerts` | Sync alerts |
| GET | `/activity-logs` | Activity logs |
| GET | `/notifications` | Notifications |
| GET | `/export/excel` | Export Excel |
| GET | `/export/csv` | Export CSV |

## 🗄️ Database

### Development (LowDB)

Default: JSON file storage
- Location: `backend/data/db.json`
- No setup required
- Perfect for MVP/Development

### Production (PostgreSQL)

```bash
# Set DATABASE_URL
export DATABASE_URL=postgresql://localhost:5432/orderhub

# Run migration
npm run db:migrate

# Import from LowDB
npm run db:import
```

## 🚀 Deploy

### Quick Deploy

- **Frontend**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
- **Backend**: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

### Step-by-Step

See [DEPLOY.md](./docs/DEPLOY.md) for detailed instructions.

## 📊 Pricing Plans

| Plan | Price | Orders | Channels |
|------|-------|--------|----------|
| Free | $0 | 100/mo | 1 |
| Starter | $9 | 1,000/mo | 2 |
| Pro | $29 | 10,000/mo | 5 |
| Business | $99 | Unlimited | Unlimited |

## 🤝 Contributing

```bash
# Fork repo
git checkout -b feature/amazing-feature

# Make changes
git commit -m "Add amazing feature"

# Push
git push origin feature/amazing-feature

# Create Pull Request
```

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Shopee Open Platform
- Lazada Open Platform
- TikTok Shop API
- Shopify API

---

**Made with ❤️ for Thai merchants**

[Website](https://orderhub.app) · [Docs](./docs) · [API](./docs/API_SPEC.md)

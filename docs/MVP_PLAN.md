# Order Hub - MVP Plan (14 วัน)

## 🎯 เป้าหมาย

สร้างระบบรวมออเดอร์หลายแพลตฟอร์ม (SaaS) สำหรับร้านค้าออนไลน์ไทย

---

## 📅 แผน 14 วัน

### Week 1: Core Backend

| Day | งาน | Deliverable |
|-----|-----|-------------|
| 1 | Project setup + DB schema | Backend scaffold, SQLite tables |
| 2 | Integrations API | Connect/disconnect/reconnect |
| 3 | Orders API + Dedupe | Ingest, dedupe, query |
| 4 | Mock connectors | Shopee/Lazada mock data |
| 5 | Sync job + Scheduler | Auto sync every 5 min |
| 6 | Dashboard summary | Stats by status/source |
| 7 | Testing + Polish | Unit tests, error handling |

### Week 2: Frontend + Launch

| Day | งาน | Deliverable |
|-----|-----|-------------|
| 8 | Frontend scaffold | Next.js + Tailwind |
| 9 | Integrations page | Connect/disconnect UI |
| 10 | Orders page | List, filter, search |
| 11 | Dashboard | Charts, summary cards |
| 12 | Auth + Tenant | Login, tenant isolation |
| 13 | Polish + Deploy | UI polish, Vercel/Railway |
| 14 | Launch MVP | Production ready |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                 Frontend (Next.js)           │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
│  │Dashboard│ │ Orders  │ │ Integrations │   │
│  └────┬────┘ └────┬────┘ └──────┬───────┘   │
└───────┼──────────┼─────────────┼────────────┘
        │          │             │
        ▼          ▼             ▼
┌─────────────────────────────────────────────┐
│              Backend API (Fastify)           │
│  ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
│  │ Orders  │ │  Sync   │ │ Integrations │   │
│  │   API   │ │   Job   │ │     API      │   │
│  └────┬────┘ └────┬────┘ └──────┬───────┘   │
└───────┼──────────┼─────────────┼────────────┘
        │          │             │
        ▼          ▼             ▼
┌─────────────────────────────────────────────┐
│              Database (SQLite → PG)          │
│  tenants | users | integrations | orders    │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│           External APIs (Connectors)         │
│  Shopee | Lazada | TikTok Shop | Shopify    │
└─────────────────────────────────────────────┘
```

---

## 🔌 Connectors Roadmap

### Phase 1 (MVP)
- [ ] Mock Shopee (test data)
- [ ] Mock Lazada (test data)
- [ ] CSV Import

### Phase 2 (Real API)
- [ ] Shopee Partner API
- [ ] Lazada Open Platform
- [ ] TikTok Shop API

### Phase 3 (E-commerce)
- [ ] Shopify
- [ ] WooCommerce
- [ ] LINE OA

---

## 💰 Pricing Model

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 channel, 100 orders/month |
| Starter | $9/mo | 2 channels, 1000 orders/month |
| Pro | $29/mo | 5 channels, 10000 orders/month |
| Business | $99/mo | Unlimited, priority support |

---

## 📊 Success Metrics

- [ ] 10 beta users in Week 2
- [ ] 100 orders synced in first week
- [ ] < 5 sec sync latency
- [ ] 99.9% uptime

---

## 🚀 Quick Start

```bash
cd ~/order-hub/backend
npm install
npm run dev
```

API will be available at http://localhost:3000

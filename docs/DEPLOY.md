# Deploy Order Hub

Order Hub ประกอบด้วย 2 ส่วน:
- **Frontend** → Vercel
- **Backend** → Railway

---

## 🎯 Quick Deploy

### Frontend (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/order-hub&project-name=order-hub-frontend&repository-name=order-hub&root-directory=frontend)

### Backend (Railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

---

## 📋 Step-by-Step

### 1. Prerequisites

- GitHub account
- Vercel account (free)
- Railway account (free tier: $5/month credit)
- PostgreSQL database (Railway provides free PostgreSQL)

---

### 2. Deploy Backend (Railway)

#### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up

# Set environment variables
railway variables set TENANT_ID=test-shop
railway variables set JWT_SECRET=your-secret-key
railway variables set ENCRYPTION_KEY=your-32-char-encryption-key

# Run migration
railway run npm run db:migrate
```

#### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Select your `order-hub` repository
5. Set **Root Directory** to `backend`
6. Add PostgreSQL:
   - Click **+ Add Service**
   - Select **Database** → **PostgreSQL**
7. Set environment variables:
   ```
   TENANT_ID=test-shop
   JWT_SECRET=your-secret-key
   ENCRYPTION_KEY=your-32-char-encryption-key
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
8. Deploy!

#### Get Backend URL

After deployment, Railway will provide a URL like:
```
https://order-hub-backend-production.up.railway.app
```

---

### 3. Deploy Frontend (Vercel)

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
# Enter your Railway backend URL
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
   ```
6. Click **Deploy**

---

### 4. Configure CORS

Update backend CORS settings to allow your Vercel domain:

```javascript
// backend/src/index.js
fastify.register(cors, {
  origin: [
    'http://localhost:3001',
    'https://your-app.vercel.app',
    /\.vercel\.app$/
  ]
});
```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Required
TENANT_ID=test-shop
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key

# Database (Railway provides this)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
STRIPE_SECRET_KEY=sk_live_xxx
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## 🗄️ Database Setup

After deploying backend with PostgreSQL:

```bash
# Run migration
railway run npm run db:migrate

# Import existing data (optional)
railway run npm run db:import
```

---

## 📊 Monitoring

### Railway

```bash
# View logs
railway logs

# Check status
railway status
```

### Vercel

- Dashboard → Your Project → Deployments
- Click on deployment → View Logs

---

## 🔄 CI/CD

### Automatic Deploy

Both Vercel and Railway will automatically deploy when you push to `main` branch.

### Manual Deploy

```bash
# Backend
railway up

# Frontend
vercel --prod
```

---

## 💰 Cost Estimation

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth | Pro: $20/month |
| Railway | $5 credit/month | Usage-based |
| PostgreSQL | 1GB free | $5/month for more |

**Typical monthly cost for small store**: FREE - $5

---

## 🚨 Troubleshooting

### Backend won't start

```bash
# Check logs
railway logs

# Common issues:
# - DATABASE_URL not set
# - Migration not run
# - Port conflict
```

### Frontend can't connect to backend

1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Check CORS settings in backend
3. Check backend is running: `curl https://your-backend/health`

### Database connection error

```bash
# Check connection
railway run npm run db:check

# Re-run migration
railway run npm run db:migrate
```

---

## 🔐 Security Checklist

- [ ] Change default `JWT_SECRET`
- [ ] Change default `ENCRYPTION_KEY`
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Set up rate limiting
- [ ] Enable Row Level Security in PostgreSQL
- [ ] Configure CORS properly
- [ ] Set up error monitoring (Sentry)

---

## 📱 Custom Domain

### Vercel (Frontend)

1. Go to Project Settings → Domains
2. Add your domain (e.g., `orderhub.yourdomain.com`)
3. Update DNS records as instructed

### Railway (Backend)

1. Go to Project Settings → Domains
2. Add custom domain
3. Update DNS records

---

## 🎉 Done!

Your Order Hub is now live! 🚀

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`
- Database: PostgreSQL on Railway

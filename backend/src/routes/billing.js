const { db, refresh, save, generateId } = require('../db');
const { sendTelegramMessage } = require('../telegram');
const { verifyToken } = require('../auth');

// Pricing plans
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    channels: 1,
    orders_per_month: 100,
    features: ['1 ช่องทาง', '100 ออเดอร์/เดือน', 'Dashboard พื้นฐาน'],
  },
  starter: {
    name: 'Starter',
    price: 9,
    channels: 2,
    orders_per_month: 1000,
    features: ['2 ช่องทาง', '1,000 ออเดอร์/เดือน', 'Telegram Alerts', 'Export CSV'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    channels: 5,
    orders_per_month: 10000,
    features: ['5 ช่องทาง', '10,000 ออเดอร์/เดือน', 'Telegram Alerts', 'Export CSV/PDF', 'Priority Support'],
  },
  business: {
    name: 'Business',
    price: 99,
    channels: -1, // unlimited
    orders_per_month: -1, // unlimited
    features: ['ช่องทางไม่จำกัด', 'ออเดอร์ไม่จำกัด', 'Telegram Alerts', 'Export CSV/PDF', 'Priority Support', 'Custom Integrations'],
  },
};

module.exports = async function (fastify, opts) {
  // Get available plans
  fastify.get('/billing/plans', async (request, reply) => {
    return { plans: PLANS };
  });

  // Get current subscription
  fastify.get('/billing/subscription', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: { code: 'UNAUTHORIZED', message: 'No token provided' } };
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      reply.code(401);
      return { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } };
    }

    await refresh();

    const tenant = db.data.tenants.find(t => t.id === payload.tenantId);
    if (!tenant) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Tenant not found' } };
    }

    const plan = PLANS[tenant.plan] || PLANS.free;

    // Get usage stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = db.data.orders.filter(
      o => o.tenant_id === tenant.id && new Date(o.created_at) >= thisMonth
    ).length;

    const activeChannels = db.data.integrations.filter(
      i => i.tenant_id === tenant.id && i.status === 'connected'
    ).length;

    return {
      plan: {
        id: tenant.plan,
        ...plan,
      },
      usage: {
        channels: activeChannels,
        channels_limit: plan.channels,
        orders: monthlyOrders,
        orders_limit: plan.orders_per_month,
      },
      billing: tenant.billing || null,
    };
  });

  // Upgrade plan (mock - in production, this would integrate with Stripe)
  fastify.post('/billing/upgrade', async (request, reply) => {
    const { plan_id } = request.body;

    if (!PLANS[plan_id]) {
      reply.code(400);
      return { error: { code: 'INVALID_PLAN', message: 'Invalid plan ID' } };
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: { code: 'UNAUTHORIZED', message: 'No token provided' } };
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      reply.code(401);
      return { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } };
    }

    await refresh();

    const tenantIdx = db.data.tenants.findIndex(t => t.id === payload.tenantId);
    if (tenantIdx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Tenant not found' } };
    }

    // In production, this would create a Stripe checkout session
    // For MVP, we'll just update the plan
    db.data.tenants[tenantIdx].plan = plan_id;
    db.data.tenants[tenantIdx].billing = {
      plan_id,
      started_at: new Date().toISOString(),
      // This would be the actual billing info from Stripe
    };

    await save();

    return {
      success: true,
      plan: {
        id: plan_id,
        ...PLANS[plan_id],
      },
      message: 'Plan upgraded successfully (mock)',
    };
  });

  // Telegram settings
  fastify.post('/telegram/setup', async (request, reply) => {
    const { integration_id, chat_id } = request.body;

    if (!integration_id || !chat_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'integration_id and chat_id are required' } };
    }

    await refresh();

    const idx = db.data.integrations.findIndex(i => i.id === integration_id);
    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Integration not found' } };
    }

    db.data.integrations[idx].telegram_chat_id = chat_id;
    await save();

    // Send test message
    await sendTelegramMessage(chat_id, '✅ Order Hub เชื่อมต่อ Telegram สำเร็จแล้ว!');

    return { success: true, message: 'Telegram connected successfully' };
  });

  // Test Telegram
  fastify.post('/telegram/test', async (request, reply) => {
    const { chat_id, message } = request.body;

    if (!chat_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'chat_id is required' } };
    }

    const result = await sendTelegramMessage(chat_id, message || '🧪 Test message from Order Hub');

    return result;
  });

  // Get Telegram bot info
  fastify.get('/telegram/info', async (request, reply) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return {
        configured: false,
        message: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN environment variable.',
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      
      if (data.ok) {
        return {
          configured: true,
          bot: {
            id: data.result.id,
            username: data.result.username,
            name: data.result.first_name,
          },
          instructions: `Send a message to @${data.result.username} and copy your chat ID to setup alerts.`,
        };
      }
      
      return { configured: false, error: data.description };
    } catch (err) {
      return { configured: false, error: err.message };
    }
  });
};

require('dotenv').config();

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const { initDb } = require('./db');
const { verifyToken } = require('./auth');

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Register Multipart (for file uploads)
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Auth decorator
fastify.decorateRequest('user', null);
fastify.decorateRequest('tenantId', null);

// Auth middleware hook
fastify.addHook('onRequest', async (request, reply) => {
  // Skip auth for public routes
  const publicPaths = ['/', '/health', '/ready', '/auth/login', '/auth/register', '/csv/template', '/mock/providers'];
  if (publicPaths.some(p => request.url.startsWith(p))) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      request.user = payload.userId;
      request.tenantId = payload.tenantId;
    }
  }
});

// Register routes
fastify.register(require('./routes/health'));
fastify.register(require('./routes/auth'));
fastify.register(require('./routes/integrations'));
fastify.register(require('./routes/orders'));
fastify.register(require('./routes/dashboard'));
fastify.register(require('./routes/revenue'));
fastify.register(require('./routes/csv'));
fastify.register(require('./routes/mock'));
fastify.register(require('./routes/billing'));
fastify.register(require('./routes/export'));
fastify.register(require('./routes/excel'));
fastify.register(require('./routes/notifications'));
fastify.register(require('./routes/activity-logs'));
fastify.register(require('./routes/sync-status'));
fastify.register(require('./routes/shopify'));
fastify.register(require('./routes/chat'));

// Root route
fastify.get('/', async (request, reply) => {
  return {
    name: 'Order Hub API',
    version: '0.1.0',
    endpoints: ['/health', '/integrations', '/orders', '/dashboard']
  };
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await initDb();
    
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Order Hub API running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

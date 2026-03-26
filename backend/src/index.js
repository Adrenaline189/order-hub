require('dotenv').config();

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

const { initDatabase, query, db, refresh, save } = require('./db-compat');
const apiRoutes = require('./routes/api-v1');
const shopifyConnect = require('./routes/shopify-connect');

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

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));
fastify.get('/', async () => ({ 
  name: 'Order Hub API', 
  version: '1.0.0',
  status: 'running'
}));

// Register API routes
fastify.register(shopifyConnect);
fastify.register(apiRoutes);

// Auth routes placeholder
fastify.post('/auth/login', async (request, reply) => {
  return { token: 'demo-token', tenant_id: 'test-shop' };
});

fastify.post('/auth/register', async (request, reply) => {
  return { token: 'demo-token', tenant_id: 'test-shop' };
});

// Start server
const start = async () => {
  try {
    console.log('🚀 Starting Order Hub API...');
    
    // Initialize database
    await initDatabase();
    
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`✅ Order Hub API running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

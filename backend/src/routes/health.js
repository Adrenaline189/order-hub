module.exports = async function (fastify, opts) {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  // Readiness check
  fastify.get('/ready', async (request, reply) => {
    const { db } = require('../db');
    try {
      await db.read();
      return {
        status: 'ready',
        database: 'connected'
      };
    } catch (err) {
      reply.code(503);
      return {
        status: 'not_ready',
        database: 'disconnected',
        error: err.message
      };
    }
  });
};

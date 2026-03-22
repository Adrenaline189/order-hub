const { integrations, orders, syncLogs, save, refresh } = require('../db');

module.exports = async function (fastify, opts) {
  // List integrations
  fastify.get('/integrations', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh(); // Refresh data from file
    
    const items = integrations.all(tenant_id);
    
    // Add order counts
    const integrationsWithCounts = items.map(int => {
      const orderList = orders.all(tenant_id).filter(o => o.integration_id === int.id);
      return { ...int, orders_count: orderList.length };
    });

    return { integrations: integrationsWithCounts };
  });

  // Connect integration
  fastify.post('/integrations/connect', async (request, reply) => {
    const { tenant_id, provider, credentials } = request.body;

    if (!tenant_id || !provider) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id and provider are required' } };
    }

    // Validate provider
    const validProviders = ['shopee', 'lazada', 'tiktok', 'shopify', 'csv'];
    if (!validProviders.includes(provider)) {
      reply.code(400);
      return { error: { code: 'INVALID_PROVIDER', message: `Provider must be one of: ${validProviders.join(', ')}` } };
    }

    const integration = integrations.create({
      tenant_id,
      provider,
      shop_id: credentials?.shop_id || null,
      shop_name: credentials?.shop_name || provider,
      credentials: credentials || null, // TODO: Encrypt in production!
      last_sync_at: null,
      error_message: null
    });

    await save();

    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      shop_name: integration.shop_name,
      message: `Successfully connected to ${provider}`
    };
  });

  // Disconnect integration
  fastify.post('/integrations/disconnect', async (request, reply) => {
    const { integration_id } = request.body;

    if (!integration_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'integration_id is required' } };
    }

    await refresh();
    
    const result = integrations.update(integration_id, { 
      status: 'disconnected',
      sync_enabled: false
    });

    if (!result) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Integration not found' } };
    }

    await save();

    return { success: true, message: 'Integration disconnected', integration: result };
  });

  // Trigger sync
  fastify.post('/integrations/sync', async (request, reply) => {
    const { integration_id } = request.body;

    if (!integration_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'integration_id is required' } };
    }

    const integration = integrations.find(integration_id);

    if (!integration) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Integration not found' } };
    }

    // For MVP, return mock sync result
    // In production, this would trigger a background job
    const log = syncLogs.create({
      integration_id,
      status: 'completed',
      orders_synced: 5,
      orders_skipped: 0,
      completed_at: new Date().toISOString()
    });

    integrations.update(integration_id, { last_sync_at: new Date().toISOString() });

    await save();

    return {
      success: true,
      sync_id: log.id,
      orders_synced: log.orders_synced,
      message: 'Sync completed'
    };
  });
};

const { orders, integrations, save, refresh } = require('../db');

// Mock data generators
const MOCK_ORDERS = {
  shopee: [
    { external_id: 'SH' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'paid', total: 1200, customer_name: 'สมชาย ใจดี', customer_phone: '0812345678' },
    { external_id: 'SH' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'pending', total: 850, customer_name: 'สมหญิง รักสวย', customer_phone: '0898765432' },
    { external_id: 'SH' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'shipped', total: 2500, customer_name: 'สมศักดิ์ มั่งมี', customer_phone: '0861234567' },
  ],
  lazada: [
    { external_id: 'LZ' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'paid', total: 3200, customer_name: 'วิภา ขยัน', customer_phone: '0912345678' },
    { external_id: 'LZ' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'packed', total: 990, customer_name: 'ประยุทธ์ จริงใจ', customer_phone: '0923456789' },
  ],
  tiktok: [
    { external_id: 'TT' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'paid', total: 450, customer_name: 'มานะ ตั้งใจ', customer_phone: '0934567890' },
    { external_id: 'TT' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'pending', total: 1800, customer_name: 'มานี มีสุข', customer_phone: '0945678901' },
    { external_id: 'TT' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'completed', total: 5500, customer_name: 'สุขใจ ดีใจ', customer_phone: '0956789012' },
  ],
  shopify: [
    { external_id: 'SF' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'paid', total: 150, customer_name: 'John Smith', customer_phone: '+14155551234' },
    { external_id: 'SF' + Math.random().toString(36).substring(2, 8).toUpperCase(), status: 'shipped', total: 280, customer_name: 'Jane Doe', customer_phone: '+14155555678' },
  ],
};

module.exports = async function (fastify, opts) {
  // Get available mock providers
  fastify.get('/mock/providers', async (request, reply) => {
    return {
      providers: [
        { id: 'shopee', name: 'Shopee', orders_available: 3 },
        { id: 'lazada', name: 'Lazada', orders_available: 2 },
        { id: 'tiktok', name: 'TikTok Shop', orders_available: 3 },
        { id: 'shopify', name: 'Shopify', orders_available: 2 },
      ],
    };
  });

  // Sync mock orders for a provider
  fastify.post('/mock/sync', async (request, reply) => {
    const { tenant_id, provider } = request.body;

    if (!tenant_id || !provider) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id and provider are required' } };
    }

    const mockOrders = MOCK_ORDERS[provider];
    if (!mockOrders) {
      reply.code(400);
      return { error: { code: 'INVALID_PROVIDER', message: `No mock data for provider: ${provider}` } };
    }

    await refresh();

    // Get integration
    const integration = integrations.findByProvider(tenant_id, provider);
    if (!integration) {
      reply.code(400);
      return { error: { code: 'NOT_CONNECTED', message: `Provider ${provider} not connected` } };
    }

    let ingested = 0;
    let duplicatesSkipped = 0;

    for (const mockOrder of mockOrders) {
      // Check for duplicate
      const existing = orders.findByExternalId(tenant_id, provider, mockOrder.external_id);
      if (existing) {
        duplicatesSkipped++;
        continue;
      }

      orders.create({
        tenant_id,
        integration_id: integration.id,
        external_id: mockOrder.external_id,
        source: provider,
        status: mockOrder.status,
        total: mockOrder.total,
        currency: 'THB',
        customer_name: mockOrder.customer_name,
        customer_phone: mockOrder.customer_phone,
        items: [],
        raw: mockOrder,
      });

      ingested++;
    }

    // Update integration last_sync_at
    integrations.update(integration.id, { last_sync_at: new Date().toISOString() });

    await save();

    return {
      provider,
      ingested,
      duplicates_skipped: duplicatesSkipped,
      total_mock_orders: mockOrders.length,
    };
  });

  // Generate random mock orders
  fastify.post('/mock/generate', async (request, reply) => {
    const { tenant_id, provider, count = 5 } = request.body;

    if (!tenant_id || !provider) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id and provider are required' } };
    }

    await refresh();

    // Get integration
    const integration = integrations.findByProvider(tenant_id, provider);
    if (!integration) {
      reply.code(400);
      return { error: { code: 'NOT_CONNECTED', message: `Provider ${provider} not connected` } };
    }

    const statuses = ['pending', 'paid', 'packed', 'shipped', 'completed'];
    const prefixes = { shopee: 'SH', lazada: 'LZ', tiktok: 'TT', shopify: 'SF' };
    const prefix = prefixes[provider] || 'ORD';

    const generatedOrders = [];
    for (let i = 0; i < count; i++) {
      const externalId = `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      orders.create({
        tenant_id,
        integration_id: integration.id,
        external_id: externalId,
        source: provider,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        total: Math.floor(Math.random() * 5000) + 100,
        currency: 'THB',
        customer_name: `Customer ${i + 1}`,
        customer_phone: `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        items: [],
      });

      generatedOrders.push(externalId);
    }

    await save();

    return {
      provider,
      generated: count,
      order_ids: generatedOrders,
    };
  });
};

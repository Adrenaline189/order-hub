const { orders, syncLogs, integrations, refresh } = require('../db');

module.exports = async function (fastify, opts) {
  // Dashboard summary
  fastify.get('/dashboard/summary', async (request, reply) => {
    const { tenant_id, period = 'today' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh(); // Refresh data from file

    // Calculate date range
    const now = new Date();
    let fromDate;
    switch (period) {
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // today
        fromDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const totalOrders = orders.count(tenant_id, { from: fromDate.toISOString() });
    const totalRevenue = orders.sumTotal(tenant_id, fromDate.toISOString());
    const byStatus = orders.countByStatus(tenant_id, fromDate.toISOString());
    const bySource = orders.countBySource(tenant_id, fromDate.toISOString());

    // Top products (mock for MVP)
    const topProducts = [
      { name: 'Product A', count: 10 },
      { name: 'Product B', count: 8 },
      { name: 'Product C', count: 5 }
    ];

    return {
      period,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      by_status: byStatus,
      by_source: bySource,
      top_products: topProducts
    };
  });

  // Recent activity
  fastify.get('/dashboard/activity', async (request, reply) => {
    const { tenant_id, limit = 10 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    const recentOrders = orders.all(tenant_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit))
      .map(o => ({
        id: o.id,
        external_id: o.external_id,
        source: o.source,
        status: o.status,
        total: o.total,
        customer_name: o.customer_name,
        created_at: o.created_at
      }));

    const recentSyncs = syncLogs.recent(tenant_id, parseInt(limit))
      .map(l => {
        const int = integrations.find(l.integration_id);
        return {
          id: l.id,
          status: l.status,
          orders_synced: l.orders_synced,
          started_at: l.started_at,
          completed_at: l.completed_at,
          provider: int?.provider || 'unknown'
        };
      });

    return {
      recent_orders: recentOrders,
      recent_syncs: recentSyncs
    };
  });
};

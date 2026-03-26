/**
 * Dashboard Routes (PostgreSQL)
 */

module.exports = async function (fastify, opts) {

  // GET /dashboard/summary
  fastify.get('/dashboard/summary', async (request, reply) => {
    const { tenant_id, period = 'today' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    try {
      const { pool } = require('../db-compat');

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

      // Get orders stats
      const ordersResult = await pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_revenue
        FROM orders 
        WHERE tenant_id = $1 AND created_at >= $2
      `, [tenant_id, fromDate.toISOString()]);

      // Get orders by status
      const statusResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM orders 
        WHERE tenant_id = $1 AND created_at >= $2
        GROUP BY status
      `, [tenant_id, fromDate.toISOString()]);

      // Get orders by source
      const sourceResult = await pool.query(`
        SELECT source, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
        FROM orders 
        WHERE tenant_id = $1 AND created_at >= $2
        GROUP BY source
      `, [tenant_id, fromDate.toISOString()]);

      const totalOrders = parseInt(ordersResult.rows[0]?.total_orders || '0');
      const totalRevenue = parseFloat(ordersResult.rows[0]?.total_revenue || '0');

      const byStatus = {};
      statusResult.rows.forEach(row => {
        byStatus[row.status] = parseInt(row.count);
      });

      const bySource = {};
      sourceResult.rows.forEach(row => {
        bySource[row.source] = {
          orders: parseInt(row.count),
          revenue: parseFloat(row.revenue)
        };
      });

      // Top products (simplified - would need order_items table for real data)
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

    } catch (err) {
      console.error('Dashboard summary error:', err);
      reply.code(500);
      return { error: 'Failed to fetch dashboard data' };
    }
  });

  // GET /dashboard/activity
  fastify.get('/dashboard/activity', async (request, reply) => {
    const { tenant_id, limit = 10 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    try {
      const { pool } = require('../db-compat');

      const recentOrders = await pool.query(`
        SELECT id, external_id, source, status, total, customer_name, created_at
        FROM orders 
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [tenant_id, parseInt(limit)]);

      return {
        recent_orders: recentOrders.rows,
        recent_syncs: []
      };

    } catch (err) {
      console.error('Dashboard activity error:', err);
      reply.code(500);
      return { error: 'Failed to fetch activity data' };
    }
  });
};

/**
 * REST API Routes for Order Hub - PostgreSQL Version
 * Compatible with the frontend
 */

const { query, db, refresh, save, initDatabase } = require('../db-compat');
const crypto = require('crypto');

module.exports = async function (fastify, opts) {
  
  // Initialize database on startup
  await initDatabase();

  // ============================================
  // ORDERS
  // ============================================
  
  fastify.get('/orders', async (request, reply) => {
    const { tenant_id, page = 1, limit = 20, status, source, search } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    let whereClause = 'WHERE tenant_id = $1';
    let params = [tenant_id];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (source && source !== 'all') {
      whereClause += ` AND source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (customer_name ILIKE $${paramIndex} OR external_id ILIKE $${paramIndex} OR id::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM orders ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);
    
    const ordersResult = await query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitInt, offset]
    );

    return {
      data: ordersResult.rows,
      total,
      page: parseInt(page),
      total_pages: Math.ceil(total / limitInt),
    };
  });

  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const result = await query(
      'SELECT * FROM orders WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return { error: { message: 'Order not found' } };
    }

    return { data: result.rows[0] };
  });

  // ============================================
  // DASHBOARD
  // ============================================
  
  fastify.get('/dashboard', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
       FROM orders 
       WHERE tenant_id = $1 AND created_at >= $2`,
      [tenant_id, today.toISOString()]
    );

    // Pending orders
    const pendingResult = await query(
      `SELECT COUNT(*) as pending FROM orders WHERE tenant_id = $1 AND status IN ('pending', 'paid')`,
      [tenant_id]
    );

    // By source
    const bySourceResult = await query(
      `SELECT source, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue 
       FROM orders WHERE tenant_id = $1 
       GROUP BY source`,
      [tenant_id]
    );

    // Recent orders
    const recentResult = await query(
      `SELECT * FROM orders WHERE tenant_id = $1 
       ORDER BY created_at DESC LIMIT 5`,
      [tenant_id]
    );

    return {
      summary: {
        total_orders: parseInt(todayResult.rows[0].total_orders) || 0,
        total_revenue: parseFloat(todayResult.rows[0].total_revenue) || 0,
        pending_orders: parseInt(pendingResult.rows[0].pending) || 0,
      },
      by_source: bySourceResult.rows,
      recent_orders: recentResult.rows,
    };
  });

  // ============================================
  // REVENUE
  // ============================================
  
  fastify.get('/revenue', async (request, reply) => {
    const { tenant_id, period = 'month', from_date, to_date } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    // Calculate date range
    const now = new Date();
    let fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let toDate = now;

    if (from_date && to_date) {
      fromDate = new Date(from_date);
      toDate = new Date(to_date);
    }

    // Summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenant_id, fromDate.toISOString(), toDate.toISOString()]
    );

    // By source
    const bySourceResult = await query(
      `SELECT source, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue 
       FROM orders WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3 
       GROUP BY source`,
      [tenant_id, fromDate.toISOString(), toDate.toISOString()]
    );

    // By time (daily)
    const byTimeResult = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders 
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [tenant_id, fromDate.toISOString(), toDate.toISOString()]
    );

    // Available sources
    const sourcesResult = await query(
      'SELECT DISTINCT source FROM orders WHERE tenant_id = $1 AND source IS NOT NULL',
      [tenant_id]
    );

    return {
      period,
      date_range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      summary: {
        total_revenue: parseFloat(summaryResult.rows[0].total_revenue) || 0,
        total_orders: parseInt(summaryResult.rows[0].total_orders) || 0,
        avg_order_value: parseFloat(summaryResult.rows[0].avg_order_value) || 0,
      },
      by_source: bySourceResult.rows,
      by_time: byTimeResult.rows.map(r => ({
        date: r.date,
        orders: parseInt(r.orders),
        revenue: parseFloat(r.revenue),
      })),
      available_sources: sourcesResult.rows.map(r => r.source),
    };
  });

  fastify.get('/revenue/compare', async (request, reply) => {
    const { tenant_id, period = 'month' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const now = new Date();
    const currentFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE tenant_id = $1 AND created_at >= $2`,
      [tenant_id, currentFrom.toISOString()]
    );

    const previousResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
      [tenant_id, previousFrom.toISOString(), currentFrom.toISOString()]
    );

    const current = {
      orders: parseInt(currentResult.rows[0].total_orders) || 0,
      revenue: parseFloat(currentResult.rows[0].total_revenue) || 0,
      avg_order_value: parseFloat(currentResult.rows[0].avg_order_value) || 0,
    };

    const previous = {
      orders: parseInt(previousResult.rows[0].total_orders) || 0,
      revenue: parseFloat(previousResult.rows[0].total_revenue) || 0,
      avg_order_value: parseFloat(previousResult.rows[0].avg_order_value) || 0,
    };

    const calcChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    return {
      current,
      previous,
      change: {
        orders: calcChange(current.orders, previous.orders),
        revenue: calcChange(current.revenue, previous.revenue),
        avg_order_value: calcChange(current.avg_order_value, previous.avg_order_value),
      },
    };
  });

  // ============================================
  // INTEGRATIONS
  // ============================================
  
  fastify.get('/integrations', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const result = await query(
      'SELECT * FROM integrations WHERE tenant_id = $1',
      [tenant_id]
    );

    return { integrations: result.rows };
  });

  fastify.delete('/integrations/:provider', async (request, reply) => {
    const { provider } = request.params;
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    await query(
      'DELETE FROM integrations WHERE tenant_id = $1 AND provider = $2',
      [tenant_id, provider]
    );

    return { success: true };
  });

  // ============================================
  // CHAT / CONVERSATIONS
  // ============================================
  
  fastify.get('/chat/conversations', async (request, reply) => {
    const { tenant_id, provider, status } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    let whereClause = 'WHERE tenant_id = $1';
    let params = [tenant_id];

    if (provider && provider !== 'all') {
      whereClause += ' AND provider = $2';
      params.push(provider);
    }

    if (status === 'unread') {
      whereClause += ' AND unread_count > 0';
    }

    const result = await query(
      `SELECT * FROM conversations ${whereClause} ORDER BY last_message_at DESC NULLS LAST`,
      params
    );

    return { conversations: result.rows };
  });

  fastify.get('/chat/conversations/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const convResult = await query(
      'SELECT * FROM conversations WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (convResult.rows.length === 0) {
      reply.code(404);
      return { error: { message: 'Conversation not found' } };
    }

    const messagesResult = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    );

    // Mark as read
    await query(
      'UPDATE conversations SET unread_count = 0 WHERE id = $1',
      [id]
    );

    return {
      conversation: convResult.rows[0],
      messages: messagesResult.rows,
    };
  });

  fastify.post('/chat/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id, content, type = 'text' } = request.body;

    if (!tenant_id || !content) {
      reply.code(400);
      return { error: { message: 'tenant_id and content are required' } };
    }

    const convResult = await query(
      'SELECT * FROM conversations WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (convResult.rows.length === 0) {
      reply.code(404);
      return { error: { message: 'Conversation not found' } };
    }

    const messageResult = await query(
      `INSERT INTO messages (conversation_id, tenant_id, provider, direction, content, type, status)
       VALUES ($1, $2, $3, 'outbound', $4, $5, 'sent')
       RETURNING *`,
      [id, tenant_id, convResult.rows[0].provider, content, type]
    );

    // Update conversation
    await query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [content.substring(0, 100), id]
    );

    return { message: messageResult.rows[0] };
  });

  // ============================================
  // AUTO-REPLY
  // ============================================
  
  fastify.get('/chat/auto-reply', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const result = await query(
      'SELECT * FROM auto_reply_rules WHERE tenant_id = $1 ORDER BY priority DESC',
      [tenant_id]
    );

    return { rules: result.rows };
  });

  fastify.post('/chat/auto-reply', async (request, reply) => {
    const { tenant_id, keyword, response, enabled = true } = request.body;

    if (!tenant_id || !keyword || !response) {
      reply.code(400);
      return { error: { message: 'tenant_id, keyword, and response are required' } };
    }

    const result = await query(
      `INSERT INTO auto_reply_rules (tenant_id, keyword, response, enabled)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenant_id, keyword.toLowerCase(), response, enabled]
    );

    return { rule: result.rows[0] };
  });

  fastify.delete('/chat/auto-reply/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    await query(
      'DELETE FROM auto_reply_rules WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    return { success: true };
  });

  // ============================================
  // CHAT ANALYTICS
  // ============================================
  
  fastify.get('/chat/analytics', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
        COUNT(*) FILTER (WHERE direction = 'outbound') as outbound
       FROM messages WHERE tenant_id = $1`,
      [tenant_id]
    );

    const byProviderResult = await query(
      `SELECT provider, COUNT(*) as total
       FROM messages WHERE tenant_id = $1 AND provider IS NOT NULL
       GROUP BY provider`,
      [tenant_id]
    );

    return {
      summary: {
        total_messages: parseInt(summaryResult.rows[0].total_messages) || 0,
        inbound: parseInt(summaryResult.rows[0].inbound) || 0,
        outbound: parseInt(summaryResult.rows[0].outbound) || 0,
      },
      by_provider: byProviderResult.rows,
    };
  });

  // ============================================
  // NOTIFICATIONS
  // ============================================
  
  fastify.get('/notifications/counts', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE read = false) as unread,
        COUNT(*) as total
       FROM notifications WHERE tenant_id = $1`,
      [tenant_id]
    );

    return {
      unread: parseInt(result.rows[0].unread) || 0,
      total: parseInt(result.rows[0].total) || 0,
    };
  });

  // ============================================
  // SYNC STATUS
  // ============================================
  
  fastify.get('/sync-status', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    const result = await query(
      'SELECT * FROM integrations WHERE tenant_id = $1',
      [tenant_id]
    );

    return { platforms: result.rows };
  });

  fastify.post('/sync/:provider', async (request, reply) => {
    const { provider } = request.params;
    const { tenant_id } = request.body;

    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }

    // For now, just mark as synced
    const result = await query(
      `UPDATE integrations SET updated_at = NOW() 
       WHERE tenant_id = $1 AND provider = $2
       RETURNING *`,
      [tenant_id, provider]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return { error: { message: `${provider} not connected` } };
    }

    return { success: true, synced: 0 };
  });
};

const { db, refresh, save } = require('../db');
const { logActivity } = require('./activity-logs');

module.exports = async function (fastify, opts) {
  // List all orders with pagination and filters
  fastify.get('/orders', async (request, reply) => {
    const { tenant_id, page = 1, limit = 20, status, source, search } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let orders = db.data.orders.filter(o => o.tenant_id === tenant_id);

    // Filter by status
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    // Filter by source
    if (source && source !== 'all') {
      orders = orders.filter(o => o.source === source);
    }

    // Search by customer name or order ID
    if (search) {
      const searchLower = search.toLowerCase();
      orders = orders.filter(o => 
        (o.customer_name && o.customer_name.toLowerCase().includes(searchLower)) ||
        (o.external_id && o.external_id.toLowerCase().includes(searchLower)) ||
        (o.id && o.id.toLowerCase().includes(searchLower))
      );
    }

    // Sort by created_at desc
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedOrders = orders.slice(offset, offset + parseInt(limit));

    return {
      data: paginatedOrders,
      total,
      page: parseInt(page),
      total_pages: totalPages,
    };
  });

  // Get single order with full details
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const order = db.data.orders.find(
      o => o.id === id && o.tenant_id === tenant_id
    );

    if (!order) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    // Get integration info
    const integration = db.data.integrations.find(i => i.id === order.integration_id);

    return {
      order: {
        ...order,
        integration: integration ? {
          id: integration.id,
          provider: integration.provider,
          shop_name: integration.shop_name,
        } : null,
      },
    };
  });

  // Update order status
  fastify.patch('/orders/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id, status, notes } = request.body;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const idx = db.data.orders.findIndex(
      o => o.id === id && o.tenant_id === tenant_id
    );

    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    // Update fields
    const oldStatus = db.data.orders[idx].status;
    if (status) {
      const validStatuses = ['pending', 'paid', 'packed', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        reply.code(400);
        return { error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` } };
      }
      db.data.orders[idx].status = status;
    }

    if (notes !== undefined) {
      db.data.orders[idx].notes = notes;
    }

    db.data.orders[idx].updated_at = new Date().toISOString();

    await save();

    // Log activity
    if (status && oldStatus !== status) {
      await logActivity(tenant_id, 'status_change', 'order', id, {
        old_status: oldStatus,
        new_status: status,
        description: `เปลี่ยนสถานะจาก "${oldStatus}" เป็น "${status}"`,
      });
    }

    return { order: db.data.orders[idx] };
  });

  // Add note to order
  fastify.post('/orders/:id/notes', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id, note } = request.body;

    if (!tenant_id || !note) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id and note are required' } };
    }

    await refresh();

    const idx = db.data.orders.findIndex(
      o => o.id === id && o.tenant_id === tenant_id
    );

    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    // Initialize notes array if not exists
    if (!db.data.orders[idx].notes_list) {
      db.data.orders[idx].notes_list = [];
    }

    db.data.orders[idx].notes_list.push({
      id: `note_${Date.now()}`,
      text: note,
      created_at: new Date().toISOString(),
    });

    db.data.orders[idx].updated_at = new Date().toISOString();

    await save();

    // Log activity
    await logActivity(tenant_id, 'note_add', 'order', id, {
      note_preview: note.substring(0, 50),
      description: 'เพิ่มบันทึกใหม่',
    });

    return { 
      success: true, 
      note: db.data.orders[idx].notes_list[db.data.orders[idx].notes_list.length - 1] 
    };
  });

  // Search orders
  fastify.get('/orders/search', async (request, reply) => {
    const { tenant_id, q, page = 1, limit = 50 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let orders = db.data.orders.filter(o => o.tenant_id === tenant_id);

    // Search query
    if (q) {
      const query = q.toLowerCase();
      orders = orders.filter(o => 
        (o.external_id && o.external_id.toLowerCase().includes(query)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
        (o.customer_phone && o.customer_phone.includes(query)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(query))
      );
    }

    const total = orders.length;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedOrders = orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + parseInt(limit));

    return {
      orders: paginatedOrders.map(o => ({
        id: o.id,
        external_id: o.external_id,
        source: o.source,
        status: o.status,
        total: o.total,
        currency: o.currency,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        created_at: o.created_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    };
  });

  // Bulk update status
  fastify.post('/orders/bulk-update', async (request, reply) => {
    const { tenant_id, order_ids, status } = request.body;

    if (!tenant_id || !order_ids || !Array.isArray(order_ids) || !status) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id, order_ids (array), and status are required' } };
    }

    const validStatuses = ['pending', 'paid', 'packed', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      reply.code(400);
      return { error: { code: 'INVALID_STATUS', message: `Status must be one of: ${validStatuses.join(', ')}` } };
    }

    await refresh();

    let updated = 0;
    const errors = [];

    for (const orderId of order_ids) {
      const idx = db.data.orders.findIndex(
        o => o.id === orderId && o.tenant_id === tenant_id
      );

      if (idx !== -1) {
        db.data.orders[idx].status = status;
        db.data.orders[idx].updated_at = new Date().toISOString();
        updated++;
      } else {
        errors.push({ order_id: orderId, error: 'Not found' });
      }
    }

    await db.write();

    return { updated, errors };
  });

  // Get orders with date range
  fastify.get('/orders/range', async (request, reply) => {
    const { tenant_id, from, to, status, source, page = 1, limit = 50 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let orders = db.data.orders.filter(o => o.tenant_id === tenant_id);

    // Date range filter
    if (from) {
      const fromDate = new Date(from);
      orders = orders.filter(o => new Date(o.created_at) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      orders = orders.filter(o => new Date(o.created_at) <= toDate);
    }

    // Status filter
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    // Source filter
    if (source) {
      orders = orders.filter(o => o.source === source);
    }

    const total = orders.length;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedOrders = orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + parseInt(limit));

    return {
      orders: paginatedOrders.map(o => ({
        id: o.id,
        external_id: o.external_id,
        source: o.source,
        status: o.status,
        total: o.total,
        currency: o.currency,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        created_at: o.created_at,
      })),
      date_range: {
        from: from || null,
        to: to || null,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    };
  });

  // Delete note
  fastify.delete('/orders/:id/notes/:note_id', async (request, reply) => {
    const { id, note_id } = request.params;
    const { tenant_id } = request.body;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const idx = db.data.orders.findIndex(
      o => o.id === id && o.tenant_id === tenant_id
    );

    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    if (db.data.orders[idx].notes_list) {
      db.data.orders[idx].notes_list = db.data.orders[idx].notes_list.filter(
        n => n.id !== note_id
      );
    }

    db.data.orders[idx].updated_at = new Date().toISOString();

    await save();

    // Log activity
    await logActivity(tenant_id, 'note_delete', 'order', id, {
      note_id,
      description: 'ลบบันทึก',
    });

    return { success: true };
  });
};

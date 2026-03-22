const { db, refresh, save, generateId } = require('../db');

module.exports = async function (fastify, opts) {
  // Get notifications
  fastify.get('/notifications', async (request, reply) => {
    const { tenant_id, limit = 50, unread_only = false } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let notifications = db.data.notifications || [];
    notifications = notifications.filter(n => n.tenant_id === tenant_id);

    if (unread_only === 'true') {
      notifications = notifications.filter(n => !n.read_at);
    }

    notifications = notifications
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));

    // Get unread count
    const unreadCount = (db.data.notifications || []).filter(
      n => n.tenant_id === tenant_id && !n.read_at
    ).length;

    return {
      notifications,
      unread_count: unreadCount,
    };
  });

  // Mark notification as read
  fastify.post('/notifications/:id/read', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.body;

    await refresh();

    const idx = (db.data.notifications || []).findIndex(
      n => n.id === id && n.tenant_id === tenant_id
    );

    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Notification not found' } };
    }

    db.data.notifications[idx].read_at = new Date().toISOString();

    await save();

    return { success: true };
  });

  // Mark all notifications as read
  fastify.post('/notifications/read-all', async (request, reply) => {
    const { tenant_id } = request.body;

    await refresh();

    db.data.notifications = (db.data.notifications || []).map(n => {
      if (n.tenant_id === tenant_id && !n.read_at) {
        n.read_at = new Date().toISOString();
      }
      return n;
    });

    await save();

    return { success: true };
  });

  // Create notification (internal use)
  const createNotification = async (tenant_id, type, title, message, data = {}) => {
    await refresh();

    if (!db.data.notifications) {
      db.data.notifications = [];
    }

    const notification = {
      id: generateId('notif'),
      tenant_id,
      type,
      title,
      message,
      data,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    db.data.notifications.push(notification);

    // Keep only last 100 notifications per tenant
    const tenantNotifs = db.data.notifications.filter(n => n.tenant_id === tenant_id);
    if (tenantNotifs.length > 100) {
      const toKeep = tenantNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
      db.data.notifications = db.data.notifications.filter(n => n.tenant_id !== tenant_id);
      db.data.notifications.push(...toKeep);
    }

    await save();

    return notification;
  };

  // Get notification counts by type
  fastify.get('/notifications/counts', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const notifications = (db.data.notifications || []).filter(n => n.tenant_id === tenant_id);

    const counts = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read_at).length,
      by_type: {},
    };

    notifications.forEach(n => {
      counts.by_type[n.type] = (counts.by_type[n.type] || 0) + 1;
    });

    return counts;
  });

  // Delete notification
  fastify.delete('/notifications/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    await refresh();

    const idx = (db.data.notifications || []).findIndex(
      n => n.id === id && n.tenant_id === tenant_id
    );

    if (idx === -1) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Notification not found' } };
    }

    db.data.notifications.splice(idx, 1);

    await save();

    return { success: true };
  });

  // Clear all notifications
  fastify.delete('/notifications/clear', async (request, reply) => {
    const { tenant_id } = request.query;

    await refresh();

    db.data.notifications = (db.data.notifications || []).filter(
      n => n.tenant_id !== tenant_id
    );

    await save();

    return { success: true };
  });
};

// Export helper for other modules
module.exports.createNotification = async (db, tenant_id, type, title, message, data) => {
  if (!db.data.notifications) {
    db.data.notifications = [];
  }

  const notification = {
    id: `notif_${Math.random().toString(36).substring(2, 8)}`,
    tenant_id,
    type,
    title,
    message,
    data,
    read_at: null,
    created_at: new Date().toISOString(),
  };

  db.data.notifications.push(notification);
  await db.write();

  return notification;
};

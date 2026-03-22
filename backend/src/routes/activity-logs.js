const { db, refresh, save, generateId } = require('../db');

// Log an activity
const logActivity = async (tenantId, action, entityType, entityId, details, userId = null) => {
  await refresh();
  
  if (!db.data.activity_logs) {
    db.data.activity_logs = [];
  }

  const log = {
    id: generateId('log'),
    tenant_id: tenantId,
    user_id: userId,
    action, // 'create', 'update', 'delete', 'sync', 'export', 'note_add', 'status_change'
    entity_type: entityType, // 'order', 'integration', 'note', 'sync'
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };

  db.data.activity_logs.push(log);

  // Keep only last 1000 logs per tenant
  const tenantLogs = db.data.activity_logs.filter(l => l.tenant_id === tenantId);
  if (tenantLogs.length > 1000) {
    const toKeep = tenantLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 1000);
    db.data.activity_logs = db.data.activity_logs.filter(l => l.tenant_id !== tenantId);
    db.data.activity_logs.push(...toKeep);
  }

  await save();
  return log;
};

// Get activity logs
const getLogs = async (tenantId, filters = {}) => {
  await refresh();
  
  let logs = (db.data.activity_logs || []).filter(l => l.tenant_id === tenantId);

  if (filters.entity_type) {
    logs = logs.filter(l => l.entity_type === filters.entity_type);
  }
  if (filters.entity_id) {
    logs = logs.filter(l => l.entity_id === filters.entity_id);
  }
  if (filters.action) {
    logs = logs.filter(l => l.action === filters.action);
  }
  if (filters.from) {
    logs = logs.filter(l => new Date(l.created_at) >= new Date(filters.from));
  }
  if (filters.to) {
    logs = logs.filter(l => new Date(l.created_at) <= new Date(filters.to));
  }

  return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// Get timeline for an entity
const getTimeline = async (tenantId, entityType, entityId) => {
  await refresh();
  
  const logs = (db.data.activity_logs || [])
    .filter(l => 
      l.tenant_id === tenantId && 
      l.entity_type === entityType && 
      l.entity_id === entityId
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return logs;
};

module.exports = async function (fastify, opts) {
  // Get activity logs
  fastify.get('/activity-logs', async (request, reply) => {
    const { tenant_id, entity_type, entity_id, action, from, to, limit = 100 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    const logs = await getLogs(tenant_id, { entity_type, entity_id, action, from, to });

    return {
      logs: logs.slice(0, parseInt(limit)).map(l => ({
        id: l.id,
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        details: l.details,
        created_at: l.created_at,
      })),
      total: logs.length,
    };
  });

  // Get order timeline
  fastify.get('/orders/:id/timeline', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    // Get order first
    await refresh();
    const order = db.data.orders.find(o => o.id === id && o.tenant_id === tenant_id);
    if (!order) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    const timeline = await getTimeline(tenant_id, 'order', id);

    // Add order creation as first event if not in logs
    const events = timeline.map(l => ({
      id: l.id,
      type: l.action,
      title: getActionTitle(l.action, l.details),
      description: l.details?.description || '',
      created_at: l.created_at,
    }));

    // Check if creation event exists
    if (!events.find(e => e.type === 'created')) {
      events.unshift({
        id: 'initial',
        type: 'created',
        title: 'สร้างออเดอร์',
        description: `ออเดอร์ถูกสร้างจาก ${order.source}`,
        created_at: order.created_at,
      });
    }

    return { timeline: events };
  });

  // Get recent activity summary
  fastify.get('/activity-logs/summary', async (request, reply) => {
    const { tenant_id, hours = 24 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    const logs = (db.data.activity_logs || [])
      .filter(l => l.tenant_id === tenant_id && new Date(l.created_at) >= since);

    const summary = {
      total: logs.length,
      by_action: {},
      by_entity_type: {},
      recent: logs.slice(0, 10).map(l => ({
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        details: l.details,
        created_at: l.created_at,
      })),
    };

    logs.forEach(l => {
      summary.by_action[l.action] = (summary.by_action[l.action] || 0) + 1;
      summary.by_entity_type[l.entity_type] = (summary.by_entity_type[l.entity_type] || 0) + 1;
    });

    return summary;
  });
};

// Helper function
function getActionTitle(action, details) {
  const titles = {
    created: 'สร้าง',
    status_change: `เปลี่ยนสถานะเป็น "${details?.new_status || ''}"`,
    note_add: 'เพิ่มบันทึก',
    note_delete: 'ลบบันทึก',
    update: 'อัพเดท',
    sync: `Sync สำเร็จ (${details?.count || 0} รายการ)`,
    sync_error: `Sync ล้มเหลว: ${details?.error || ''}`,
    export: `Export ${details?.format || ''}`,
    bulk_update: `เปลี่ยนสถานะ ${details?.count || 0} รายการ`,
  };
  return titles[action] || action;
}

// Export helpers
module.exports.logActivity = logActivity;
module.exports.getLogs = getLogs;
module.exports.getTimeline = getTimeline;

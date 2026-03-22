const { db, refresh } = require('../db');

module.exports = async function (fastify, opts) {
  // Get sync status for all integrations
  fastify.get('/sync/status', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const integrations = db.data.integrations.filter(i => i.tenant_id === tenant_id);
    
    const syncStatus = integrations.map(int => {
      // Get last sync log
      const syncLogs = (db.data.sync_logs || [])
        .filter(l => l.integration_id === int.id)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      
      const lastSync = syncLogs[0];
      
      // Get today's sync count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySyncs = syncLogs.filter(l => new Date(l.started_at) >= today);
      
      // Calculate sync health
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSyncs = syncLogs.filter(l => new Date(l.started_at) >= last7Days);
      const failedSyncs = recentSyncs.filter(l => l.status === 'failed' || l.status === 'error');
      
      let health = 'healthy';
      if (failedSyncs.length > 3) health = 'unhealthy';
      else if (failedSyncs.length > 0) health = 'warning';
      
      // Get order count for this integration
      const orderCount = db.data.orders.filter(o => o.integration_id === int.id).length;

      return {
        integration_id: int.id,
        provider: int.provider,
        shop_name: int.shop_name,
        status: int.status,
        last_sync: lastSync ? {
          id: lastSync.id,
          status: lastSync.status,
          orders_synced: lastSync.orders_synced || 0,
          orders_skipped: lastSync.orders_skipped || 0,
          started_at: lastSync.started_at,
          completed_at: lastSync.completed_at,
          error: lastSync.error_message,
        } : null,
        today_syncs: todaySyncs.length,
        total_orders: orderCount,
        health,
        sync_enabled: int.status === 'connected',
      };
    });

    return { integrations: syncStatus };
  });

  // Get sync history
  fastify.get('/sync/history', async (request, reply) => {
    const { tenant_id, integration_id, days = 7, limit = 100 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    // Get integration IDs for tenant
    const integrationIds = integration_id 
      ? [integration_id]
      : db.data.integrations
          .filter(i => i.tenant_id === tenant_id)
          .map(i => i.id);

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    let logs = (db.data.sync_logs || [])
      .filter(l => 
        integrationIds.includes(l.integration_id) && 
        new Date(l.started_at) >= since
      )
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

    // Add provider info
    const logsWithProvider = logs.slice(0, parseInt(limit)).map(l => {
      const int = db.data.integrations.find(i => i.id === l.integration_id);
      return {
        id: l.id,
        provider: int?.provider || 'unknown',
        shop_name: int?.shop_name || '',
        status: l.status,
        orders_synced: l.orders_synced || 0,
        orders_skipped: l.orders_skipped || 0,
        error: l.error_message,
        started_at: l.started_at,
        completed_at: l.completed_at,
        duration_ms: l.completed_at 
          ? new Date(l.completed_at).getTime() - new Date(l.started_at).getTime() 
          : null,
      };
    });

    // Calculate summary stats
    const summary = {
      total_syncs: logs.length,
      successful: logs.filter(l => l.status === 'completed' || l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed' || l.status === 'error').length,
      total_orders_synced: logs.reduce((sum, l) => sum + (l.orders_synced || 0), 0),
      total_orders_skipped: logs.reduce((sum, l) => sum + (l.orders_skipped || 0), 0),
    };

    return {
      logs: logsWithProvider,
      summary,
    };
  });

  // Get sync alerts (problems that need attention)
  fastify.get('/sync/alerts', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const alerts = [];
    const integrations = db.data.integrations.filter(i => i.tenant_id === tenant_id);

    for (const int of integrations) {
      // Check for recent sync failures
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = (db.data.sync_logs || [])
        .filter(l => l.integration_id === int.id && new Date(l.started_at) >= last24h);
      
      const failedSyncs = recentLogs.filter(l => l.status === 'failed' || l.status === 'error');
      
      if (failedSyncs.length > 0) {
        alerts.push({
          type: 'sync_failed',
          severity: failedSyncs.length > 2 ? 'high' : 'medium',
          provider: int.provider,
          shop_name: int.shop_name,
          message: `${failedSyncs.length} sync ล้มเหลวใน 24 ชั่วโมงที่ผ่านมา`,
          last_error: failedSyncs[0]?.error_message,
          created_at: new Date().toISOString(),
        });
      }

      // Check for no recent syncs
      if (int.status === 'connected') {
        const lastLog = (db.data.sync_logs || [])
          .filter(l => l.integration_id === int.id)
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
        
        const lastSyncTime = lastLog ? new Date(lastLog.started_at) : new Date(0);
        const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 2) {
          alerts.push({
            type: 'no_recent_sync',
            severity: hoursSinceSync > 6 ? 'high' : 'medium',
            provider: int.provider,
            shop_name: int.shop_name,
            message: `ไม่มีการ sync มา ${Math.round(hoursSinceSync)} ชั่วโมง`,
            last_sync: lastLog?.started_at || null,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Check for integration errors
      if (int.error_message) {
        alerts.push({
          type: 'integration_error',
          severity: 'high',
          provider: int.provider,
          shop_name: int.shop_name,
          message: int.error_message,
          created_at: int.updated_at || int.created_at,
        });
      }
    }

    // Check for orders stuck in pending/paid for too long
    const orders = db.data.orders.filter(o => o.tenant_id === tenant_id);
    const stuckOrders = orders.filter(o => {
      if (o.status !== 'pending' && o.status !== 'paid') return false;
      const orderTime = new Date(o.created_at);
      const hoursSinceOrder = (Date.now() - orderTime.getTime()) / (1000 * 60 * 60);
      return hoursSinceOrder > 24;
    });

    if (stuckOrders.length > 0) {
      alerts.push({
        type: 'stuck_orders',
        severity: 'medium',
        message: `${stuckOrders.length} ออเดอร์ค้างนานเกิน 24 ชั่วโมง`,
        created_at: new Date().toISOString(),
      });
    }

    return { 
      alerts: alerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      total: alerts.length,
      high_priority: alerts.filter(a => a.severity === 'high').length,
    };
  });

  // Get sync statistics
  fastify.get('/sync/stats', async (request, reply) => {
    const { tenant_id, days = 30 } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const integrationIds = db.data.integrations
      .filter(i => i.tenant_id === tenant_id)
      .map(i => i.id);

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const logs = (db.data.sync_logs || [])
      .filter(l => integrationIds.includes(l.integration_id) && new Date(l.started_at) >= since);

    // Group by day
    const byDay = {};
    logs.forEach(l => {
      const day = l.started_at.split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { syncs: 0, orders_synced: 0, orders_skipped: 0, failed: 0 };
      }
      byDay[day].syncs++;
      byDay[day].orders_synced += l.orders_synced || 0;
      byDay[day].orders_skipped += l.orders_skipped || 0;
      if (l.status === 'failed' || l.status === 'error') byDay[day].failed++;
    });

    // Group by provider
    const byProvider = {};
    logs.forEach(l => {
      const int = db.data.integrations.find(i => i.id === l.integration_id);
      const provider = int?.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { syncs: 0, orders_synced: 0, failed: 0 };
      }
      byProvider[provider].syncs++;
      byProvider[provider].orders_synced += l.orders_synced || 0;
      if (l.status === 'failed' || l.status === 'error') byProvider[provider].failed++;
    });

    return {
      period_days: parseInt(days),
      total_syncs: logs.length,
      total_orders_synced: logs.reduce((sum, l) => sum + (l.orders_synced || 0), 0),
      total_failed: logs.filter(l => l.status === 'failed' || l.status === 'error').length,
      success_rate: logs.length > 0 
        ? ((1 - logs.filter(l => l.status === 'failed' || l.status === 'error').length / logs.length) * 100).toFixed(1)
        : '100',
      by_day: Object.entries(byDay)
        .map(([day, data]) => ({ day, ...data }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      by_provider: Object.entries(byProvider)
        .map(([provider, data]) => ({ provider, ...data })),
    };
  });
};

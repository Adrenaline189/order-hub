/**
 * Sync Status Routes
 * Provides sync status for all connected integrations
 */

module.exports = async function (fastify, opts) {

  // GET /sync/status
  // Returns sync status for all integrations
  fastify.get('/sync/status', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }

    try {
      const { pool } = require('../db-compat');
      
      // Get all connected integrations
      const result = await pool.query(`
        SELECT 
          id,
          provider,
          provider_name,
          shop_domain,
          shop_name,
          connected,
          sync_enabled,
          connected_at,
          updated_at
        FROM integrations 
        WHERE tenant_id = $1 AND connected = true
      `, [tenant_id]);

      const integrations = result.rows;

      // Build sync status for each integration
      const syncStatus = integrations.map(integration => {
        // For demo, show last sync as the connected time
        // In production, this would come from actual sync history
        const lastSync = integration.connected_at 
          ? {
              id: `sync_${integration.id}`,
              status: 'completed',
              orders_synced: 0,
              orders_skipped: 0,
              started_at: integration.connected_at,
              error: null
            }
          : null;

        return {
          integration_id: integration.id,
          provider: integration.provider,
          shop_name: integration.shop_name || integration.provider_name || integration.provider,
          last_sync: lastSync,
          today_syncs: lastSync ? 1 : 0,
          total_orders: 0,
          health: 'healthy',
          sync_enabled: integration.sync_enabled !== false,
        };
      });

      return { sync_status: syncStatus };

    } catch (err) {
      console.error('Sync status error:', err);
      reply.code(500);
      return { error: 'Failed to fetch sync status' };
    }
  });

  // GET /sync/alerts
  // Returns sync alerts for all integrations
  fastify.get('/sync/alerts', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }

    try {
      const { pool } = require('../db-compat');
      
      // Get integrations that haven't synced recently
      const result = await pool.query(`
        SELECT 
          id,
          provider,
          provider_name,
          shop_name,
          connected,
          connected_at,
          updated_at
        FROM integrations 
        WHERE tenant_id = $1 AND connected = true
      `, [tenant_id]);

      const integrations = result.rows;
      const alerts = [];

      // Check for stale connections (not updated in 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const integration of integrations) {
        if (integration.updated_at && new Date(integration.updated_at) < oneDayAgo) {
          alerts.push({
            type: 'stale_connection',
            severity: 'medium',
            provider: integration.provider,
            shop_name: integration.shop_name || integration.provider,
            message: `No sync activity for ${integration.provider} in 24 hours`,
            created_at: integration.updated_at
          });
        }
      }

      return { alerts };

    } catch (err) {
      console.error('Sync alerts error:', err);
      reply.code(500);
      return { error: 'Failed to fetch alerts' };
    }
  });

  // POST /sync/trigger
  // Manually trigger a sync for a specific integration
  fastify.post('/sync/trigger', async (request, reply) => {
    const { tenant_id, provider } = request.body || {};
    
    if (!tenant_id || !provider) {
      reply.code(400);
      return { error: 'tenant_id and provider required' };
    }

    try {
      const { pool } = require('../db-compat');
      
      // Get integration credentials
      const result = await pool.query(`
        SELECT * FROM integrations 
        WHERE tenant_id = $1 AND provider = $2 AND connected = true
      `, [tenant_id, provider]);

      if (result.rows.length === 0) {
        reply.code(404);
        return { error: 'Integration not found or not connected' };
      }

      const integration = result.rows[0];

      // In production, this would trigger actual sync with the provider
      // For now, just update the timestamp
      await pool.query(`
        UPDATE integrations SET updated_at = NOW() WHERE id = $1
      `, [integration.id]);

      return {
        success: true,
        message: `Sync triggered for ${provider}`,
        sync_id: `sync_${Date.now()}`
      };

    } catch (err) {
      console.error('Sync trigger error:', err);
      reply.code(500);
      return { error: 'Failed to trigger sync' };
    }
  });

};

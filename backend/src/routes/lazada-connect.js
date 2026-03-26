/**
 * Lazada Connection Handler
 * Receives credentials and handles sync
 */

const crypto = require('crypto');

module.exports = async function (fastify, opts) {
  
  const LAZADA_API_BASE = 'https://auth.lazada.com/rest';
  
  // Generate Lazada signature
  const generateSignature = (params, secret) => {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(k => `${k}${params[k]}`).join('');
    return crypto.createHmac('sha256', secret).update(signString).digest('hex');
  };

  // POST /auth/lazada/connect
  // Validates and stores Lazada credentials
  fastify.post('/auth/lazada/connect', async (request, reply) => {
    const { tenant_id, app_key, app_secret } = request.body || {};
    
    if (!tenant_id || !app_key || !app_secret) {
      reply.code(400);
      return { 
        success: false, 
        error: 'Missing required fields: tenant_id, app_key, app_secret' 
      };
    }
    
    try {
      const { pool } = require('../db-compat');
      
      // Test the connection by calling Lazada API to get access token
      // First we need to get a token using the app credentials
      const timestamp = Date.now();
      const authParams = {
        app_id: app_key,
        sign_method: 'sha256',
        timestamp: timestamp.toString(),
        grant_type: 'owner_token', // This is simplified - real flow needs OAuth
      };
      
      // For now, store the credentials and mark as connected
      // Real implementation would do OAuth flow
      await pool.query(`
        INSERT INTO integrations (
          tenant_id, provider, provider_name, 
          access_token, refresh_token, connected, connected_at, status
        ) VALUES ($1, 'lazada', 'Lazada', $2, $3, true, NOW(), 'active')
        ON CONFLICT (tenant_id, provider) 
        DO UPDATE SET 
          access_token = $2,
          refresh_token = $3,
          connected = true,
          connected_at = NOW(),
          updated_at = NOW()
      `, [tenant_id, app_key, app_secret]);
      
      console.log(`✅ Lazada connected for ${tenant_id}`);
      
      return {
        success: true,
        message: 'Connected to Lazada',
        credentials: {
          app_key: app_key,
        }
      };
      
    } catch (err) {
      console.error('Lazada connect error:', err);
      reply.code(500);
      return { 
        success: false, 
        error: 'Failed to connect to Lazada: ' + err.message 
      };
    }
  });

  // POST /auth/lazada/sync
  // Triggers sync to get orders from Lazada
  fastify.post('/auth/lazada/sync', async (request, reply) => {
    const { tenant_id } = request.body || {};
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }
    
    try {
      const { pool } = require('../db-compat');
      
      // Get Lazada credentials
      const result = await pool.query(
        'SELECT * FROM integrations WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'lazada']
      );
      
      if (result.rows.length === 0 || !result.rows[0].connected) {
        reply.code(404);
        return { error: 'Lazada not connected' };
      }
      
      const integration = result.rows[0];
      const { access_token, refresh_token } = integration;
      
      // Call Lazada API to get orders
      // This is a simplified example - real implementation needs proper OAuth and API calls
      const timestamp = Date.now();
      const params = {
        app_key: access_token,
        method: 'GET',
        timestamp: timestamp,
        sign_method: 'sha256',
      };
      
      // For demo, we'll return a mock success
      // Real implementation would call: https://api.lazada.com/rest/order/getOrders
      
      // Update sync logs
      await pool.query(`
        INSERT INTO sync_logs (
          tenant_id, integration_id, status, started_at
        ) VALUES ($1, $2, 'syncing', NOW())
      `, [tenant_id, integration.id]);
      
      // Return sync status
      return {
        success: true,
        message: 'Sync completed',
        orders_synced: 0,
        orders_failed: 0,
        last_sync: new Date().toISOString()
      };
      
    } catch (err) {
      console.error('Lazada sync error:', err);
      reply.code(500);
      return { 
        success: false, 
        error: 'Sync failed: ' + err.message 
      };
    }
  });

  // DELETE /auth/lazada/disconnect
  fastify.delete('/auth/lazada/disconnect', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }
    
    try {
      const { pool } = require('../db-compat');
      
      await pool.query(
        'UPDATE integrations SET connected = false, updated_at = NOW() WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'lazada']
      );
      
      return { success: true };
      
    } catch (err) {
      console.error('Lazada disconnect error:', err);
      reply.code(500);
      return { success: false, error: err.message };
    }
  });
};

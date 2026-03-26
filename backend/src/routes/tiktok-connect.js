/**
 * TikTok Shop Connection Handler
 */

module.exports = async function (fastify, opts) {

  // POST /auth/tiktok/connect
  fastify.post('/auth/tiktok/connect', async (request, reply) => {
    const { tenant_id, app_id, app_secret, shop_id } = request.body || {};

    if (!tenant_id || !app_id || !app_secret || !shop_id) {
      reply.code(400);
      return {
        success: false,
        error: 'Missing required fields: tenant_id, app_id, app_secret, shop_id'
      };
    }

    try {
      const { pool } = require('../db-compat');

      // Store the credentials
      await pool.query(`
        INSERT INTO integrations (
          tenant_id, provider, provider_name,
          access_token, refresh_token, connected, connected_at, status
        ) VALUES ($1, 'tiktok', 'TikTok Shop', $2, $3, true, NOW(), 'active')
        ON CONFLICT (tenant_id, provider)
        DO UPDATE SET
          access_token = $2,
          refresh_token = $3,
          connected = true,
          connected_at = NOW(),
          updated_at = NOW()
      `, [tenant_id, `${app_id}:${shop_id}`, app_secret]);

      console.log(`✅ TikTok connected for ${tenant_id}`);

      return {
        success: true,
        message: 'Connected to TikTok Shop',
        credentials: {
          app_id,
          shop_id,
        }
      };

    } catch (err) {
      console.error('TikTok connect error:', err);
      reply.code(500);
      return {
        success: false,
        error: 'Failed to connect to TikTok: ' + err.message
      };
    }
  });

  // DELETE /auth/tiktok/disconnect
  fastify.delete('/auth/tiktok/disconnect', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }

    try {
      const { pool } = require('../db-compat');

      await pool.query(
        'UPDATE integrations SET connected = false, updated_at = NOW() WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'tiktok']
      );

      return { success: true };

    } catch (err) {
      console.error('TikTok disconnect error:', err);
      reply.code(500);
      return { success: false, error: err.message };
    }
  });
};

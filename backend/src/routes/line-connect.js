/**
 * LINE Connection Handler
 */

module.exports = async function (fastify, opts) {

  // POST /auth/line/connect
  fastify.post('/auth/line/connect', async (request, reply) => {
    const { tenant_id, channel_id, channel_secret, access_token } = request.body || {};

    if (!tenant_id || !channel_id || !channel_secret || !access_token) {
      reply.code(400);
      return {
        success: false,
        error: 'Missing required fields: tenant_id, channel_id, channel_secret, access_token'
      };
    }

    try {
      const { pool } = require('../db-compat');

      // Test the token by calling LINE API
      const testRes = await fetch('https://api.line.me/v2/profile', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      let lineDisplayName = 'LINE Official Account';
      if (testRes.ok) {
        const profile = await testRes.json();
        lineDisplayName = profile.displayName || lineDisplayName;
      }

      // Store the credentials
      await pool.query(`
        INSERT INTO integrations (
          tenant_id, provider, provider_name,
          access_token, refresh_token, connected, connected_at, status
        ) VALUES ($1, 'line', $2, $3, $4, true, NOW(), 'active')
        ON CONFLICT (tenant_id, provider)
        DO UPDATE SET
          access_token = $3,
          refresh_token = $4,
          provider_name = $2,
          connected = true,
          connected_at = NOW(),
          updated_at = NOW()
      `, [tenant_id, lineDisplayName, access_token, channel_secret]);

      console.log(`✅ LINE connected for ${tenant_id}`);

      return {
        success: true,
        message: 'Connected to LINE',
        credentials: {
          channel_id,
          display_name: lineDisplayName,
        }
      };

    } catch (err) {
      console.error('LINE connect error:', err);
      reply.code(500);
      return {
        success: false,
        error: 'Failed to connect to LINE: ' + err.message
      };
    }
  });

  // DELETE /auth/line/disconnect
  fastify.delete('/auth/line/disconnect', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }

    try {
      const { pool } = require('../db-compat');

      await pool.query(
        'UPDATE integrations SET connected = false, updated_at = NOW() WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'line']
      );

      return { success: true };

    } catch (err) {
      console.error('LINE disconnect error:', err);
      reply.code(500);
      return { success: false, error: err.message };
    }
  });
};

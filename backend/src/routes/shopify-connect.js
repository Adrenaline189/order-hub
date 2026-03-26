/**
 * Shopify Connection Handler
 * Receives credentials from frontend and validates
 */

const crypto = require('crypto');

module.exports = async function (fastify, opts) {
  
  // POST /auth/shopify/connect
  // Receives: { tenant_id, store_url, api_key, api_secret, access_token }
  fastify.post('/auth/shopify/connect', async (request, reply) => {
    const { tenant_id, store_url, api_key, api_secret, access_token } = request.body || {};
    
    if (!tenant_id || !store_url || !api_key || !api_secret || !access_token) {
      reply.code(400);
      return { 
        success: false, 
        error: 'Missing required fields: tenant_id, store_url, api_key, api_secret, access_token' 
      };
    }
    
    // Clean store URL
    const cleanStoreUrl = store_url.replace('https://', '').replace('http://', '').replace(/\/$/, '');
    
    try {
      // Test the connection by fetching shop info
      const testUrl = `https://${cleanStoreUrl}/admin/api/2024-01/shop.json`;
      
      const response = await fetch(testUrl, {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify connection test failed:', errorText);
        reply.code(401);
        return { 
          success: false, 
          error: 'Invalid credentials - could not connect to Shopify store' 
        };
      }
      
      const shopData = await response.json();
      const shop = shopData.shop;
      
      // Store the integration
      const { pool } = require('../db-compat');
      
      await pool.query(`
        INSERT INTO integrations (
          tenant_id, provider, provider_name, shop_domain, shop_name,
          access_token, refresh_token, connected, connected_at, status
        ) VALUES ($1, 'shopify', 'Shopify', $2, $3, $4, $5, true, NOW(), 'active')
        ON CONFLICT (tenant_id, provider) 
        DO UPDATE SET 
          access_token = $4,
          refresh_token = $5,
          shop_domain = $2,
          shop_name = $3,
          connected = true,
          connected_at = NOW(),
          updated_at = NOW()
      `, [
        tenant_id, 
        cleanStoreUrl, 
        shop?.name || cleanStoreUrl,
        access_token,
        api_secret // store secret in refresh_token field for now
      ]);
      
      console.log(`✅ Shopify connected for ${tenant_id}: ${cleanStoreUrl}`);
      
      return {
        success: true,
        message: `Connected to ${shop?.name || cleanStoreUrl}`,
        shop: {
          name: shop?.name,
          domain: cleanStoreUrl,
          email: shop?.email
        }
      };
      
    } catch (err) {
      console.error('Shopify connect error:', err);
      reply.code(500);
      return { 
        success: false, 
        error: 'Failed to connect to Shopify: ' + err.message 
      };
    }
  });
  
  // GET /auth/shopify/verify
  // Verify connection and return shop info
  fastify.get('/auth/shopify/verify', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }
    
    try {
      const { pool } = require('../db-compat');
      
      const result = await pool.query(
        'SELECT * FROM integrations WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'shopify']
      );
      
      if (result.rows.length === 0 || !result.rows[0].connected) {
        return { connected: false };
      }
      
      const integration = result.rows[0];
      
      // Test connection
      const testUrl = `https://${integration.shop_domain}/admin/api/2024-01/shop.json`;
      const response = await fetch(testUrl, {
        headers: {
          'X-Shopify-Access-Token': integration.access_token,
        }
      });
      
      if (!response.ok) {
        return { connected: false, error: 'Token expired or invalid' };
      }
      
      const shopData = await response.json();
      
      return {
        connected: true,
        shop: {
          name: shopData.shop?.name,
          domain: integration.shop_domain,
          email: shopData.shop?.email
        }
      };
      
    } catch (err) {
      console.error('Shopify verify error:', err);
      return { connected: false, error: err.message };
    }
  });
  
  // DELETE /auth/shopify/disconnect
  fastify.delete('/auth/shopify/disconnect', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }
    
    try {
      const { pool } = require('../db-compat');
      
      await pool.query(
        'UPDATE integrations SET connected = false, updated_at = NOW() WHERE tenant_id = $1 AND provider = $2',
        [tenant_id, 'shopify']
      );
      
      return { success: true };
      
    } catch (err) {
      console.error('Shopify disconnect error:', err);
      reply.code(500);
      return { success: false, error: err.message };
    }
  });
  
};

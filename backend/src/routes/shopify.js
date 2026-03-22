const crypto = require('crypto');

const { db, refresh, save } = require('../db');
const { logActivity } = require('./activity-logs');

// Shopify API configuration
const SHOPIFY_API_VERSION = '2024-01';

module.exports = async function (fastify, opts) {
  
  // ============================================
  // OAUTH FLOW
  // ============================================
  
  // Step 1: Generate OAuth URL and redirect user
  fastify.get('/auth/shopify', async (request, reply) => {
    const { shop, tenant_id } = request.query;
    
    if (!shop || !tenant_id) {
      reply.code(400);
      return { error: { message: 'shop and tenant_id are required' } };
    }
    
    // Validate shop domain
    if (!shop.endsWith('.myshopify.com') && !shop.endsWith('.shopify.com')) {
      reply.code(400);
      return { error: { message: 'Invalid Shopify shop domain' } };
    }
    
    // Get app credentials from env
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `http://localhost:3000/auth/shopify/callback`;
    
    if (!clientId || !clientSecret) {
      reply.code(500);
      return { error: { message: 'Shopify app not configured' } };
    }
    
    // Generate state for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state with tenant_id for verification
    await refresh();
    const integration = db.data.integrations.find(i => i.tenant_id === tenant_id && i.provider === 'shopify');
    
    if (integration) {
      integration.oauth_state = state;
      integration.shop_domain = shop;
    } else {
      db.data.integrations.push({
        id: `int_${crypto.randomBytes(6).toString('hex')}`,
        tenant_id,
        provider: 'shopify',
        shop_domain: shop,
        oauth_state: state,
        connected: false,
        created_at: new Date().toISOString(),
      });
    }
    await save();
    
    // Build OAuth URL
    const scopes = 'read_orders,read_products';
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;
    
    return { auth_url: authUrl };
  });
  
  // Step 2: OAuth Callback (redirect from Shopify)
  fastify.get('/auth/shopify/callback', async (request, reply) => {
    const { code, state, shop, hmac } = request.query;
    
    if (!code || !state || !shop) {
      reply.code(400);
      return { error: { message: 'Missing OAuth parameters' } };
    }
    
    // Get app credentials
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      reply.code(500);
      return { error: { message: 'Shopify app not configured' } };
    }
    
    // Verify HMAC
    const params = { ...request.query };
    delete params.hmac;
    delete params.signature;
    
    const sortedParams = Object.keys(params)
      .sort((a, b) => a.localeCompare(b))
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const generatedHash = crypto
      .createHmac('sha256', clientSecret)
      .update(sortedParams)
      .digest('hex');
    
    if (generatedHash !== hmac) {
      reply.code(401);
      return { error: { message: 'Invalid HMAC signature' } };
    }
    
    // Find integration with this state
    await refresh();
    const integration = db.data.integrations.find(i => i.oauth_state === state && i.provider === 'shopify');
    
    if (!integration) {
      reply.code(400);
      return { error: { message: 'Invalid state parameter' } };
    }
    
    // Exchange code for access token
    try {
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }
      
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      // Update integration with token
      integration.access_token = accessToken;
      integration.connected = true;
      integration.oauth_state = null;
      integration.connected_at = new Date().toISOString();
      await save();
      
      // Get shop info
      const shopInfo = await getShopInfo(shop, accessToken);
      integration.shop_name = shopInfo?.name || shop;
      
      await save();
      
      // Log activity
      await logActivity(fastify, integration.tenant_id, {
        action: 'integration_connected',
        type: 'integration',
        provider: 'shopify',
        message: `Connected to Shopify: ${integration.shop_name}`,
      });
      
      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return reply.redirect(`${frontendUrl}/integrations?connected=shopify`);
      
    } catch (err) {
      console.error('Shopify OAuth error:', err);
      reply.code(500);
      return { error: { message: 'Failed to complete OAuth', details: err.message } };
    }
  });
  
  // ============================================
  // SYNC ORDERS
  // ============================================
  
  // Sync orders from Shopify
  fastify.post('/sync/shopify', async (request, reply) => {
    const { tenant_id } = request.body;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: { message: 'tenant_id is required' } };
    }
    
    await refresh();
    const integration = db.data.integrations.find(
      i => i.tenant_id === tenant_id && i.provider === 'shopify' && i.connected
    );
    
    if (!integration) {
      reply.code(404);
      return { error: { message: 'Shopify not connected' } };
    }
    
    const shop = integration.shop_domain;
    const token = integration.access_token;
    
    try {
      // Fetch orders from Shopify
      const orders = await getShopifyOrders(shop, token);
      
      let newOrders = 0;
      let updatedOrders = 0;
      
      for (const shopifyOrder of orders) {
        const existingOrder = db.data.orders.find(
          o => o.external_id === `shopify_${shopifyOrder.id}` && o.tenant_id === tenant_id
        );
        
        const orderData = {
          tenant_id,
          integration_id: integration.id,
          external_id: `shopify_${shopifyOrder.id}`,
          source: 'shopify',
          status: mapShopifyStatus(shopifyOrder.financial_status, shopifyOrder.fulfillment_status),
          total: parseFloat(shopifyOrder.total_price || 0),
          currency: shopifyOrder.currency || 'THB',
          customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'N/A',
          customer_phone: shopifyOrder.customer?.phone || '',
          customer_email: shopifyOrder.customer?.email || '',
          items: shopifyOrder.line_items?.map(item => ({
            id: `item_${item.id}`,
            name: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
            sku: item.sku,
          })) || [],
          raw: shopifyOrder,
          created_at: shopifyOrder.created_at,
          updated_at: shopifyOrder.updated_at,
        };
        
        if (existingOrder) {
          existingOrder.status = orderData.status;
          existingOrder.updated_at = new Date().toISOString();
          updatedOrders++;
        } else {
          orderData.id = `ord_${crypto.randomBytes(6).toString('hex')}`;
          orderData.created_at = shopifyOrder.created_at;
          orderData.updated_at = new Date().toISOString();
          db.data.orders.push(orderData);
          newOrders++;
        }
      }
      
      await save();
      
      // Log activity
      await logActivity(fastify, tenant_id, {
        action: 'sync_completed',
        type: 'sync',
        provider: 'shopify',
        message: `Synced ${newOrders} new, ${updatedOrders} updated orders`,
        details: { new: newOrders, updated: updatedOrders },
      });
      
      return {
        success: true,
        synced: { new: newOrders, updated: updatedOrders },
      };
      
    } catch (err) {
      console.error('Shopify sync error:', err);
      
      // Log error
      await logActivity(fastify, tenant_id, {
        action: 'sync_failed',
        type: 'sync_error',
        provider: 'shopify',
        message: `Sync failed: ${err.message}`,
      });
      
      reply.code(500);
      return { error: { message: 'Sync failed', details: err.message } };
    }
  });
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  async function getShopInfo(shop, token) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
        { headers: { 'X-Shopify-Access-Token': token } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.shop;
      }
    } catch (err) {
      console.error('Failed to get shop info:', err);
    }
    return null;
  }
  
  async function getShopifyOrders(shop, token) {
    // Get orders from last 30 days
    const createdAtMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?` +
      `status=any&` +
      `created_at_min=${createdAtMin}&` +
      `fields=id,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,customer,line_items`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  }
  
  function mapShopifyStatus(financialStatus, fulfillmentStatus) {
    // Map Shopify status to our status
    if (fulfillmentStatus === 'fulfilled') return 'shipped';
    if (fulfillmentStatus === 'partial') return 'packed';
    
    switch (financialStatus) {
      case 'paid': return 'paid';
      case 'pending': return 'pending';
      case 'refunded': return 'cancelled';
      case 'voided': return 'cancelled';
      default: return 'pending';
    }
  }
  
}

// Export for use in other routes
module.exports.mapShopifyStatus = function(financialStatus, fulfillmentStatus) {
  if (fulfillmentStatus === 'fulfilled') return 'shipped';
  if (fulfillmentStatus === 'partial') return 'packed';
  
  switch (financialStatus) {
    case 'paid': return 'paid';
    case 'pending': return 'pending';
    case 'refunded': return 'cancelled';
    case 'voided': return 'cancelled';
    default: return 'pending';
  }
};

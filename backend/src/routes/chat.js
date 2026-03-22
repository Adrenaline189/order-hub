const crypto = require('crypto');

const { db, refresh, save } = require('../db');

// ============================================
// UNIFIED CHAT DATABASE
// ============================================

const CHAT_COLLECTION = 'chats';
const MESSAGE_COLLECTION = 'messages';

module.exports = async function (fastify, opts) {
  
  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================
  
  // Get all conversations for a tenant (Unified Inbox)
  fastify.get('/chat/conversations', async (request, reply) => {
    const { tenant_id, provider, status } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id is required' };
    }
    
    await refresh();
    
    let conversations = db.data.conversations || [];
    
    // Filter by tenant
    conversations = conversations.filter(c => c.tenant_id === tenant_id);
    
    // Filter by provider
    if (provider && provider !== 'all') {
      conversations = conversations.filter(c => c.provider === provider);
    }
    
    // Filter by status (unread, archived, etc)
    if (status === 'unread') {
      conversations = conversations.filter(c => c.unread_count > 0);
    }
    
    // Sort by last message
    conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    
    return { conversations };
  });
  
  // Get single conversation with messages
  fastify.get('/chat/conversations/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id, page = 1, limit = 50 } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id is required' };
    }
    
    await refresh();
    
    const conversation = (db.data.conversations || []).find(
      c => c.id === id && c.tenant_id === tenant_id
    );
    
    if (!conversation) {
      reply.code(404);
      return { error: 'Conversation not found' };
    }
    
    // Get messages for this conversation
    const messages = (db.data.messages || [])
      .filter(m => m.conversation_id === id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-limit);
    
    // Mark as read
    conversation.unread_count = 0;
    await save();
    
    return { conversation, messages };
  });
  
  // Send a reply message
  fastify.post('/chat/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id, content, type = 'text' } = request.body;
    
    if (!tenant_id || !content) {
      reply.code(400);
      return { error: 'tenant_id and content are required' };
    }
    
    await refresh();
    
    const conversation = (db.data.conversations || []).find(
      c => c.id === id && c.tenant_id === tenant_id
    );
    
    if (!conversation) {
      reply.code(404);
      return { error: 'Conversation not found' };
    }
    
    const message = {
      id: `msg_${crypto.randomBytes(6).toString('hex')}`,
      conversation_id: id,
      tenant_id,
      provider: conversation.provider,
      direction: 'outbound', // outbound = from us to customer
      content,
      type, // text, image, quick_reply, etc
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    if (!db.data.messages) db.data.messages = [];
    db.data.messages.push(message);
    
    // Update conversation
    conversation.last_message_at = message.created_at;
    conversation.last_message = content.substring(0, 100);
    conversation.updated_at = message.created_at;
    
    await save();
    
    // Send via provider
    try {
      await sendMessage(conversation.provider, conversation.external_id, message);
      message.status = 'sent';
    } catch (err) {
      message.status = 'failed';
      message.error = err.message;
    }
    
    await save();
    
    return { message };
  });
  
  // ============================================
  // PROVIDER WEBHOOKS
  // ============================================
  
  // LINE Webhook
  fastify.post('/webhook/line', async (request, reply) => {
    const events = request.body?.events || [];
    
    for (const event of events) {
      if (event.type === 'message') {
        await handleIncomingMessage('line', {
          external_id: event.source?.userId,
          provider_id: event.source?.userId,
          content: event.message?.text,
          type: event.message?.type,
          timestamp: new Date(event.timestamp).toISOString(),
          raw: event,
        });
      }
    }
    
    reply.code(200).send({ success: true });
  });
  
  // Verify LINE webhook
  fastify.get('/webhook/line', async (request, reply) => {
    const { mode, token, challenge } = request.query;
    
    if (mode === 'confirm') {
      // Save webhook verification
      const webhook = {
        provider: 'line',
        mode: 'active',
        verification_token: token,
        verified_at: new Date().toISOString(),
      };
      
      await refresh();
      const existingIdx = (db.data.webhooks || []).findIndex(w => w.provider === 'line');
      if (existingIdx >= 0) {
        db.data.webhooks[existingIdx] = webhook;
      } else {
        if (!db.data.webhooks) db.data.webhooks = [];
        db.data.webhooks.push(webhook);
      }
      await save();
      
      return reply.send({ challenge });
    }
    
    reply.code(400).send({ error: 'Invalid webhook verification' });
  });
  
  // ============================================
  // PROVIDER OAUTH
  // ============================================
  
  // LINE OAuth - Step 1: Redirect to LINE Login
  fastify.get('/auth/line', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id is required' };
    }
    
    const clientId = process.env.LINE_CHANNEL_ID;
    const redirectUri = process.env.LINE_REDIRECT_URI || `http://localhost:3000/auth/line/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state for verification
    await refresh();
    if (!db.data.oauth_states) db.data.oauth_states = [];
    db.data.oauth_states.push({
      provider: 'line',
      state,
      tenant_id,
      created_at: new Date().toISOString(),
    });
    await save();
    
    const authUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=openid%20profile%20email%20chat%20message.write`;
    
    return { auth_url: authUrl };
  });
  
  // LINE OAuth - Step 2: Callback
  fastify.get('/auth/line/callback', async (request, reply) => {
    const { code, state } = request.query;
    
    if (!code || !state) {
      reply.code(400);
      return { error: 'Missing code or state' };
    }
    
    // Verify state
    await refresh();
    const oauthState = (db.data.oauth_states || []).find(
      s => s.state === state && s.provider === 'line'
    );
    
    if (!oauthState) {
      reply.code(400);
      return { error: 'Invalid state' };
    }
    
    // Exchange code for token
    const clientId = process.env.LINE_CHANNEL_ID;
    const clientSecret = process.env.LINE_CHANNEL_SECRET;
    
    try {
      const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINE_REDIRECT_URI || `http://localhost:3000/auth/line/callback`,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }
      
      // Store integration
      const integration = {
        id: `int_line_${crypto.randomBytes(4).toString('hex')}`,
        tenant_id: oauthState.tenant_id,
        provider: 'line',
        provider_name: 'LINE Official Account',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        connected_at: new Date().toISOString(),
        status: 'active',
      };
      
      await refresh();
      if (!db.data.integrations) db.data.integrations = [];
      
      // Remove old LINE integration if exists
      db.data.integrations = db.data.integrations.filter(
        i => !(i.tenant_id === oauthState.tenant_id && i.provider === 'line')
      );
      db.data.integrations.push(integration);
      
      // Cleanup oauth state
      db.data.oauth_states = (db.data.oauth_states || []).filter(
        s => s.state !== state
      );
      
      await save();
      
      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return reply.redirect(`${frontendUrl}/chat?connected=line`);
      
    } catch (err) {
      console.error('LINE OAuth error:', err);
      reply.code(500);
      return { error: 'Failed to complete OAuth', details: err.message };
    }
  });
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  async function handleIncomingMessage(provider, data) {
    await refresh();
    
    if (!db.data.conversations) db.data.conversations = [];
    if (!db.data.messages) db.data.messages = [];
    
    // Find or create conversation
    let conversation = db.data.conversations.find(
      c => c.provider === provider && c.external_id === data.external_id
    );
    
    if (!conversation) {
      conversation = {
        id: `conv_${crypto.randomBytes(6).toString('hex')}`,
        tenant_id: 'test-shop', // In production, this should be from tenant mapping
        provider,
        external_id: data.external_id,
        customer_name: data.customer_name || `${provider}_${data.external_id.substring(0, 8)}`,
        customer_avatar: null,
        last_message: data.content?.substring(0, 100) || '',
        last_message_at: data.timestamp,
        unread_count: 1,
        status: 'active',
        created_at: data.timestamp,
        updated_at: data.timestamp,
      };
      db.data.conversations.push(conversation);
    } else {
      conversation.last_message = data.content?.substring(0, 100) || '';
      conversation.last_message_at = data.timestamp;
      conversation.updated_at = data.timestamp;
      conversation.unread_count = (conversation.unread_count || 0) + 1;
    }
    
    // Create message
    const message = {
      id: `msg_${crypto.randomBytes(6).toString('hex')}`,
      conversation_id: conversation.id,
      tenant_id: conversation.tenant_id,
      provider,
      direction: 'inbound',
      content: data.content,
      type: data.type || 'text',
      status: 'received',
      raw: data.raw,
      created_at: data.timestamp,
    };
    db.data.messages.push(message);
    
    await save();
    
    // TODO: Trigger auto-reply / AI response here
    
    return { conversation, message };
  }
  
  async function sendMessage(provider, externalId, message) {
    const integration = (db.data.integrations || []).find(
      i => i.provider === provider && i.status === 'active'
    );
    
    if (!integration) {
      throw new Error(`${provider} not connected`);
    }
    
    if (provider === 'line') {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: externalId,
          messages: [{
            type: 'text',
            text: message.content,
          }],
        }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to send LINE message');
      }
      
      return await response.json();
    }
    
    throw new Error(`Provider ${provider} not supported yet`);
  }
  
  // ============================================
  // AUTO-REPLY SETTINGS
  // ============================================
  
  // Get auto-reply rules
  fastify.get('/chat/auto-reply', async (request, reply) => {
    const { tenant_id } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id is required' };
    }
    
    await refresh();
    
    const rules = (db.data.auto_reply_rules || [])
      .filter(r => r.tenant_id === tenant_id);
    
    return { rules };
  });
  
  // Create auto-reply rule
  fastify.post('/chat/auto-reply', async (request, reply) => {
    const { tenant_id, keyword, response, enabled = true } = request.body;
    
    if (!tenant_id || !keyword || !response) {
      reply.code(400);
      return { error: 'tenant_id, keyword, and response are required' };
    }
    
    await refresh();
    
    if (!db.data.auto_reply_rules) db.data.auto_reply_rules = [];
    
    const rule = {
      id: `rule_${crypto.randomBytes(4).toString('hex')}`,
      tenant_id,
      keyword: keyword.toLowerCase(),
      response,
      enabled,
      priority: 0,
      created_at: new Date().toISOString(),
    };
    
    db.data.auto_reply_rules.push(rule);
    await save();
    
    return { rule };
  });
  
  // Delete auto-reply rule
  fastify.delete('/chat/auto-reply/:id', async (request, reply) => {
    const { id } = request.params;
    const { tenant_id } = request.query;
    
    await refresh();
    
    db.data.auto_reply_rules = (db.data.auto_reply_rules || [])
      .filter(r => !(r.id === id && r.tenant_id === tenant_id));
    
    await save();
    
    return { success: true };
  });
  
  // ============================================
  // CHAT ANALYTICS
  // ============================================
  
  fastify.get('/chat/analytics', async (request, reply) => {
    const { tenant_id, period = '7d' } = request.query;
    
    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id is required' };
    }
    
    await refresh();
    
    const messages = (db.data.messages || [])
      .filter(m => m.tenant_id === tenant_id);
    
    // Calculate stats
    const totalMessages = messages.length;
    const inboundMessages = messages.filter(m => m.direction === 'inbound').length;
    const outboundMessages = messages.filter(m => m.direction === 'outbound').length;
    
    // Messages by day (last 7 days)
    const byDay = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      byDay[key] = { date: key, inbound: 0, outbound: 0, total: 0 };
    }
    
    messages.forEach(m => {
      const day = m.created_at.split('T')[0];
      if (byDay[day]) {
        byDay[day].total++;
        if (m.direction === 'inbound') byDay[day].inbound++;
        else byDay[day].outbound++;
      }
    });
    
    // Messages by provider
    const byProvider = {};
    messages.forEach(m => {
      if (!byProvider[m.provider]) {
        byProvider[m.provider] = { provider: m.provider, total: 0 };
      }
      byProvider[m.provider].total++;
    });
    
    return {
      summary: {
        total_messages: totalMessages,
        inbound: inboundMessages,
        outbound: outboundMessages,
      },
      by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      by_provider: Object.values(byProvider),
    };
  });
}

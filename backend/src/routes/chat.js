/**
 * Chat Routes - Unified Inbox
 * Fetches messages from LINE and other connected platforms
 */

module.exports = async function (fastify, opts) {

  // GET /chat/conversations
  // Returns all conversations from all connected platforms
  fastify.get('/chat/conversations', async (request, reply) => {
    const { tenant_id } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: 'tenant_id required' };
    }

    try {
      const { pool } = require('../db-compat');

      // Get connected integrations
      const result = await pool.query(`
        SELECT id, provider, provider_name, shop_name
        FROM integrations 
        WHERE tenant_id = $1 AND connected = true
      `, [tenant_id]);

      const conversations = [];

      // For each connected platform, try to get conversations
      for (const integration of result.rows) {
        if (integration.provider === 'line') {
          // Get LINE conversations from messages table
          const lineMessages = await pool.query(`
            SELECT 
              'line_' || user_id as conversation_id,
              user_id as external_id,
              MAX(content) as last_message,
              MAX(created_at) as last_message_at,
              COUNT(*) as message_count
            FROM line_messages 
            WHERE tenant_id = $1
            GROUP BY user_id
            ORDER BY last_message_at DESC
          `, [tenant_id]);

          for (const row of lineMessages.rows) {
            conversations.push({
              id: row.conversation_id,
              provider: 'line',
              provider_name: 'LINE',
              customer_name: row.external_id,
              customer_id: row.external_id,
              last_message: row.last_message,
              last_message_at: row.last_message_at,
              unread_count: 0,
              status: 'active'
            });
          }
        } else if (integration.provider === 'shopify') {
          // Get Shopify conversations
          const shopifyMessages = await pool.query(`
            SELECT 
              'shopify_' || customer_id as conversation_id,
              customer_id,
              MAX(message) as last_message,
              MAX(created_at) as last_message_at,
              COUNT(*) as message_count
            FROM conversations 
            WHERE tenant_id = $1 AND provider = 'shopify'
            GROUP BY customer_id
            ORDER BY last_message_at DESC
          `, [tenant_id]);

          for (const row of shopifyMessages.rows) {
            conversations.push({
              id: row.conversation_id,
              provider: 'shopify',
              provider_name: integration.shop_name || 'Shopify',
              customer_name: row.customer_id,
              customer_id: row.customer_id,
              last_message: row.last_message,
              last_message_at: row.last_message_at,
              unread_count: 0,
              status: 'active'
            });
          }
        }
        // Add more platforms as needed
      }

      // If no conversations, return mock data for demo
      if (conversations.length === 0) {
        return {
          conversations: [
            {
              id: 'demo_line_1',
              provider: 'line',
              provider_name: 'LINE',
              customer_name: 'ลูกค้าทดสอบ',
              last_message: 'สวัสดีค่ะ สอบถามเรื่องสินค้าค่ะ',
              last_message_at: new Date().toISOString(),
              unread_count: 1,
              status: 'active'
            }
          ],
          demo: true
        };
      }

      return { conversations, demo: false };

    } catch (err) {
      console.error('Chat conversations error:', err);
      reply.code(500);
      return { error: 'Failed to fetch conversations' };
    }
  });

  // GET /chat/messages
  // Returns messages for a specific conversation
  fastify.get('/chat/messages', async (request, reply) => {
    const { tenant_id, conversation_id, provider } = request.query;

    if (!tenant_id || !conversation_id) {
      reply.code(400);
      return { error: 'tenant_id and conversation_id required' };
    }

    try {
      const { pool } = require('../db-compat');
      const messages = [];

      if (provider === 'line' || conversation_id.startsWith('line_')) {
        const userId = conversation_id.replace('line_', '');
        
        const result = await pool.query(`
          SELECT id, user_id as from_user, 'inbound' as direction, 
                 content, created_at, 'text' as type, 'delivered' as status
          FROM line_messages 
          WHERE tenant_id = $1 AND user_id = $2
          ORDER BY created_at ASC
        `, [tenant_id, userId]);

        messages.push(...result.rows.map(row => ({
          id: row.id,
          conversation_id,
          direction: row.direction,
          content: row.content,
          type: row.type,
          status: row.status,
          created_at: row.created_at,
          sender: 'customer'
        })));

        // Also get sent replies
        const replies = await pool.query(`
          SELECT id, 'outbound' as direction, content, sent_at as created_at, 
                 'text' as type, 'sent' as status
          FROM line_messages_sent 
          WHERE tenant_id = $1 AND user_id = $2
          ORDER BY sent_at ASC
        `, [tenant_id, userId]);

        messages.push(...replies.rows.map(row => ({
          id: row.id,
          conversation_id,
          direction: row.direction,
          content: row.content,
          type: row.type,
          status: row.status,
          created_at: row.created_at,
          sender: 'agent'
        })));

      } else if (provider === 'shopify' || conversation_id.startsWith('shopify_')) {
        // Get Shopify conversations
        const result = await pool.query(`
          SELECT id, message, created_at, direction, 'text' as type, 'delivered' as status
          FROM conversations 
          WHERE tenant_id = $1 AND customer_id = $2
          ORDER BY created_at ASC
        `, [tenant_id, conversation_id.replace('shopify_', '')]);

        messages.push(...result.rows);
      }

      // Sort by created_at
      messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      // If no messages, return demo data
      if (messages.length === 0) {
        return {
          messages: [
            {
              id: 'demo_1',
              conversation_id,
              direction: 'inbound',
              content: 'สวัสดีค่ะ อยากสอบถามเรื่องสินค้าค่ะ',
              type: 'text',
              status: 'delivered',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              sender: 'customer'
            },
            {
              id: 'demo_2',
              conversation_id,
              direction: 'outbound',
              content: 'สวัสดีค่ะ ยินดีช่วยเหลือค่ะ สินค้าที่สนใจมีอะไรบ้างคะ?',
              type: 'text',
              status: 'sent',
              created_at: new Date(Date.now() - 3000000).toISOString(),
              sender: 'agent'
            }
          ],
          demo: true
        };
      }

      return { messages, demo: false };

    } catch (err) {
      console.error('Chat messages error:', err);
      reply.code(500);
      return { error: 'Failed to fetch messages' };
    }
  });

  // POST /chat/send
  // Send a message (LINE only for now)
  fastify.post('/chat/send', async (request, reply) => {
    const { tenant_id, conversation_id, provider, content } = request.body || {};

    if (!tenant_id || !conversation_id || !content) {
      reply.code(400);
      return { error: 'tenant_id, conversation_id, and content required' };
    }

    try {
      const { pool } = require('../db-compat');

      if (provider === 'line' || conversation_id.startsWith('line_')) {
        const userId = conversation_id.replace('line_', '');

        // Get LINE credentials
        const lineCreds = await pool.query(`
          SELECT access_token FROM integrations 
          WHERE tenant_id = $1 AND provider = 'line' AND connected = true
        `, [tenant_id]);

        if (lineCreds.rows.length === 0) {
          reply.code(400);
          return { error: 'LINE not connected' };
        }

        const accessToken = lineCreds.rows[0].access_token;

        // Send via LINE API
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: content }]
          })
        });

        if (!lineRes.ok) {
          throw new Error('Failed to send LINE message');
        }

        // Save to sent messages
        await pool.query(`
          INSERT INTO line_messages_sent (tenant_id, user_id, content, sent_at)
          VALUES ($1, $2, $3, NOW())
        `, [tenant_id, userId, content]);

        return { success: true, message_id: `sent_${Date.now()}` };
      }

      reply.code(400);
      return { error: `Sending messages for ${provider} not supported yet` };

    } catch (err) {
      console.error('Chat send error:', err);
      reply.code(500);
      return { error: 'Failed to send message: ' + err.message };
    }
  });

  // Webhook for LINE (receives messages)
  fastify.post('/webhook/line', async (request, reply) => {
    const body = request.body;

    try {
      const { pool } = require('../db-compat');

      // Handle LINE webhook events
      if (body.events && Array.isArray(body.events)) {
        for (const event of body.events) {
          if (event.type === 'message' && event.message.type === 'text') {
            // Store the message
            await pool.query(`
              INSERT INTO line_messages (tenant_id, user_id, content, created_at)
              VALUES ($1, $2, $3, $4)
            `, ['test-shop', event.source.userId, event.message.text, new Date(event.timestamp)]);

            console.log(`📩 LINE message from ${event.source.userId}: ${event.message.text}`);
          }
        }
      }

      reply.code(200);
      return { success: true };

    } catch (err) {
      console.error('LINE webhook error:', err);
      reply.code(500);
      return { error: 'Webhook failed' };
    }
  });

};

const { db, refresh, save } = require('./db');
const { sendTelegramMessage, formatNewOrderAlert, formatPendingOrdersAlert, formatSyncErrorAlert, formatDailySummaryAlert } = require('./telegram');

// In-memory store for scheduled jobs
const scheduledJobs = new Map();

// Sync a single integration
const syncIntegration = async (integration) => {
  const { db } = require('./db');
  
  console.log(`[Sync] Starting sync for ${integration.provider} (${integration.id})`);
  
  try {
    // For MVP, we'll use mock data
    // In production, this would call real APIs
    const mockOrders = generateMockOrders(integration.provider, 3);
    
    await refresh();
    
    let ingested = 0;
    let skipped = 0;
    
    for (const order of mockOrders) {
      const existing = db.data.orders.find(
        o => o.tenant_id === integration.tenant_id && 
             o.source === integration.provider && 
             o.external_id === order.external_id
      );
      
      if (existing) {
        skipped++;
        continue;
      }
      
      db.data.orders.push({
        ...order,
        id: `ord_${Math.random().toString(36).substring(2, 8)}`,
        tenant_id: integration.tenant_id,
        integration_id: integration.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      ingested++;
      
      // Send Telegram alert for new orders
      if (integration.telegram_chat_id) {
        const alert = formatNewOrderAlert(order, integration.provider);
        await sendTelegramMessage(integration.telegram_chat_id, alert);
      }
    }
    
    // Update integration
    const idx = db.data.integrations.findIndex(i => i.id === integration.id);
    if (idx !== -1) {
      db.data.integrations[idx].last_sync_at = new Date().toISOString();
      db.data.integrations[idx].error_message = null;
    }
    
    await save();
    
    console.log(`[Sync] Completed: ${ingested} new, ${skipped} skipped`);
    
    return { success: true, ingested, skipped };
  } catch (err) {
    console.error(`[Sync] Error:`, err);
    
    // Update error
    await refresh();
    const idx = db.data.integrations.findIndex(i => i.id === integration.id);
    if (idx !== -1) {
      db.data.integrations[idx].error_message = err.message;
    }
    await save();
    
    // Send error alert
    if (integration.telegram_chat_id) {
      const alert = formatSyncErrorAlert(integration.provider, err.message);
      await sendTelegramMessage(integration.telegram_chat_id, alert);
    }
    
    return { success: false, error: err.message };
  }
};

// Generate mock orders
const generateMockOrders = (provider, count = 3) => {
  const statuses = ['pending', 'paid', 'packed', 'shipped', 'completed'];
  const prefixes = { shopee: 'SH', lazada: 'LZ', tiktok: 'TT', shopify: 'SF' };
  const prefix = prefixes[provider] || 'ORD';
  
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push({
      external_id: `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      source: provider,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      total: Math.floor(Math.random() * 5000) + 100,
      currency: 'THB',
      customer_name: `Customer ${Math.floor(Math.random() * 100)}`,
      customer_phone: `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      items: [],
    });
  }
  
  return orders;
};

// Start background sync for all integrations
const startBackgroundSync = (intervalMinutes = 5) => {
  const jobKey = 'background-sync';
  
  if (scheduledJobs.has(jobKey)) {
    console.log('[Scheduler] Background sync already running');
    return;
  }
  
  console.log(`[Scheduler] Starting background sync (every ${intervalMinutes} minutes)`);
  
  const job = setInterval(async () => {
    await refresh();
    
    const integrations = db.data.integrations.filter(
      i => i.status === 'connected'
    );
    
    console.log(`[Scheduler] Syncing ${integrations.length} integrations`);
    
    for (const integration of integrations) {
      await syncIntegration(integration);
    }
  }, intervalMinutes * 60 * 1000);
  
  scheduledJobs.set(jobKey, job);
};

// Stop background sync
const stopBackgroundSync = () => {
  const job = scheduledJobs.get('background-sync');
  if (job) {
    clearInterval(job);
    scheduledJobs.delete('background-sync');
    console.log('[Scheduler] Background sync stopped');
  }
};

// Check pending orders and send alert
const checkPendingOrders = async (tenantId, telegramChatId, threshold = 10) => {
  await refresh();
  
  const pendingOrders = db.data.orders.filter(
    o => o.tenant_id === tenantId && 
         (o.status === 'paid' || o.status === 'packed')
  );
  
  if (pendingOrders.length >= threshold) {
    const total = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const alert = formatPendingOrdersAlert(pendingOrders.length, total);
    await sendTelegramMessage(telegramChatId, alert);
    return { alerted: true, count: pendingOrders.length };
  }
  
  return { alerted: false, count: pendingOrders.length };
};

// Send daily summary
const sendDailySummary = async (tenantId, telegramChatId) => {
  await refresh();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = db.data.orders.filter(
    o => o.tenant_id === tenantId && new Date(o.created_at) >= today
  );
  
  const summary = {
    total_orders: todayOrders.length,
    total_revenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    by_status: {},
  };
  
  todayOrders.forEach(o => {
    summary.by_status[o.status] = (summary.by_status[o.status] || 0) + 1;
  });
  
  const alert = formatDailySummaryAlert(summary);
  await sendTelegramMessage(telegramChatId, alert);
  
  return summary;
};

module.exports = {
  syncIntegration,
  startBackgroundSync,
  stopBackgroundSync,
  checkPendingOrders,
  sendDailySummary,
  generateMockOrders,
};

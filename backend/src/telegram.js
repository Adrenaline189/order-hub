// Telegram Bot Service
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Send message via Telegram
const sendTelegramMessage = async (chatId, text, parseMode = 'HTML') => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] Bot token not configured, skipping message');
    return { success: false, reason: 'no_token' };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram] Failed to send:', data.description);
      return { success: false, reason: data.description };
    }

    return { success: true };
  } catch (err) {
    console.error('[Telegram] Error:', err);
    return { success: false, reason: err.message };
  }
};

// Alert templates
const formatNewOrderAlert = (order, source) => {
  return `
🛒 <b>ออเดอร์ใหม่!</b>

<b>หมายเลข:</b> ${order.external_id}
<b>ช่องทาง:</b> ${source}
<b>ลูกค้า:</b> ${order.customer_name || '-'}
<b>ยอด:</b> ฿${(order.total || 0).toLocaleString()}
<b>สถานะ:</b> ${order.status}

<i>${new Date().toLocaleString('th-TH')}</i>
`.trim();
};

const formatPendingOrdersAlert = (count, total) => {
  return `
⏰ <b>ออเดอร์ค้างส่ง!</b>

<b>จำนวน:</b> ${count} รายการ
<b>มูลค่ารวม:</b> ฿${total.toLocaleString()}

กรุณาตรวจสอบและจัดส่งโดยเร็ว
<i>${new Date().toLocaleString('th-TH')}</i>
`.trim();
};

const formatSyncErrorAlert = (provider, error) => {
  return `
❌ <b>Sync Error!</b>

<b>ช่องทาง:</b> ${provider}
<b>ข้อผิดพลาด:</b> ${error}

กรุณาตรวจสอบการเชื่อมต่อ
<i>${new Date().toLocaleString('th-TH')}</i>
`.trim();
};

const formatDailySummaryAlert = (summary) => {
  return `
📊 <b>สรุปยอดขายประจำวัน</b>

<b>ออเดอร์:</b> ${summary.total_orders} รายการ
<b>ยอดขาย:</b> ฿${summary.total_revenue.toLocaleString()}

<b>ตามสถานะ:</b>
• รอชำระ: ${summary.by_status?.pending || 0}
• ชำระแล้ว: ${summary.by_status?.paid || 0}
• ส่งแล้ว: ${summary.by_status?.shipped || 0}
• สำเร็จ: ${summary.by_status?.completed || 0}

<i>${new Date().toLocaleString('th-TH')}</i>
`.trim();
};

module.exports = {
  sendTelegramMessage,
  formatNewOrderAlert,
  formatPendingOrdersAlert,
  formatSyncErrorAlert,
  formatDailySummaryAlert,
};

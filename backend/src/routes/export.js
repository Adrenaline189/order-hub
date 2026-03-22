const { db, refresh } = require('../db');
const { verifyToken } = require('../auth');

module.exports = async function (fastify, opts) {
  // Export orders as CSV
  fastify.get('/export/csv', async (request, reply) => {
    const { tenant_id, from, to, status, source } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let orders = db.data.orders.filter(o => o.tenant_id === tenant_id);

    if (from) {
      orders = orders.filter(o => new Date(o.created_at) >= new Date(from));
    }
    if (to) {
      orders = orders.filter(o => new Date(o.created_at) <= new Date(to));
    }
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (source) {
      orders = orders.filter(o => o.source === source);
    }

    // Generate CSV
    const headers = ['order_id', 'external_id', 'source', 'status', 'total', 'currency', 'customer_name', 'customer_phone', 'created_at'];
    const rows = orders.map(o => [
      o.id,
      o.external_id,
      o.source,
      o.status,
      o.total,
      o.currency || 'THB',
      o.customer_name || '',
      o.customer_phone || '',
      o.created_at,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    ].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.csv"`);
    return csv;
  });

  // Export summary as JSON
  fastify.get('/export/summary', async (request, reply) => {
    const { tenant_id, period = 'month' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const now = new Date();
    let fromDate;
    switch (period) {
      case 'today':
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(0);
    }

    const orders = db.data.orders.filter(
      o => o.tenant_id === tenant_id && new Date(o.created_at) >= fromDate
    );

    // Calculate summary
    const summary = {
      period,
      from_date: fromDate.toISOString(),
      to_date: now.toISOString(),
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      by_status: {},
      by_source: {},
      by_day: {},
      top_customers: [],
    };

    // By status
    orders.forEach(o => {
      summary.by_status[o.status] = (summary.by_status[o.status] || 0) + 1;
    });

    // By source
    orders.forEach(o => {
      if (!summary.by_source[o.source]) {
        summary.by_source[o.source] = { count: 0, revenue: 0 };
      }
      summary.by_source[o.source].count++;
      summary.by_source[o.source].revenue += o.total || 0;
    });

    // By day
    orders.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (!summary.by_day[day]) {
        summary.by_day[day] = { count: 0, revenue: 0 };
      }
      summary.by_day[day].count++;
      summary.by_day[day].revenue += o.total || 0;
    });

    // Top customers
    const customerTotals = {};
    orders.forEach(o => {
      if (o.customer_name) {
        customerTotals[o.customer_name] = (customerTotals[o.customer_name] || 0) + (o.total || 0);
      }
    });
    summary.top_customers = Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, total]) => ({ name, total }));

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="summary_${period}_${new Date().toISOString().split('T')[0]}.json"`);
    return summary;
  });

  // Generate PDF report (simple HTML that can be printed as PDF)
  fastify.get('/export/report', async (request, reply) => {
    const { tenant_id, period = 'month' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const tenant = db.data.tenants.find(t => t.id === tenant_id);
    const now = new Date();
    let fromDate;
    switch (period) {
      case 'today':
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const orders = db.data.orders.filter(
      o => o.tenant_id === tenant_id && new Date(o.created_at) >= fromDate
    );

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const byStatus = {};
    orders.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Hub Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #2563eb; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; margin-right: 40px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .stat-label { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f9fafb; }
    .footer { margin-top: 40px; color: #6b7280; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>📊 Order Hub Report</h1>
  <p><strong>${tenant?.name || 'Shop'}</strong></p>
  <p>Period: ${fromDate.toLocaleDateString('th-TH')} - ${now.toLocaleDateString('th-TH')}</p>
  
  <div class="summary">
    <div class="stat">
      <div class="stat-value">${orders.length}</div>
      <div class="stat-label">Orders</div>
    </div>
    <div class="stat">
      <div class="stat-value">฿${totalRevenue.toLocaleString()}</div>
      <div class="stat-label">Revenue</div>
    </div>
    <div class="stat">
      <div class="stat-value">฿${orders.length ? Math.round(totalRevenue / orders.length) : 0}</div>
      <div class="stat-label">Avg Order</div>
    </div>
  </div>

  <h2>By Status</h2>
  <table>
    <tr><th>Status</th><th>Count</th></tr>
    ${Object.entries(byStatus).map(([status, count]) => 
      `<tr><td>${status}</td><td>${count}</td></tr>`
    ).join('')}
  </table>

  <h2>Recent Orders</h2>
  <table>
    <tr><th>ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
    ${orders.slice(0, 20).map(o => 
      `<tr>
        <td>${o.external_id}</td>
        <td>${o.customer_name || '-'}</td>
        <td>${o.status}</td>
        <td>฿${(o.total || 0).toLocaleString()}</td>
        <td>${new Date(o.created_at).toLocaleDateString('th-TH')}</td>
      </tr>`
    ).join('')}
  </table>

  <div class="footer">
    <p>Generated by Order Hub on ${now.toLocaleString('th-TH')}</p>
  </div>
</body>
</html>
    `.trim();

    reply.header('Content-Type', 'text/html');
    return html;
  });
};

const { db, refresh } = require('../db');
const XLSX = require('xlsx');

module.exports = async function (fastify, opts) {
  // Export orders to Excel
  fastify.get('/export/excel', async (request, reply) => {
    const { tenant_id, from, to, status, source } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    let orders = db.data.orders.filter(o => o.tenant_id === tenant_id);

    // Apply filters
    if (from) {
      orders = orders.filter(o => new Date(o.created_at) >= new Date(from));
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      orders = orders.filter(o => new Date(o.created_at) <= toDate);
    }
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (source) {
      orders = orders.filter(o => o.source === source);
    }

    // Sort by date
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Prepare data for Excel
    const data = orders.map(o => ({
      'Order ID': o.external_id || '',
      'Source': o.source || '',
      'Status': o.status || '',
      'Total (THB)': o.total || 0,
      'Customer Name': o.customer_name || '',
      'Customer Phone': o.customer_phone || '',
      'Customer Email': o.customer_email || '',
      'Shipping Address': o.shipping_address || '',
      'Created At': new Date(o.created_at).toLocaleString('th-TH'),
      'Updated At': o.updated_at ? new Date(o.updated_at).toLocaleString('th-TH') : '',
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Order ID
      { wch: 12 }, // Source
      { wch: 10 }, // Status
      { wch: 12 }, // Total
      { wch: 20 }, // Customer Name
      { wch: 15 }, // Customer Phone
      { wch: 25 }, // Customer Email
      { wch: 40 }, // Shipping Address
      { wch: 20 }, // Created At
      { wch: 20 }, // Updated At
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.xlsx"`);

    return buf;
  });

  // Export summary report to Excel
  fastify.get('/export/report/excel', async (request, reply) => {
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

    // Calculate summary
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const byStatus = {};
    const bySource = {};

    orders.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (!bySource[o.source]) {
        bySource[o.source] = { count: 0, revenue: 0 };
      }
      bySource[o.source].count++;
      bySource[o.source].revenue += o.total || 0;
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      { 'Metric': 'Report Period', 'Value': period },
      { 'Metric': 'From Date', 'Value': fromDate.toLocaleDateString('th-TH') },
      { 'Metric': 'To Date', 'Value': now.toLocaleDateString('th-TH') },
      { 'Metric': 'Total Orders', 'Value': orders.length },
      { 'Metric': 'Total Revenue', 'Value': `฿${totalRevenue.toLocaleString()}` },
      { 'Metric': 'Average Order Value', 'Value': `฿${orders.length ? Math.round(totalRevenue / orders.length).toLocaleString() : 0}` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: By Status
    const statusData = Object.entries(byStatus).map(([status, count]) => ({
      'Status': status,
      'Count': count,
      'Percentage': `${((count / orders.length) * 100).toFixed(1)}%`,
    }));
    const wsStatus = XLSX.utils.json_to_sheet(statusData);
    XLSX.utils.book_append_sheet(wb, wsStatus, 'By Status');

    // Sheet 3: By Source
    const sourceData = Object.entries(bySource).map(([source, data]) => ({
      'Source': source,
      'Orders': data.count,
      'Revenue': data.revenue,
      'Percentage': `${((data.count / orders.length) * 100).toFixed(1)}%`,
    }));
    const wsSource = XLSX.utils.json_to_sheet(sourceData);
    XLSX.utils.book_append_sheet(wb, wsSource, 'By Source');

    // Sheet 4: All Orders
    const ordersData = orders.map(o => ({
      'Order ID': o.external_id,
      'Source': o.source,
      'Status': o.status,
      'Total': o.total,
      'Customer': o.customer_name || '',
      'Phone': o.customer_phone || '',
      'Date': new Date(o.created_at).toLocaleDateString('th-TH'),
    }));
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="report_${period}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    return buf;
  });
};

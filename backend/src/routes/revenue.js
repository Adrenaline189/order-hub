const { db, refresh } = require('../db');

// Mock product catalog per source
const MOCK_PRODUCTS = {
  shopee: [
    { name: 'เสื้อยืด Trend 2026', category: 'เสื้อผ้า' },
    { name: 'กระเป๋าถือมินิ', category: 'กระเป๋า' },
    { name: 'รองเท้าผ้าใบ High Cut', category: 'รองเท้า' },
    { name: 'ครีมบำรุงผิว SPF50', category: 'เครื่องสำอาง' },
    { name: 'หมวกปีกกว้าง', category: 'แอคเซสซอรี่' },
  ],
  lazada: [
    { name: 'Smart Watch รุ่นใหม่', category: 'อิเล็กทรอนิกส์' },
    { name: 'หูฟัง Bluetooth', category: 'อิเล็กทรอนิกส์' },
    { name: 'Power Bank 20000mAh', category: 'อุปกรณ์เสริม' },
    { name: 'เคสโทรศัพท์ iPhone', category: 'อุปกรณ์เสริม' },
    { name: 'สายชาร์จ Type-C', category: 'อุปกรณ์เสริม' },
  ],
  tiktok: [
    { name: 'LED Ring Light', category: 'อุปกรณ์ถ่ายบิว' },
    { name: 'TikTok ชุดแต่งตัว', category: 'เสื้อผ้า' },
    { name: 'โทรศัพท์มือสอง iPhone 13', category: 'มือถือ' },
    { name: 'Air Fryer รุ่นเล็ก', category: 'เครื่องใช้ในบ้าน' },
    { name: 'ของใช้จิ๋ว', category: 'ของเล็กน้อย' },
  ],
  shopify: [
    { name: 'Custom T-Shirt', category: 'Apparel' },
    { name: 'Mug สกรีน', category: 'Promo' },
    { name: 'Sticker Pack', category: 'Promo' },
    { name: 'Hoodie Premium', category: 'เสื้อผ้า' },
    { name: 'Cap ลิมิเต็ด', category: 'แอคเซสซอรี่' },
  ],
};

// Generate mock top products per source based on order data
function generateTopProducts(source, sourceOrders) {
  const products = MOCK_PRODUCTS[source] || MOCK_PRODUCTS.shopee;
  const totalRevenue = sourceOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Distribute revenue across products proportionally
  return products.slice(0, 5).map((p, i) => {
    const share = [0.35, 0.25, 0.18, 0.13, 0.09][i] || 0.05;
    const revenue = Math.round(totalRevenue * share);
    const orders = Math.round((sourceOrders.length || 10) * share);
    return {
      name: p.name,
      category: p.category,
      revenue,
      orders,
      share: Math.round(share * 100),
    };
  });
}

module.exports = async function (fastify, opts) {
  // Get revenue analytics
  fastify.get('/revenue', async (request, reply) => {
    const { tenant_id, period = 'month', source, from_date, to_date } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    // Calculate date range
    const now = new Date();
    let fromDate;
    let toDate = now;
    let groupBy;
    
    // Custom date range takes precedence
    if (from_date && to_date) {
      fromDate = new Date(from_date);
      toDate = new Date(to_date);
      // Determine groupBy based on date range
      const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) groupBy = 'hour';
      else if (diffDays <= 31) groupBy = 'day';
      else if (diffDays <= 365) groupBy = 'week';
      else groupBy = 'month';
    } else {
      switch (period) {
        case 'today':
          fromDate = new Date(now.getTime());
          fromDate.setHours(0, 0, 0, 0);
          groupBy = 'hour';
          break;
        case 'yesterday':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
          groupBy = 'hour';
          break;
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'quarter':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = 'week';
          break;
        case 'year':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = 'month';
          break;
        case 'last_month': {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          fromDate = lastMonth;
          toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          groupBy = 'day';
          break;
        }
        default:
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
      }
    }

    // Filter orders by date range
    let orders = db.data.orders.filter(
      o => o.tenant_id === tenant_id && 
           new Date(o.created_at) >= fromDate && 
           new Date(o.created_at) <= toDate
    );

    // Filter by source if provided
    if (source && source !== 'all') {
      orders = orders.filter(o => o.source === source);
    }

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by source
    const bySource = {};
    db.data.orders
      .filter(o => o.tenant_id === tenant_id && 
                   new Date(o.created_at) >= fromDate && 
                   new Date(o.created_at) <= toDate)
      .forEach(o => {
        if (!bySource[o.source]) {
          bySource[o.source] = { revenue: 0, orders: 0 };
        }
        bySource[o.source].revenue += o.total || 0;
        bySource[o.source].orders++;
      });

    // Group by source AND status
    const bySourceStatus = {};
    const allOrdersForPeriod = db.data.orders
      .filter(o => o.tenant_id === tenant_id && 
                   new Date(o.created_at) >= fromDate && 
                   new Date(o.created_at) <= toDate);
    
    allOrdersForPeriod.forEach(o => {
      const src = o.source || 'unknown';
      const status = o.status || 'unknown';
      if (!bySourceStatus[src]) {
        bySourceStatus[src] = {};
      }
      if (!bySourceStatus[src][status]) {
        bySourceStatus[src][status] = { orders: 0, revenue: 0 };
      }
      bySourceStatus[src][status].orders++;
      bySourceStatus[src][status].revenue += o.total || 0;
    });

    // Group by time period
    const byTime = {};
    orders.forEach(o => {
      let key;
      const date = new Date(o.created_at);
      
      switch (groupBy) {
        case 'hour':
          key = `${date.toISOString().split('T')[0]} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week': {
          // Get week start (Sunday)
          const day = date.getDay();
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - day);
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!byTime[key]) {
        byTime[key] = { revenue: 0, orders: 0 };
      }
      byTime[key].revenue += o.total || 0;
      byTime[key].orders++;
    });

    // Convert to arrays for charts
    const timeData = Object.entries(byTime)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const sourceData = Object.entries(bySource)
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Available sources
    const availableSources = [...new Set(
      db.data.orders
        .filter(o => o.tenant_id === tenant_id)
        .map(o => o.source)
    )];

    // Top products per source (mock data based on real product patterns)
    const topProductsBySource = {};
    availableSources.forEach(src => {
      topProductsBySource[src] = generateTopProducts(src, orders.filter(o => o.source === src));
    });

    // Overall top products (aggregate from all orders, or use mock)
    let topProducts = [];
    if (orders.length > 0) {
      // Calculate from actual orders if items exist
      const productRevenue = {};
      orders.forEach(o => {
        if (o.items && o.items.length > 0) {
          o.items.forEach(item => {
            const key = item.name || item.id || 'Unknown';
            if (!productRevenue[key]) {
              productRevenue[key] = { name: key, revenue: 0, orders: 0 };
            }
            productRevenue[key].revenue += (item.price || 0) * (item.quantity || 1);
            productRevenue[key].orders += item.quantity || 1;
          });
        }
      });
      topProducts = Object.values(productRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
    
    // Fallback to mock data if no real product data
    if (topProducts.length === 0) {
      topProducts = [
        { name: 'เสื้อยืด Oversize', revenue: 15000, orders: 25 },
        { name: 'กระเป๋าผ้า Canvas', revenue: 12000, orders: 18 },
        { name: 'รองเท้าสลิปเปอร์', revenue: 8500, orders: 12 },
        { name: 'หมวกแก๊ป Brodo', revenue: 6200, orders: 8 },
        { name: 'ถุงเท้าพื้นยาง', revenue: 4800, orders: 6 },
      ];
    }

    // Top customers
    const customerTotals = {};
    orders.forEach(o => {
      if (o.customer_name) {
        if (!customerTotals[o.customer_name]) {
          customerTotals[o.customer_name] = { revenue: 0, orders: 0 };
        }
        customerTotals[o.customer_name].revenue += o.total || 0;
        customerTotals[o.customer_name].orders++;
      }
    });

    const topCustomers = Object.entries(customerTotals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Peak Hours/Days Analysis
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // By day of week
    const byDayOfWeek = {};
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const dayIdx = d.getDay();
      const dayKey = dayNames[dayIdx];
      if (!byDayOfWeek[dayKey]) {
        byDayOfWeek[dayKey] = { day: dayKey, day_idx: dayIdx, orders: 0, revenue: 0 };
      }
      byDayOfWeek[dayKey].orders++;
      byDayOfWeek[dayKey].revenue += o.total || 0;
    });
    
    // Sort by day index
    const byDayOfWeekSorted = Object.values(byDayOfWeek)
      .sort((a, b) => a.day_idx - b.day_idx);
    
    // Find peak day
    const peakDay = byDayOfWeekSorted.length > 0 
      ? byDayOfWeekSorted.reduce((max, d) => d.revenue > max.revenue ? d : max)
      : null;
    
    // By hour
    const byHour = {};
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const hour = d.getHours();
      if (!byHour[hour]) {
        byHour[hour] = { hour, orders: 0, revenue: 0 };
      }
      byHour[hour].orders++;
      byHour[hour].revenue += o.total || 0;
    });
    
    // Sort by hour
    const byHourSorted = Object.values(byHour).sort((a, b) => a.hour - b.hour);
    
    // Find peak hour
    const peakHour = byHourSorted.length > 0
      ? byHourSorted.reduce((max, h) => h.revenue > max.revenue ? h : max)
      : null;
    
    // Format peak hour with label
    const peakHourLabel = peakHour 
      ? `${String(peakHour.hour).padStart(2, '0')}:00 - ${String(peakHour.hour + 1).padStart(2, '0')}:00`
      : null;
    
    // By source per day (heatmap data)
    const bySourceDay = {};
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const dayKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const src = o.source || 'unknown';
      
      if (!bySourceDay[dayKey]) {
        bySourceDay[dayKey] = { date: dayKey };
      }
      if (!bySourceDay[dayKey][src]) {
        bySourceDay[dayKey][src] = 0;
      }
      bySourceDay[dayKey][src]++;
    });
    
    const heatmapData = Object.values(bySourceDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days for compact view

    return {
      period: from_date && to_date ? 'custom' : period,
      date_range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      source: source || 'all',
      
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        avg_order_value: Math.round(avgOrderValue),
      },
      
      by_source: sourceData,
      by_time: timeData,
      available_sources: availableSources,
      
      by_source_status: bySourceStatus,
      
      top_products: topProducts,
      top_products_by_source: topProductsBySource,
      top_customers: topCustomers,
      
      peak_analysis: {
        by_day_of_week: byDayOfWeekSorted,
        by_hour: byHourSorted,
        peak_day: peakDay,
        peak_hour: peakHour ? { ...peakHour, label: peakHourLabel } : null,
        heatmap: heatmapData,
      },
    };
  });

  // Get comparison data (current vs previous period)
  fastify.get('/revenue/compare', async (request, reply) => {
    const { tenant_id, period = 'month' } = request.query;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    await refresh();

    const now = new Date();
    let currentFrom, previousFrom, previousTo;
    
    switch (period) {
      case 'today':
        currentFrom = new Date(now.setHours(0, 0, 0, 0));
        previousFrom = new Date(currentFrom.getTime() - 24 * 60 * 60 * 1000);
        previousTo = currentFrom;
        break;
      case 'week':
        currentFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousFrom = new Date(currentFrom.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousTo = currentFrom;
        break;
      case 'month':
      default:
        currentFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousFrom = new Date(currentFrom.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousTo = currentFrom;
        break;
    }

    const currentOrders = db.data.orders.filter(
      o => o.tenant_id === tenant_id && 
           new Date(o.created_at) >= currentFrom && 
           new Date(o.created_at) < now
    );

    const previousOrders = db.data.orders.filter(
      o => o.tenant_id === tenant_id && 
           new Date(o.created_at) >= previousFrom && 
           new Date(o.created_at) < previousTo
    );

    const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : 0;

    const ordersChange = previousOrders.length > 0
      ? ((currentOrders.length - previousOrders.length) / previousOrders.length * 100).toFixed(1)
      : 0;

    const currentAvg = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
    const previousAvg = previousOrders.length > 0 ? previousRevenue / previousOrders.length : 0;
    const avgChange = previousAvg > 0
      ? ((currentAvg - previousAvg) / previousAvg * 100).toFixed(1)
      : 0;

    return {
      current: {
        revenue: currentRevenue,
        orders: currentOrders.length,
        avg_order_value: Math.round(currentAvg),
      },
      previous: {
        revenue: previousRevenue,
        orders: previousOrders.length,
        avg_order_value: Math.round(previousAvg),
      },
      change: {
        revenue: parseFloat(String(revenueChange)),
        orders: parseFloat(String(ordersChange)),
        avg_order_value: parseFloat(String(avgChange)),
      },
    };
  });
};

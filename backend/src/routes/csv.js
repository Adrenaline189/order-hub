const { orders, integrations, save, refresh, generateId } = require('../db');
const fs = require('fs');
const path = require('path');

// Upload directory
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CSV Parser (simple)
const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
};

// Column mapping suggestions
const SUGGESTED_COLUMNS = {
  order_id: ['order_id', 'order number', '订单号', 'หมายเลขออเดอร์'],
  status: ['status', 'order_status', 'สถานะ', '状态'],
  total: ['total', 'total_amount', 'ยอดรวม', '总额'],
  customer_name: ['customer_name', 'buyer_name', 'ชื่อลูกค้า', '买家姓名'],
  customer_phone: ['customer_phone', 'phone', 'เบอร์โทร', '电话'],
  customer_email: ['customer_email', 'email', 'อีเมล'],
};

const guessColumn = (headers, field) => {
  const suggestions = SUGGESTED_COLUMNS[field] || [];
  for (const s of suggestions) {
    const found = headers.find(h => h.toLowerCase() === s.toLowerCase());
    if (found) return found;
  }
  return null;
};

module.exports = async function (fastify, opts) {
  // CSV Template download
  fastify.get('/csv/template', async (request, reply) => {
    const template = `order_id,status,total,customer_name,customer_phone,customer_email
SH001,paid,1500,สมชาย ใจดี,0812345678,test@example.com
SH002,pending,2000,สมหญิง รักสวย,0898765432,test2@example.com`;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="orders_template.csv"');
    return template;
  });

  // CSV Preview (before import)
  fastify.post('/csv/preview', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      reply.code(400);
      return { error: { code: 'NO_FILE', message: 'No file uploaded' } };
    }

    const buffer = await data.toBuffer();
    const content = buffer.toString('utf-8');
    const { headers, rows } = parseCSV(content);

    if (rows.length === 0) {
      reply.code(400);
      return { error: { code: 'EMPTY_FILE', message: 'CSV file is empty or invalid' } };
    }

    // Suggest column mappings
    const mapping = {};
    for (const field of Object.keys(SUGGESTED_COLUMNS)) {
      const found = guessColumn(headers, field);
      if (found) mapping[field] = found;
    }

    return {
      headers,
      sample_rows: rows.slice(0, 5),
      total_rows: rows.length,
      suggested_mapping: mapping,
    };
  });

  // CSV Import
  fastify.post('/csv/import', async (request, reply) => {
    const { tenant_id, column_mapping, source = 'csv' } = request.body;

    if (!tenant_id) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' } };
    }

    // Get uploaded file
    const data = await request.file();
    if (!data) {
      reply.code(400);
      return { error: { code: 'NO_FILE', message: 'No file uploaded' } };
    }

    const buffer = await data.toBuffer();
    const content = buffer.toString('utf-8');
    const { headers, rows } = parseCSV(content);

    // Use provided mapping or suggested mapping
    const mapping = column_mapping || {};
    for (const field of Object.keys(SUGGESTED_COLUMNS)) {
      if (!mapping[field]) {
        const found = guessColumn(headers, field);
        if (found) mapping[field] = found;
      }
    }

    // Check required fields
    if (!mapping.order_id) {
      reply.code(400);
      return { error: { code: 'MISSING_ORDER_ID', message: 'order_id column mapping is required' } };
    }

    await refresh();

    // Get or create CSV integration
    let integration = integrations.findByProvider(tenant_id, 'csv');
    if (!integration) {
      integration = integrations.create({
        tenant_id,
        provider: 'csv',
        shop_name: 'CSV Import',
        status: 'connected',
      });
    }

    let ingested = 0;
    let duplicatesSkipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const externalId = row[mapping.order_id];
        if (!externalId) continue;

        // Check for duplicate
        const existing = orders.findByExternalId(tenant_id, source, externalId);
        if (existing) {
          duplicatesSkipped++;
          continue;
        }

        const total = parseFloat(row[mapping.total]) || 0;
        const status = (row[mapping.status] || 'pending').toLowerCase();

        orders.create({
          tenant_id,
          integration_id: integration.id,
          external_id: externalId,
          source,
          status: ['pending', 'paid', 'packed', 'shipped', 'completed', 'cancelled'].includes(status) 
            ? status : 'pending',
          total,
          currency: 'THB',
          customer_name: row[mapping.customer_name] || '',
          customer_phone: row[mapping.customer_phone] || '',
          customer_email: row[mapping.customer_email] || '',
          items: [],
          raw: row,
        });

        ingested++;
      } catch (err) {
        errors.push({ row: row[mapping.order_id] || 'unknown', error: err.message });
      }
    }

    await save();

    return {
      ingested,
      duplicates_skipped: duplicatesSkipped,
      errors,
      integration_id: integration.id,
    };
  });
};

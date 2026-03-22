const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default data structure
const defaultData = {
  tenants: [],
  users: [],
  integrations: [],
  orders: [],
  syncLogs: []
};

// Initialize database
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// Initialize on first load
const initDb = async () => {
  await db.read();
  
  // Initialize default data if empty
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
};

// Refresh data from file (call before queries)
const refresh = async () => {
  await db.read();
};

// Helper functions
const generateId = (prefix) => {
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${random}`;
};

module.exports = {
  db,
  initDb,
  refresh,
  generateId,
  // Collection helpers
  tenants: {
    all: () => db.data.tenants,
    find: (id) => db.data.tenants.find(t => t.id === id),
    create: (data) => {
      const tenant = { ...data, id: data.id || generateId('tenant'), created_at: new Date().toISOString() };
      db.data.tenants.push(tenant);
      return tenant;
    }
  },
  users: {
    all: () => db.data.users,
    findByTenant: (tenantId) => db.data.users.filter(u => u.tenant_id === tenantId),
    create: (data) => {
      const user = { ...data, id: data.id || generateId('user'), created_at: new Date().toISOString() };
      db.data.users.push(user);
      return user;
    }
  },
  integrations: {
    all: (tenantId) => db.data.integrations.filter(i => i.tenant_id === tenantId),
    find: (id) => db.data.integrations.find(i => i.id === id),
    findByProvider: (tenantId, provider) => db.data.integrations.find(i => i.tenant_id === tenantId && i.provider === provider && i.status === 'connected'),
    create: (data) => {
      const integration = {
        ...data,
        id: data.id || generateId('int'),
        status: data.status || 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.data.integrations.push(integration);
      return integration;
    },
    update: (id, updates) => {
      const idx = db.data.integrations.findIndex(i => i.id === id);
      if (idx !== -1) {
        db.data.integrations[idx] = { ...db.data.integrations[idx], ...updates, updated_at: new Date().toISOString() };
        return db.data.integrations[idx];
      }
      return null;
    }
  },
  orders: {
    all: (tenantId, filters = {}) => {
      let orders = db.data.orders.filter(o => o.tenant_id === tenantId);
      
      if (filters.status) {
        orders = orders.filter(o => o.status === filters.status);
      }
      if (filters.source) {
        orders = orders.filter(o => o.source === filters.source);
      }
      if (filters.from) {
        orders = orders.filter(o => o.created_at >= filters.from);
      }
      if (filters.to) {
        orders = orders.filter(o => o.created_at <= filters.to);
      }
      
      return orders;
    },
    find: (id) => db.data.orders.find(o => o.id === id),
    findByExternalId: (tenantId, source, externalId) => 
      db.data.orders.find(o => o.tenant_id === tenantId && o.source === source && o.external_id === externalId),
    create: (data) => {
      const order = {
        ...data,
        id: data.id || generateId('ord'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.data.orders.push(order);
      return order;
    },
    count: (tenantId, filters = {}) => {
      const orders = db.data.orders.filter(o => o.tenant_id === tenantId);
      return orders.length;
    },
    countByStatus: (tenantId, fromDate) => {
      let orders = db.data.orders.filter(o => o.tenant_id === tenantId);
      if (fromDate) {
        orders = orders.filter(o => o.created_at >= fromDate);
      }
      const counts = { pending: 0, paid: 0, packed: 0, shipped: 0, completed: 0, cancelled: 0 };
      orders.forEach(o => {
        if (counts.hasOwnProperty(o.status)) {
          counts[o.status]++;
        }
      });
      return counts;
    },
    countBySource: (tenantId, fromDate) => {
      let orders = db.data.orders.filter(o => o.tenant_id === tenantId);
      if (fromDate) {
        orders = orders.filter(o => o.created_at >= fromDate);
      }
      const counts = {};
      orders.forEach(o => {
        counts[o.source] = (counts[o.source] || 0) + 1;
      });
      return counts;
    },
    sumTotal: (tenantId, fromDate) => {
      let orders = db.data.orders.filter(o => o.tenant_id === tenantId);
      if (fromDate) {
        orders = orders.filter(o => o.created_at >= fromDate);
      }
      return orders.reduce((sum, o) => sum + (o.total || 0), 0);
    }
  },
  syncLogs: {
    create: (data) => {
      const log = {
        ...data,
        id: data.id || generateId('sync'),
        started_at: new Date().toISOString()
      };
      db.data.syncLogs.push(log);
      return log;
    },
    recent: (tenantId, limit = 10) => {
      const integrationIds = db.data.integrations
        .filter(i => i.tenant_id === tenantId)
        .map(i => i.id);
      return db.data.syncLogs
        .filter(l => integrationIds.includes(l.integration_id))
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
        .slice(0, limit);
    }
  },
  save: async () => {
    await db.write();
  }
};

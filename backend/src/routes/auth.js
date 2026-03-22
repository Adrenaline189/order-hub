const { db, initDb, refresh, save, generateId } = require('../db');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('../auth');

module.exports = async function (fastify, opts) {
  // Register
  fastify.post('/auth/register', async (request, reply) => {
    const { email, password, name, tenant_name } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } };
    }

    await refresh();

    // Check if email exists
    const existingUser = db.data.users.find(u => u.email === email);
    if (existingUser) {
      reply.code(400);
      return { error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } };
    }

    // Create tenant
    const tenant = {
      id: generateId('tenant'),
      name: tenant_name || `${name || email}'s Shop`,
      plan: 'free',
      created_at: new Date().toISOString(),
    };
    db.data.tenants.push(tenant);

    // Create user
    const { salt, hash } = hashPassword(password);
    const user = {
      id: generateId('user'),
      tenant_id: tenant.id,
      email,
      name: name || email.split('@')[0],
      role: 'owner',
      password_salt: salt,
      password_hash: hash,
      created_at: new Date().toISOString(),
    };
    db.data.users.push(user);

    await save();

    const token = generateToken(user.id, tenant.id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
      },
      token,
    };
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } };
    }

    await refresh();

    const user = db.data.users.find(u => u.email === email);
    if (!user) {
      reply.code(401);
      return { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    const valid = verifyPassword(password, user.password_salt, user.password_hash);
    if (!valid) {
      reply.code(401);
      return { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }

    const tenant = db.data.tenants.find(t => t.id === user.tenant_id);
    const token = generateToken(user.id, user.tenant_id);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        plan: tenant?.plan,
      },
      token,
    };
  });

  // Get current user
  fastify.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: { code: 'UNAUTHORIZED', message: 'No token provided' } };
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      reply.code(401);
      return { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } };
    }

    await refresh();

    const user = db.data.users.find(u => u.id === payload.userId);
    if (!user) {
      reply.code(401);
      return { error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
    }

    const tenant = db.data.tenants.find(t => t.id === user.tenant_id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        plan: tenant?.plan,
      },
    };
  });

  // Logout (client-side token removal, but we can track it)
  fastify.post('/auth/logout', async (request, reply) => {
    return { success: true, message: 'Logged out successfully' };
  });

  // Change password
  fastify.post('/auth/change-password', async (request, reply) => {
    const { current_password, new_password } = request.body;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: { code: 'UNAUTHORIZED', message: 'No token provided' } };
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      reply.code(401);
      return { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } };
    }

    await refresh();

    const userIdx = db.data.users.findIndex(u => u.id === payload.userId);
    if (userIdx === -1) {
      reply.code(401);
      return { error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
    }

    const user = db.data.users[userIdx];
    const valid = verifyPassword(current_password, user.password_salt, user.password_hash);
    if (!valid) {
      reply.code(400);
      return { error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } };
    }

    const { salt, hash } = hashPassword(new_password);
    db.data.users[userIdx].password_salt = salt;
    db.data.users[userIdx].password_hash = hash;

    await save();

    return { success: true, message: 'Password changed successfully' };
  });
};

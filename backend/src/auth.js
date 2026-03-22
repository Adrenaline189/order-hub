// Encryption settings (no db dependency needed here)
const crypto = require('crypto');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Encrypt function
const encrypt = (text) => {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
};

// Decrypt function
const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    const { iv, encrypted, authTag } = encryptedData;
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};

// Hash password
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return { salt, hash };
};

// Verify password
const verifyPassword = (password, salt, hash) => {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
};

// Generate JWT-like token (simple version for MVP)
const generateToken = (userId, tenantId) => {
  const payload = { userId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ENCRYPTION_KEY)
    .update(token)
    .digest('hex');
  return `${token}.${signature}`;
};

// Verify token
const verifyToken = (token) => {
  try {
    const [payloadB64, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', ENCRYPTION_KEY)
      .update(payloadB64)
      .digest('hex');
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    
    return payload;
  } catch {
    return null;
  }
};

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  ENCRYPTION_KEY,
};

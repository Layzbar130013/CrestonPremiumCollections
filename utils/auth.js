const crypto = require('crypto');

// Secret for HMAC signing session tokens (stateless & serverless-ready for Vercel)
const SECRET = process.env.SESSION_SECRET || 'creston-premium-secret-ruai-kenya-2026';

// Session duration: 7 days
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory sessions fallback / cache
const sessions = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function createSession(user) {
  const now = Date.now();
  const sessionData = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    rights: user.rights || [], // e.g. ['view_stocks', 'edit_inventory', 'admin']
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS
  };

  // Create HMAC signed token: base64Data.signature
  const dataStr = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(dataStr).digest('base64url');
  const token = `${dataStr}.${signature}`;

  // Also cache locally
  sessions.set(token, sessionData);
  return token;
}

function getSession(token) {
  if (!token) return null;

  // 1. Check if token is signed stateless format
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [dataStr, signature] = parts;
      const expectedSignature = crypto.createHmac('sha256', SECRET).update(dataStr).digest('base64url');

      if (signature.length === expectedSignature.length &&
          crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        try {
          const sessionData = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
          if (Date.now() <= sessionData.expiresAt) {
            return sessionData;
          }
        } catch (e) {
          // Fall through to memory check
        }
      }
    }
  }

  // 2. Fallback to in-memory check (for plain tokens if any)
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function deleteSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });

  return list;
}

function getAuthFromReq(req) {
  // Check Authorization header 'Bearer <token>' first
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = getSession(token);
    if (session) return { token, session };
  }

  // Check Cookie 'creston_session'
  const cookies = parseCookies(req.headers['cookie']);
  if (cookies['creston_session']) {
    const token = cookies['creston_session'];
    const session = getSession(token);
    if (session) return { token, session };
  }

  return { token: null, session: null };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
  parseCookies,
  getAuthFromReq
};

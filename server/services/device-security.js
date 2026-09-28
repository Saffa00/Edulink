import crypto from 'node:crypto';

export function hashDeviceCredential(credential) {
  return crypto.createHash('sha256').update(String(credential), 'utf8').digest('hex');
}

export function normalizeRole(role) {
  if (!['student', 'lecturer'].includes(role)) throw new Error('Invalid role.');
  return role;
}

export function getClientIp(req) {
  // Keep the immediate peer as the safest default. If deployed behind a
  // trusted reverse proxy, Express's `trust proxy` can be configured and
  // req.ip will reflect the trusted proxy chain.
  return req.ip || req.socket?.remoteAddress || null;
}

export function getUserAgent(req) {
  return String(req.get('user-agent') || '').slice(0, 500);
}

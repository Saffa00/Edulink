import crypto from 'node:crypto';

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizeSignature(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  return trimmed.replace(/^sha256=/i, '').trim();
}

function candidates(rawBody, secret) {
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  return [
    digest.toString('hex'),
    digest.toString('base64')
  ];
}

export function verifyMonimeWebhook(rawBody, signatureHeader) {
  const secret = process.env.MONIME_WEBHOOK_SECRET;
  if (!secret) throw new Error('MONIME_WEBHOOK_SECRET is not configured.');

  const supplied = normalizeSignature(signatureHeader);
  if (!supplied) return false;

  return candidates(rawBody, secret).some((expected) => safeEqual(expected, supplied));
}

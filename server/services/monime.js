const API_BASE = process.env.MONIME_API_BASE_URL || 'https://api.monime.io';
const API_VERSION = process.env.MONIME_API_VERSION || 'caph.2025-08-23';
export const DEFAULT_MONIME_KEY = 'mon_8h2dcnw4kFySVataE9HpeK8hIWKiMo271Ozt1eaetuUnacq3T0iEVIPRI7loeJO6';
export const DEFAULT_MONIME_SPACE_ID = 'spc-k6V7ikDVQE5S2TGXdG19JWeb6tx';

export function cleanMonimeKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned.toLowerCase().startsWith('bearer ')) {
    cleaned = cleaned.slice(7).trim();
  }
  if (cleaned.includes('mon_')) {
    cleaned = 'mon_' + cleaned.split('mon_')[1].trim();
  }
  return cleaned;
}

export function cleanMonimeSpaceId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned.includes('spc-')) {
    return 'spc-' + cleaned.split('spc-')[1].trim();
  }
  // If user provided a domain like edulinl.monime.space, map to its space ID
  if (cleaned.includes('monime.space') || cleaned.includes('edulinl')) {
    return DEFAULT_MONIME_SPACE_ID;
  }
  return cleaned;
}

export function getMonimeApiKey() {
  const envCandidates = [
    process.env.MONIME_SECRET_KEY,
    process.env.MONIME_API_KEY,
    process.env.MONIME_KEY,
    process.env.API,
    process.env.vercelAPI,
    process.env.VERCEL_API,
    process.env.VITE_MONIME_SECRET_KEY
  ];

  for (const candidate of envCandidates) {
    const cleaned = cleanMonimeKey(candidate);
    if (cleaned && cleaned.startsWith('mon_') && !cleaned.includes('replace_with_')) {
      return cleaned;
    }
  }
  return DEFAULT_MONIME_KEY;
}

export function getMonimeSpaceId() {
  const envCandidates = [
    process.env.MONIME_SPACE_ID,
    process.env.MONIME_SPACE,
    process.env.SPACE_ID,
    process.env.VITE_MONIME_SPACE_ID
  ];

  for (const candidate of envCandidates) {
    const cleaned = cleanMonimeSpaceId(candidate);
    if (cleaned && cleaned.startsWith('spc-')) {
      return cleaned;
    }
  }
  return DEFAULT_MONIME_SPACE_ID;
}

export function isMonimeConfigured() {
  const key = getMonimeApiKey();
  return Boolean(key && key.startsWith('mon_') && !key.includes('replace_with_'));
}

export async function verifyMonimeConnection() {
  try {
    const response = await fetch(`${API_BASE}/v1/checkout-sessions?limit=1`, {
      method: 'GET',
      headers: headers()
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.success) {
      return { ok: true, status: 'authenticated', keyPrefix: getMonimeApiKey().slice(0, 10) + '...' };
    }
    return {
      ok: false,
      status: response.status,
      error: data?.error?.message || (data?.messages || []).join('; ') || `HTTP ${response.status}`,
      keyPrefix: getMonimeApiKey().slice(0, 10) + '...'
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${getMonimeApiKey()}`,
    'Content-Type': 'application/json',
    'Monime-Space-Id': getMonimeSpaceId(),
    'Monime-Version': API_VERSION,
    ...extra
  };
}

function requireConfig() {
  const key = getMonimeApiKey();
  const space = getMonimeSpaceId();
  if (!key || !space) {
    throw new Error('MONIME_SECRET_KEY and MONIME_SPACE_ID are required.');
  }
}

export async function createCheckout({
  reference, studentId, amount, currency = 'SLE', returnUrl, cancelUrl, registrationType, phone, provider, modulesCount
}) {
  requireConfig();

  const minorValue = Math.round(Number(amount) * 100);

  const payload = {
    name: registrationType === 'dissertation'
      ? 'Dissertation Student Registration'
      : `Student Registration (${modulesCount || 1} Modules)`,
    description: `Academic mobile money registration for student ${studentId} (${provider || 'momo'})`,
    reference,
    cancelUrl,
    successUrl: returnUrl,
    lineItems: [{
      name: registrationType === 'dissertation'
        ? 'Dissertation Registration'
        : `Curriculum Module Tuition (${modulesCount || 1} modules)`,
      price: { currency, value: minorValue },
      type: 'custom',
      quantity: 1,
      reference
    }],
    metadata: {
      studentId,
      registrationType,
      phoneNumber: phone || undefined,
      provider: provider || undefined,
      modulesCount: modulesCount ? String(modulesCount) : undefined
    }
  };

  const response = await fetch(`${API_BASE}/v1/checkout-sessions`, {
    method: 'POST',
    headers: headers({ 'Idempotency-Key': reference }),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const detailError = data?.error?.details?.[0]?.errors?.join?.('; ')
      || data?.error?.message
      || (Array.isArray(data?.messages) && data.messages.length ? data.messages.join('; ') : '')
      || `Monime returned HTTP ${response.status}`;
    console.error('Monime checkout error details:', response.status, JSON.stringify(data));
    throw new Error(detailError);
  }
  return data.result;
}

export async function getCheckoutSession(id) {
  requireConfig();

  const response = await fetch(
    `${API_BASE}/v1/checkout-sessions/${encodeURIComponent(id)}`,
    { headers: headers() }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data?.messages?.join?.('; ') || `Monime returned HTTP ${response.status}`);
  }
  return data.result;
}

export async function createPaymentCode({
  name,
  amount,
  currency = 'SLE',
  reference,
  provider = 'orange'
}) {
  requireConfig();
  const minorValue = Math.round(Number(amount) * 100);
  const providerId = provider.toLowerCase().includes('afri') ? 'm18' : 'm17';

  const payload = {
    name: name || 'EduLink Student Registration',
    mode: 'one_time',
    enable: true,
    amount: {
      currency,
      value: minorValue
    },
    reference,
    authorizedProviders: [providerId],
    financialAccountId: process.env.MONIME_FINANCIAL_ACCOUNT_ID || 'fac-k6V7ikHutmL3HsjGzi9FGrfBpcg'
  };

  const response = await fetch(`${API_BASE}/v1/payment-codes`, {
    method: 'POST',
    headers: headers({ 'Idempotency-Key': reference }),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const detailError = data?.error?.details?.[0]?.errors?.join?.('; ')
      || data?.error?.message
      || `Monime returned HTTP ${response.status}`;
    throw new Error(detailError);
  }
  return data.result;
}

export async function getPaymentCode(id) {
  requireConfig();
  const response = await fetch(`${API_BASE}/v1/payment-codes/${encodeURIComponent(id)}`, {
    headers: headers()
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data?.messages?.join?.('; ') || `Monime returned HTTP ${response.status}`);
  }
  return data.result;
}



const API_BASE = process.env.MONIME_API_BASE_URL || 'https://api.monime.io';
const API_VERSION = process.env.MONIME_API_VERSION || 'caph.2025-08-23';
export const DEFAULT_MONIME_KEY = 'mon_8h2dcnw4kFySVataE9HpeK8hIWKiMo271Ozt1eaetuUnacq3T0iEVIPRI7loeJO6';
export const DEFAULT_MONIME_SPACE_ID = 'spc-k6V7ikDVQE5S2TGXdG19JWeb6tx';

export function getMonimeApiKey() {
  const key = process.env.MONIME_SECRET_KEY || DEFAULT_MONIME_KEY;
  return (key && typeof key === 'string') ? key.trim() : DEFAULT_MONIME_KEY;
}

export function getMonimeSpaceId() {
  const space = process.env.MONIME_SPACE_ID || DEFAULT_MONIME_SPACE_ID;
  return (space && typeof space === 'string') ? space.trim() : DEFAULT_MONIME_SPACE_ID;
}

export function isMonimeConfigured() {
  const key = getMonimeApiKey();
  return Boolean(key && !key.includes('replace_with_'));
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



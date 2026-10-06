const API_BASE = process.env.MONIME_API_BASE_URL || 'https://api.monime.io';
const API_VERSION = process.env.MONIME_API_VERSION || 'caph.2025-08-23';

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.MONIME_SECRET_KEY}`,
    'Content-Type': 'application/json',
    'Monime-Space-Id': process.env.MONIME_SPACE_ID,
    'Monime-Version': API_VERSION,
    ...extra
  };
}

function requireConfig() {
  if (!process.env.MONIME_SECRET_KEY || !process.env.MONIME_SPACE_ID) {
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

  if (phone) {
    payload.customer = {
      phoneNumber: phone
    };
  }

  const response = await fetch(`${API_BASE}/v1/checkout-sessions`, {
    method: 'POST',
    headers: headers({ 'Idempotency-Key': reference }),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data?.messages?.join?.('; ') || `Monime returned HTTP ${response.status}`);
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

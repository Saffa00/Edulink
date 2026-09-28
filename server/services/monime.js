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
  reference, studentId, amount, currency, returnUrl, cancelUrl, registrationType
}) {
  requireConfig();

  const minorValue = Math.round(Number(amount) * 100);

  const response = await fetch(`${API_BASE}/v1/checkout-sessions`, {
    method: 'POST',
    headers: headers({ 'Idempotency-Key': reference }),
    body: JSON.stringify({
      name: registrationType === 'dissertation'
        ? 'Dissertation Student Registration'
        : 'Student Registration',
      description: `Academic registration for student ${studentId}`,
      reference,
      cancelUrl,
      successUrl: returnUrl,
      lineItems: [{
        name: registrationType === 'dissertation'
          ? 'Dissertation Registration'
          : 'Student Registration',
        price: { currency, value: minorValue },
        type: 'custom',
        quantity: 1,
        reference
      }],
      metadata: {
        studentId,
        registrationType
      }
    })
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

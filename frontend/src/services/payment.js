import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please verify your email and log in before starting payment.');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function registerStudentApplicantAndCheckout(formData) {
  try {
    const returnUrl = `${window.location.origin}/payment-success`;
    const cancelUrl = `${window.location.origin}/payment-cancelled`;

    const response = await fetch(apiUrl('/api/registration/student-applicant'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        returnUrl,
        cancelUrl
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Registration failed.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Registration server unreachable. Please verify your connection.');
    }
    throw err;
  }
}

export async function verifyPaymentAndProvision({ sessionId, studentId }) {
  try {
    const response = await fetch(apiUrl('/api/payments/verify-completion'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, studentId })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Payment confirmation failed.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Payment confirmation server unreachable. Please verify connection.');
    }
    throw err;
  }
}

export async function initializeRegistrationPayment({
  studentId, registrationType, returnUrl, cancelUrl
}) {
  try {
    const response = await fetch(apiUrl('/api/payments/initialize'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ studentId, registrationType, returnUrl, cancelUrl })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to initialize payment');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Payment gateway server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function openRegistrationCheckout(options) {
  const data = await initializeRegistrationPayment(options);
  const checkoutUrl = data?.checkout?.redirectUrl || data?.checkoutUrl;
  if (!checkoutUrl) throw new Error('Payment checkout URL was not returned.');
  window.location.assign(checkoutUrl);
}

// First-class Monime Mobile Money USSD / Push Payment Flow
export async function initiateMobileMoneyPayment({
  studentId,
  phone,
  provider,
  modules = [],
  modulesCount,
  registrationType = 'normal'
}) {
  try {
    const returnUrl = `${window.location.origin}/payment-success`;
    const cancelUrl = `${window.location.origin}/payment-cancelled`;

    const response = await fetch(apiUrl('/api/payments/initiate-momo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        phone,
        provider,
        modules,
        modulesCount,
        registrationType,
        returnUrl,
        cancelUrl
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to initiate mobile money payment.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Payment server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function checkMobileMoneyPaymentStatus(paymentId) {
  try {
    const response = await fetch(apiUrl(`/api/payments/status-check/${encodeURIComponent(paymentId)}`));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to check transaction status.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Status polling network check failed.');
    }
    throw err;
  }
}

export async function simulateMobileMoneyApproval({ paymentId, studentId }) {
  try {
    const response = await fetch(apiUrl('/api/payments/simulate-momo-approval'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, studentId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Mobile money approval confirmation failed.');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Payment server unreachable.');
    }
    throw err;
  }
}

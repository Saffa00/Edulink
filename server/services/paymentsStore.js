import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../data/payments_store.json');

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

function loadLocalPayments() {
  try {
    ensureStoreDir();
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalPayments(list) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local payments store:', e);
  }
}

export async function recordPayment(db, paymentData) {
  const reference = paymentData.reference || `REG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const payload = {
    ...paymentData,
    reference,
    created_at: new Date().toISOString()
  };

  // 1. Attempt to insert into Supabase payments table
  try {
    const { data, error } = await db
      .from('payments')
      .insert({
        student_id: payload.student_id,
        amount: payload.amount,
        currency: payload.currency || 'SLE',
        payment_type: payload.payment_type || 'registration',
        status: payload.status || 'pending',
        provider: payload.provider || 'monime',
        reference: payload.reference
      })
      .select('id, reference, status, amount, currency')
      .single();

    if (!error && data) {
      return data;
    }
  } catch (supabaseErr) {
    console.warn('Supabase payments table insert notice (using local fallback store):', supabaseErr.message);
  }

  // 2. Persistent fallback store
  const id = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const localRecord = {
    id,
    ...payload,
    status: payload.status || 'pending'
  };

  const list = loadLocalPayments();
  list.push(localRecord);
  saveLocalPayments(list);

  return localRecord;
}

export async function findPayment(db, { sessionId, studentRecordId, studentCode }) {
  // 1. Try Supabase payments table
  try {
    let query = db.from('payments').select('*');
    if (sessionId) {
      query = query.or(`checkout_session_id.eq.${sessionId},reference.eq.${sessionId},provider_reference.eq.${sessionId}`);
    } else if (studentRecordId) {
      query = query.eq('student_id', studentRecordId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    // Ignore and fallback to local store
  }

  // 2. Search local store
  const list = loadLocalPayments();
  const found = list.slice().reverse().find(p => {
    if (sessionId) {
      return p.checkout_session_id === sessionId || p.reference === sessionId || p.provider_reference === sessionId || p.id === sessionId;
    }
    if (studentRecordId) {
      return p.student_id === studentRecordId;
    }
    return false;
  });

  return found || null;
}

export async function markPaymentPaid(db, paymentIdOrRef, updates = {}) {
  // 1. Try Supabase
  try {
    await db
      .from('payments')
      .update({
        status: 'paid',
        verified_at: new Date().toISOString(),
        ...updates
      })
      .or(`id.eq.${paymentIdOrRef},reference.eq.${paymentIdOrRef}`);
  } catch (e) {
    // Ignore
  }

  // 2. Update local store
  const list = loadLocalPayments();
  const idx = list.findIndex(p => p.id === paymentIdOrRef || p.reference === paymentIdOrRef || p.checkout_session_id === paymentIdOrRef);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      status: 'paid',
      verified_at: new Date().toISOString(),
      ...updates
    };
    saveLocalPayments(list);
    return list[idx];
  }
  return null;
}

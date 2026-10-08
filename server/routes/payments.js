import { Router } from 'express';
import crypto from 'node:crypto';
import { registrationFee } from '../services/fees.js';
import { createCheckout, getCheckoutSession } from '../services/monime.js';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { verifyMonimeWebhook } from '../services/webhook-security.js';
import { sendStudentCredentialsEmail } from '../services/email.js';
import { findPayment, markPaymentPaid, recordPayment } from '../services/paymentsStore.js';

const router = Router();

function paymentTypeFromRegistration(registrationType) {
  return registrationType === 'dissertation' ? 'dissertation' : 'registration';
}

async function getStudentForUser(userId, studentId) {
  const { data, error } = await getAdminSupabase()
    .from('students')
    .select('id, student_id, auth_user_id, registration_type, account_status')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Student record not found.');
  if (data.auth_user_id && data.auth_user_id !== userId) {
    throw new Error('Student account does not match the authenticated user.');
  }
  return data;
}

// Helper to provision Supabase Auth user & generate temporary password upon verified payment
export async function provisionStudentAccount(db, studentRecordId) {
  const { data: student, error: sErr } = await db
    .from('students')
    .select('id, student_id, full_name, email, account_status, auth_user_id')
    .eq('id', studentRecordId)
    .single();

  if (sErr || !student) throw new Error('Student record not found.');

  // Generate secure temporary password
  const tempPassword = `EduLink-${student.student_id}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  let authUserId = student.auth_user_id;
  try {
    const { data: existingUsers, error: listErr } = await db.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === student.email?.toLowerCase()
    );

    if (existingUser) {
      authUserId = existingUser.id;
      await db.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          role: 'student',
          student_id: student.student_id,
          full_name: student.full_name,
          temporary_password: true,
          requires_password_change: true
        }
      });
    } else {
      const { data: newUser, error: createAuthError } = await db.auth.admin.createUser({
        email: student.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          student_id: student.student_id,
          full_name: student.full_name,
          temporary_password: true,
          requires_password_change: true
        }
      });
      if (createAuthError) throw createAuthError;
      authUserId = newUser.user.id;
    }
  } catch (adminErr) {
    console.warn('Supabase auth.admin notice (using auth.signUp fallback):', adminErr.message);
    const { data: signUpData } = await db.auth.signUp({
      email: student.email,
      password: tempPassword,
      options: {
        data: {
          role: 'student',
          student_id: student.student_id,
          full_name: student.full_name,
          temporary_password: true,
          requires_password_change: true
        }
      }
    });
    if (signUpData?.user?.id) {
      authUserId = signUpData.user.id;
    }
  }

  // Activate student profile
  await db
    .from('students')
    .update({
      account_status: 'active',
      auth_user_id: authUserId
    })
    .eq('id', student.id);

  // Dispatch email notification
  await sendStudentCredentialsEmail({
    email: student.email,
    fullName: student.full_name,
    studentId: student.student_id,
    temporaryPassword: tempPassword
  });

  return {
    studentId: student.student_id,
    fullName: student.full_name,
    email: student.email,
    temporaryPassword: tempPassword
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lookupStudent(db, identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim();

  // Try student_id first (e.g. "2003", "8100", "8409")
  const { data: byCode, error: cErr } = await db
    .from('students')
    .select('id, student_id, full_name, email, phone, account_status, level, registration_type')
    .eq('student_id', clean)
    .maybeSingle();

  if (byCode && !cErr) return byCode;

  // If valid UUID, search by id
  if (UUID_REGEX.test(clean)) {
    const { data: byId } = await db
      .from('students')
      .select('id, student_id, full_name, email, phone, account_status, level, registration_type')
      .eq('id', clean)
      .maybeSingle();
    if (byId) return byId;
  }

  // Fallback: search by email if contains @
  if (clean.includes('@')) {
    const { data: byEmail } = await db
      .from('students')
      .select('id, student_id, full_name, email, phone, account_status, level, registration_type')
      .eq('email', clean.toLowerCase())
      .maybeSingle();
    if (byEmail) return byEmail;
  }

  return null;
}

export async function lookupPayment(db, identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim();

  // 1. If valid UUID, search payments.id
  if (UUID_REGEX.test(clean)) {
    const { data: byId } = await db
      .from('payments')
      .select('*, students(id, student_id, full_name, email, phone, account_status)')
      .eq('id', clean)
      .maybeSingle();
    if (byId) return byId;
  }

  // 2. Search reference
  const { data: byRef } = await db
    .from('payments')
    .select('*, students(id, student_id, full_name, email, phone, account_status)')
    .eq('reference', clean)
    .maybeSingle();
  if (byRef) return byRef;

  // 3. Search checkout_session_id or provider_reference
  const { data: bySession } = await db
    .from('payments')
    .select('*, students(id, student_id, full_name, email, phone, account_status)')
    .or(`checkout_session_id.eq.${clean},provider_reference.eq.${clean}`)
    .maybeSingle();
  if (bySession) return bySession;

  // 4. Fallback to paymentsStore
  const local = await findPayment(db, { sessionId: clean });
  return local || null;
}

// Helper to activate student curriculum modules upon verified payment
export async function activateStudentModules(db, studentRecordId, moduleCodes = []) {
  try {
    if (!studentRecordId) return;
    const student = await lookupStudent(db, studentRecordId);

    if (!student) return;

    let targetModuleIds = [];
    if (Array.isArray(moduleCodes) && moduleCodes.length > 0) {
      const { data: matchedMods } = await db
        .from('modules')
        .select('id')
        .in('code', moduleCodes);
      if (matchedMods?.length) {
        targetModuleIds = matchedMods.map(m => m.id);
      }
    }

    if (!targetModuleIds.length) {
      const { data: defaultMods } = await db
        .from('modules')
        .select('id')
        .or(`level.eq.${student.level || 1},level.is.null`)
        .limit(8);
      if (defaultMods?.length) {
        targetModuleIds = defaultMods.map(m => m.id);
      }
    }

    if (targetModuleIds.length) {
      const enrollments = targetModuleIds.map(mid => ({
        student_id: student.id,
        module_id: mid
      }));
      await db
        .from('student_modules')
        .upsert(enrollments, { onConflict: 'student_id,module_id', ignoreDuplicates: true });
    }
  } catch (err) {
    console.warn('activateStudentModules error:', err.message);
  }
}

// Initiate mobile money payment request to Monime & provider network
router.post('/initiate-momo', async (req, res) => {
  try {
    const {
      studentId,
      phone,
      provider = 'orange',
      modules = [],
      modulesCount,
      registrationType = 'normal'
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required.' });
    }
    if (!phone || String(phone).trim().length < 7) {
      return res.status(400).json({ error: 'A valid mobile money phone number is required.' });
    }

    const cleanStudentId = String(studentId).trim();
    const cleanPhone = String(phone).trim();
    const cleanProvider = (provider || 'orange').toLowerCase().includes('afri') ? 'afrimoney' : 'orange';
    const cleanType = registrationType === 'dissertation' ? 'dissertation' : 'normal';

    const count = cleanType === 'dissertation'
      ? 1
      : (Array.isArray(modules) && modules.length > 0 ? modules.length : (Number(modulesCount) || 3));
    const amount = registrationFee(cleanType, count);

    const db = getAdminSupabase();

    // Look up student safely (supports studentId, UUID, or email without 22P02 error)
    const student = await lookupStudent(db, cleanStudentId);

    if (!student) {
      return res.status(404).json({ error: `Student profile not found for: ${cleanStudentId}` });
    }

    const reference = `REG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Record pending payment in database/store (NEVER rely on frontend button clicks to mark paid)
    const pendingPayment = await recordPayment(db, {
      student_id: student.id,
      amount,
      currency: 'SLE',
      payment_type: cleanType === 'dissertation' ? 'dissertation' : 'registration',
      status: 'pending',
      provider: cleanProvider,
      reference
    });

    // Contact Monime API to create checkout session or mobile money charge
    let checkoutSessionId = reference;
    let checkoutUrl = null;
    const isPlaceholderSecret = !process.env.MONIME_SECRET_KEY || process.env.MONIME_SECRET_KEY.includes('replace_with_');

    if (!isPlaceholderSecret) {
      try {
        const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
        const clientBase = req.body.returnUrl ? null : (originHeader || process.env.ALLOWED_ORIGIN || `${req.protocol}://${req.get('host')}`);
        const successRedirect = req.body.returnUrl
          ? `${req.body.returnUrl}${req.body.returnUrl.includes('?') ? '&' : '?'}session_id=${reference}&student_id=${student.student_id}`
          : `${clientBase}/payment-success?session_id=${reference}&student_id=${student.student_id}`;
        const cancelRedirect = req.body.cancelUrl || `${clientBase}/payment-cancelled`;

        const checkout = await createCheckout({
          reference,
          studentId: student.student_id,
          amount,
          currency: 'SLE',
          returnUrl: successRedirect,
          cancelUrl: cancelRedirect,
          registrationType: cleanType,
          phone: cleanPhone,
          provider: cleanProvider,
          modulesCount: count
        });
        checkoutSessionId = checkout.id || reference;
        checkoutUrl = checkout.redirectUrl || checkout.url || null;
      } catch (monimeErr) {
        console.warn('Monime API notice:', monimeErr.message);
      }
    }

    if (pendingPayment?.id) {
      try {
        await db.from('payments').update({
          checkout_session_id: checkoutSessionId,
          provider_reference: checkoutSessionId
        }).eq('id', pendingPayment.id);
      } catch (updErr) {
        console.warn('Payment record update notice:', updErr.message);
      }
    }

    // Generate Monime USSD payment dial code (*715*...#)
    const ussdNumericCode = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const ussdCode = `*715*${ussdNumericCode}#`;

    return res.json({
      success: true,
      paymentId: pendingPayment.id,
      reference,
      checkoutSessionId,
      checkoutUrl,
      ussdCode,
      ussdNumericCode,
      amount,
      currency: 'SLE',
      phone: cleanPhone,
      provider: cleanProvider,
      modulesCount: count,
      status: 'pending',
      message: `Payment authorization request sent to ${cleanPhone}. Dial ${ussdCode} to approve.`
    });
  } catch (err) {
    console.error('Initiate mobile money payment error:', err);
    return res.status(500).json({ error: err.message || 'Failed to initiate mobile money payment.' });
  }
});

// Check status of mobile money transaction (called during "Waiting for approval..." polling)
router.get('/status-check/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const db = getAdminSupabase();

    // Query payment record by ID, reference, or checkout_session_id safely
    const payment = await lookupPayment(db, paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment transaction record not found.' });
    }

    const student = payment.students || {};

    // 1. If already paid, return confirmed details
    if (payment.status === 'paid') {
      return res.json({
        success: true,
        status: 'paid',
        paid: true,
        reference: payment.reference,
        transactionId: payment.provider_reference || payment.reference,
        amount: payment.amount,
        currency: payment.currency || 'SLE',
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        verifiedAt: payment.verified_at
      });
    }

    // 2. If status is pending, verify against Monime API
    const isPlaceholderSecret = !process.env.MONIME_SECRET_KEY || process.env.MONIME_SECRET_KEY.includes('replace_with_');
    let isMonimeConfirmed = false;

    if (!isPlaceholderSecret && payment.checkout_session_id) {
      try {
        const monimeSession = await getCheckoutSession(payment.checkout_session_id);
        const monimeStatus = String(monimeSession.status || '').toLowerCase();
        if (monimeStatus === 'completed' || monimeStatus === 'paid' || monimeStatus === 'succeeded') {
          isMonimeConfirmed = true;
        } else if (monimeStatus === 'failed' || monimeStatus === 'cancelled' || monimeStatus === 'expired') {
          await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
          return res.json({
            success: false,
            status: 'failed',
            paid: false,
            error: 'Mobile money authorization was cancelled or expired.'
          });
        }
      } catch (err) {
        console.warn('Monime session status query notice:', err.message);
      }
    }

    if (isMonimeConfirmed) {
      const verifiedAt = new Date().toISOString();
      await db.from('payments').update({
        status: 'paid',
        verified_at: verifiedAt
      }).eq('id', payment.id);

      // Provision credentials & activate account
      const creds = await provisionStudentAccount(db, student.id || payment.student_id);
      await activateStudentModules(db, student.id || payment.student_id);

      return res.json({
        success: true,
        status: 'paid',
        paid: true,
        reference: payment.reference,
        transactionId: payment.provider_reference || payment.reference,
        amount: payment.amount,
        currency: payment.currency || 'SLE',
        studentId: creds.studentId || student.student_id,
        fullName: creds.fullName || student.full_name,
        email: creds.email || student.email,
        temporaryPassword: creds.temporaryPassword,
        verifiedAt
      });
    }

    // Still waiting for student PIN entry on mobile phone
    return res.json({
      success: true,
      status: 'pending',
      paid: false,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency || 'SLE',
      phone: student.phone,
      message: 'Waiting for approval...'
    });
  } catch (err) {
    console.error('Check momo status error:', err);
    return res.status(500).json({ error: err.message || 'Status check failed.' });
  }
});

// Explicit confirmation endpoint for phone approval completion / dev fallback
router.post('/simulate-momo-approval', async (req, res) => {
  try {
    const { paymentId, studentId } = req.body;
    if (!paymentId && !studentId) {
      return res.status(400).json({ error: 'paymentId or studentId is required.' });
    }

    const db = getAdminSupabase();
    let payment = null;

    if (paymentId) {
      payment = await lookupPayment(db, paymentId);
    }

    let targetStudentId = payment?.student_id;
    if (!targetStudentId && studentId) {
      const { data: st } = await db.from('students').select('id').eq('student_id', studentId).maybeSingle();
      if (st) targetStudentId = st.id;
    }

    if (payment?.id) {
      await db.from('payments').update({
        status: 'paid',
        verified_at: new Date().toISOString()
      }).eq('id', payment.id);
    }

    const creds = await provisionStudentAccount(db, targetStudentId);
    await activateStudentModules(db, targetStudentId);

    return res.json({
      success: true,
      status: 'paid',
      paid: true,
      reference: payment?.reference || `REG-${Date.now()}`,
      transactionId: payment?.provider_reference || payment?.reference || `MOMO-${Date.now()}`,
      amount: payment?.amount || 100,
      currency: payment?.currency || 'SLE',
      ...creds
    });
  } catch (err) {
    console.error('Simulate momo approval error:', err);
    return res.status(500).json({ error: err.message || 'Simulation failed.' });
  }
});

// Verify payment completion from return redirect and return temporary credentials
router.post('/verify-completion', async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;
    if (!sessionId && !studentId) {
      return res.status(400).json({ error: 'sessionId or studentId is required.' });
    }

    const db = getAdminSupabase();

    let studentRecordId = null;
    if (studentId) {
      const { data: st } = await db.from('students').select('id').eq('student_id', studentId).maybeSingle();
      if (st) studentRecordId = st.id;
    }

    const payment = await findPayment(db, { sessionId, studentRecordId, studentCode: studentId });

    if (!payment) {
      if (studentRecordId) {
        const creds = await provisionStudentAccount(db, studentRecordId);
        return res.json({
          success: true,
          amount: 100,
          currency: 'SLE',
          ...creds,
          requiresPasswordChange: true
        });
      }
      return res.status(404).json({ error: 'No matching payment session found.' });
    }

    // Mark payment as paid
    await markPaymentPaid(db, payment.id, {
      status: 'paid',
      verified_at: new Date().toISOString()
    });

    // Provision account and generate temporary password
    const targetStudentId = payment.student_id || studentRecordId;
    const creds = await provisionStudentAccount(db, targetStudentId);
    await activateStudentModules(db, targetStudentId);

    // Fetch activated modules to return to frontend
    const { data: stMods } = await db
      .from('student_modules')
      .select('module_id, modules(code, title)')
      .eq('student_id', targetStudentId);

    const modules = (stMods || []).map(sm => ({
      code: sm.modules?.code || sm.module_id,
      title: sm.modules?.title || ''
    }));

    res.json({
      success: true,
      amount: payment.amount || 100,
      currency: payment.currency || 'SLE',
      ...creds,
      modules,
      modulesCount: modules.length || 1,
      requiresPasswordChange: true
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed.' });
  }
});

router.post('/initialize', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { studentId, registrationType, returnUrl, cancelUrl } = req.body;

    if (!studentId || !registrationType || !returnUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'studentId, registrationType, returnUrl and cancelUrl are required'
      });
    }

    if (!['normal', 'dissertation'].includes(registrationType)) {
      return res.status(400).json({ error: 'Invalid registration type.' });
    }

    const student = await getStudentForUser(user.id, studentId);
    if (student.registration_type !== registrationType) {
      return res.status(400).json({ error: 'Registration type does not match the student record.' });
    }

    if (student.account_status === 'active') {
      return res.status(409).json({ error: 'Student account is already active.' });
    }

    const amount = registrationFee(registrationType);
    const reference = `REG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const db = getAdminSupabase();

    const { data: pendingPayment, error: paymentInsertError } = await db
      .from('payments')
      .insert({
        student_id: student.id,
        amount,
        currency: 'SLE',
        payment_type: paymentTypeFromRegistration(registrationType),
        status: 'pending',
        provider: 'monime',
        reference
      })
      .select('id, reference, status, amount, currency')
      .single();

    if (paymentInsertError) throw paymentInsertError;

    let checkout;
    const isPlaceholderSecret = !process.env.MONIME_SECRET_KEY || process.env.MONIME_SECRET_KEY.includes('replace_with_');
    if (isPlaceholderSecret) {
      const simId = `chk_sim_${Date.now()}`;
      checkout = {
        id: simId,
        redirectUrl: `${returnUrl}?session_id=${simId}&student_id=${studentId}`
      };
      await db.from('payments').update({
        status: 'paid',
        provider_reference: checkout.id,
        checkout_session_id: checkout.id,
        verified_at: new Date().toISOString()
      }).eq('id', pendingPayment.id);
      await provisionStudentAccount(db, student.id);
    } else {
      try {
        checkout = await createCheckout({
          reference,
          studentId,
          amount,
          currency: 'SLE',
          returnUrl,
          cancelUrl,
          registrationType
        });
      } catch (error) {
        await db.from('payments').update({ status: 'failed' }).eq('id', pendingPayment.id);
        throw error;
      }
    }

    const { error: updateError } = await db
      .from('payments')
      .update({
        provider_reference: checkout.id,
        checkout_session_id: checkout.id
      })
      .eq('id', pendingPayment.id);

    if (updateError) throw updateError;

    res.json({
      status: 'pending',
      reference,
      amount,
      currency: 'SLE',
      checkout
    });
  } catch (error) {
    const status = /token|authenticated|match|not found/i.test(error.message) ? 401 : 503;
    res.status(status).json({ error: error.message });
  }
});

router.get('/status/:checkoutId', async (req, res) => {
  try {
    const checkout = await getCheckoutSession(req.params.checkoutId);
    const db = getAdminSupabase();

    const { data: payment, error } = await db
      .from('payments')
      .select('id, student_id, reference, amount, currency, payment_type, status, provider_reference, checkout_session_id, verified_at')
      .eq('checkout_session_id', checkout.id)
      .maybeSingle();

    if (error) throw error;
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    res.json({ checkout, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const signatureHeaderName = (
      process.env.MONIME_WEBHOOK_SIGNATURE_HEADER || 'x-monime-signature'
    ).toLowerCase();

    const signature = req.get(signatureHeaderName);
    const rawBody = req.rawBody;

    if (!rawBody) return res.status(400).json({ error: 'Raw webhook body is required.' });

    if (!verifyMonimeWebhook(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body || {};
    const eventType = String(
      event.type || event.event || event.name || event.eventType || ''
    ).toLowerCase();

    const completed =
      eventType.includes('completed') ||
      eventType.includes('paid') ||
      eventType.includes('payment.success');

    if (!completed) {
      return res.json({ received: true, processed: false, reason: 'Event ignored.' });
    }

    const result = event.result || event.data || event.resource || event.object || event;
    const checkoutId =
      result.checkoutSessionId ||
      result.checkout_session_id ||
      result.id ||
      result.sessionId ||
      event.checkoutSessionId ||
      event.checkout_session_id;

    if (!checkoutId) {
      return res.status(400).json({ error: 'Completed event does not contain a checkout session ID.' });
    }

    const checkout = await getCheckoutSession(checkoutId);
    if (String(checkout.status).toLowerCase() !== 'completed') {
      return res.status(409).json({ error: 'Checkout session is not completed.' });
    }

    const db = getAdminSupabase();
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('id, student_id, amount, currency, status, reference, checkout_session_id')
      .eq('checkout_session_id', checkout.id)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      return res.status(404).json({ error: 'Local payment record not found.' });
    }

    if (payment.status === 'paid') {
      return res.json({ received: true, processed: false, reason: 'Already processed.' });
    }

    const verifiedAt = new Date().toISOString();

    await db
      .from('payments')
      .update({
        status: 'paid',
        provider_reference: checkout.id,
        checkout_session_id: checkout.id,
        verified_at: verifiedAt
      })
      .eq('id', payment.id);

    // Provision student account & dispatch credentials email
    const creds = await provisionStudentAccount(db, payment.student_id);

    res.json({
      received: true,
      processed: true,
      studentActivated: true,
      checkoutId: checkout.id,
      studentId: creds.studentId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

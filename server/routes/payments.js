import { Router } from 'express';
import crypto from 'node:crypto';
import { registrationFee } from '../services/fees.js';
import { createCheckout, getCheckoutSession } from '../services/monime.js';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { verifyMonimeWebhook } from '../services/webhook-security.js';
import { sendStudentCredentialsEmail } from '../services/email.js';
import { findPayment, markPaymentPaid } from '../services/paymentsStore.js';

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
    const creds = await provisionStudentAccount(db, payment.student_id || studentRecordId);

    res.json({
      success: true,
      amount: payment.amount || 100,
      currency: payment.currency || 'SLE',
      ...creds,
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

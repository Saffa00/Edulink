import { Router } from 'express';
import crypto from 'node:crypto';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { registrationFee } from '../services/fees.js';
import { createCheckout } from '../services/monime.js';
import { recordPayment, markPaymentPaid } from '../services/paymentsStore.js';

const router = Router();

// Student applicant registration without password - triggers payment checkout
router.post('/student-applicant', async (req, res) => {
  try {
    const {
      studentId, fullName, email, phone,
      facultyId, departmentId, programmeId, programme,
      level, academicYear, semester, registrationType = 'normal',
      returnUrl, cancelUrl
    } = req.body;

    if (!studentId || !fullName || !email) {
      return res.status(400).json({ error: 'Student ID, Full Name, and Email are required.' });
    }

    const cleanStudentId = String(studentId).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanType = registrationType === 'dissertation' ? 'dissertation' : 'normal';
    const cleanLevel = level ? Number(level) : 3;

    const db = getAdminSupabase();

    // Check if account already exists and is active
    const { data: existingStudent, error: checkErr } = await db
      .from('students')
      .select('id, student_id, email, account_status')
      .or(`student_id.eq.${cleanStudentId},email.eq.${cleanEmail}`)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existingStudent && existingStudent.account_status === 'active') {
      return res.status(409).json({
        error: 'An active account already exists with this Student ID or Email. Please proceed to login.'
      });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeUuid = (val) => (val && typeof val === 'string' && UUID_REGEX.test(val) ? val : null);

    const studentPayload = {
      student_id: cleanStudentId,
      full_name: String(fullName).trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      faculty_id: safeUuid(facultyId),
      department_id: safeUuid(departmentId),
      programme_id: safeUuid(programmeId),
      level: cleanLevel,
      academic_year: academicYear || '2026/2027',
      semester: semester || 'First Semester',
      registration_type: cleanType,
      account_status: 'pending_payment'
    };

    let studentRecord;
    if (existingStudent) {
      let { data: updated, error: updateErr } = await db
        .from('students')
        .update({ ...studentPayload, programme: programme || null })
        .eq('id', existingStudent.id)
        .select('*')
        .maybeSingle();

      if (updateErr && updateErr.message?.includes('programme')) {
        const retry = await db
          .from('students')
          .update(studentPayload)
          .eq('id', existingStudent.id)
          .select('*')
          .maybeSingle();
        updateErr = retry.error;
        updated = retry.data;
      }
      if (updateErr) throw updateErr;
      studentRecord = updated;
    } else {
      let { data: created, error: insertErr } = await db
        .from('students')
        .insert({ ...studentPayload, programme: programme || null })
        .select('*')
        .maybeSingle();

      if (insertErr && insertErr.message?.includes('programme')) {
        const retry = await db
          .from('students')
          .insert(studentPayload)
          .select('*')
          .maybeSingle();
        insertErr = retry.error;
        created = retry.data;
      }
      if (insertErr) throw insertErr;
      studentRecord = created;
    }

    // Auto-allocate matching level curriculum modules
    try {
      const { data: matchingModules } = await db
        .from('modules')
        .select('id')
        .or(`level.eq.${cleanLevel},level.is.null`);

      if (matchingModules?.length) {
        const enrollments = matchingModules.map(m => ({
          student_id: studentRecord.id,
          module_id: m.id
        }));
        await db.from('student_modules').upsert(enrollments, {
          onConflict: 'student_id,module_id',
          ignoreDuplicates: true
        });
      }
    } catch (modErr) {
      console.warn('Curriculum auto-enrollment notice:', modErr.message);
    }

    // Prepare Monime payment checkout (SLE 100 per module)
    const modulesCount = Array.isArray(req.body.modules) && req.body.modules.length ? req.body.modules.length : (req.body.modulesCount || 8);
    const amount = registrationFee(cleanType, modulesCount);
    const reference = `REG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const successRedirect = returnUrl || `${req.protocol}://${req.get('host')}/payment-success`;
    const cancelRedirect = cancelUrl || `${req.protocol}://${req.get('host')}/payment-cancelled`;

    const pendingPayment = await recordPayment(db, {
      student_id: studentRecord.id,
      amount,
      currency: 'SLE',
      payment_type: cleanType === 'dissertation' ? 'dissertation' : 'registration',
      status: 'pending',
      provider: 'monime',
      reference
    });

    let checkout;
    const isPlaceholderSecret = !process.env.MONIME_SECRET_KEY || process.env.MONIME_SECRET_KEY.includes('replace_with_');
    if (isPlaceholderSecret) {
      // Development simulated checkout mode
      const simSessionId = `chk_sim_${Date.now()}`;
      checkout = {
        id: simSessionId,
        redirectUrl: `${successRedirect}?session_id=${simSessionId}&student_id=${cleanStudentId}`
      };
    } else {
      checkout = await createCheckout({
        reference,
        studentId: cleanStudentId,
        amount,
        currency: 'SLE',
        returnUrl: `${successRedirect}?session_id=${reference}&student_id=${cleanStudentId}`,
        cancelUrl: cancelRedirect,
        registrationType: cleanType,
        phone: studentRecord.phone,
        provider: 'monime',
        modulesCount
      });
    }

    // Update payment with checkout session ID
    await markPaymentPaid(db, pendingPayment.id, {
      provider_reference: checkout.id,
      checkout_session_id: checkout.id,
      status: 'pending'
    });

    res.json({
      ok: true,
      studentId: cleanStudentId,
      email: cleanEmail,
      amount,
      currency: 'SLE',
      checkoutUrl: checkout.redirectUrl || checkout.url
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

router.post('/modules', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { studentId, moduleCodes = [] } = req.body;
    if (!studentId || !Array.isArray(moduleCodes) || !moduleCodes.length) {
      return res.status(400).json({ error: 'Student ID and at least one module are required.' });
    }
    const db = getAdminSupabase();
    const { data: student, error: studentError } = await db
      .from('students')
      .select('id, auth_user_id, student_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student || student.auth_user_id !== user.id) {
      return res.status(403).json({ error: 'Student profile does not belong to this account.' });
    }

    const { data: mods, error: modsError } = await db.from('modules').select('id, code').in('code', moduleCodes);
    if (modsError) throw modsError;
    if ((mods || []).length !== moduleCodes.length) {
      return res.status(400).json({ error: 'One or more selected modules could not be found.' });
    }

    const rows = mods.map(m => ({ student_id: student.id, module_id: m.id }));
    const { error } = await db.from('student_modules').upsert(rows, { onConflict: 'student_id,module_id', ignoreDuplicates: true });
    if (error) throw error;
    res.json({ ok: true, modules: mods.map(m => m.code) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

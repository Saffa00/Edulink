import { getAdminSupabase } from './supabase.js';
import { sendPaymentReceiptEmail } from './emailService.js';

export async function sendStudentCredentialsEmail({ email, fullName, studentId, temporaryPassword, amount = '100' }) {
  const loginUrl = process.env.CLIENT_URL || 'https://edulink.vercel.app';
  
  console.log('------------------------------------------------------------');
  console.log(`[EMAIL DISPATCH] Student Credentials Notification`);
  console.log(`To: ${fullName} <${email}>`);
  console.log(`Student ID: ${studentId}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log(`Portal Login URL: ${loginUrl}`);
  console.log('------------------------------------------------------------');

  let resendResult = null;
  // 1. Dispatch real email via Resend
  try {
    resendResult = await sendPaymentReceiptEmail({
      to: email,
      studentName: fullName,
      studentId,
      amount,
      temporaryPassword,
      transactionRef: `REG-${studentId}-${Date.now().toString().slice(-4)}`
    });
    console.log('[EMAIL] Successfully dispatched credentials email via Resend:', resendResult?.id);
  } catch (resendErr) {
    console.warn('[EMAIL] Resend delivery notice (check verified domain / sandbox recipient):', resendErr.message);
  }

  // 2. Also generate magiclink token in Supabase if supported
  try {
    const db = getAdminSupabase();
    if (db?.auth?.admin?.generateLink) {
      await db.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          data: { student_id: studentId, full_name: fullName }
        }
      }).catch(err => {
        console.warn('[EMAIL] Supabase magiclink notice:', err.message);
      });
    }
  } catch (err) {
    console.warn('[EMAIL] Supabase admin link notice:', err.message);
  }

  return { sent: true, resend: resendResult };
}


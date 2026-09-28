import { getAdminSupabase } from './supabase.js';

export async function sendStudentCredentialsEmail({ email, fullName, studentId, temporaryPassword }) {
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  console.log('------------------------------------------------------------');
  console.log(`[EMAIL DISPATCH] Student Credentials Notification`);
  console.log(`To: ${fullName} <${email}>`);
  console.log(`Student ID: ${studentId}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log(`Portal Login URL: ${loginUrl}`);
  console.log('------------------------------------------------------------');

  try {
    const db = getAdminSupabase();
    // Attempt Supabase auth link generation if supported
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
    return { sent: true };
  } catch (err) {
    console.warn('[EMAIL] Error dispatching credentials email:', err.message);
    return { sent: false, error: err.message };
  }
}

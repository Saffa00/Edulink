/**
 * Resend Email Service for EduLink
 * High-deliverability transactional email delivery for payments, grade notices, and alerts.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'EduLink Academic Portal <onboarding@resend.dev>';

/**
 * Base method to dispatch an email via Resend REST API
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Recipient email address (to) is required.');
  if (!subject) throw new Error('Email subject is required.');

  const recipientList = Array.isArray(to) ? to : [to];

  // Graceful development/test fallback if API key is not yet set
  if (!RESEND_API_KEY) {
    console.info(`[Resend Mock Email] Would dispatch to: ${recipientList.join(', ')} | Subject: "${subject}"`);
    return { id: `mock-${Date.now()}`, mock: true, recipient: recipientList };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: recipientList,
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Resend Error Response]:', data);
      throw new Error(data.message || 'Failed to dispatch email via Resend.');
    }

    return data;
  } catch (error) {
    console.error('[Resend Service Error]:', error.message);
    throw error;
  }
}

/**
 * Sends official Monime payment receipt email to students upon registration
 */
export async function sendPaymentReceiptEmail({ to, studentName, studentId, amount, transactionRef, temporaryPassword }) {
  const subject = `Payment Confirmation & Account Details — EduLink (${studentId})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0a2540; color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0 0 8px; font-size: 22px; font-weight: 800; }
        .header p { margin: 0; font-size: 13px; color: #cbd5e1; }
        .content { padding: 30px 24px; }
        .card { background: #f1f5f9; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .row:last-child { border-bottom: none; }
        .row span { color: #64748b; }
        .row strong { color: #0f172a; }
        .badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EduLink Academic Portal</h1>
          <p>Registration Payment Confirmation</p>
        </div>
        <div class="content">
          <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
          <p>Thank you for completing your academic registration payment via Monime. Your transaction has been confirmed and your student account is now <strong>active</strong>.</p>
          
          <div class="card">
            <div class="row">
              <span>Status</span>
              <strong class="badge">PAID & ACTIVE</strong>
            </div>
            <div class="row">
              <span>Student ID</span>
              <strong>${studentId}</strong>
            </div>
            <div class="row">
              <span>Amount Paid</span>
              <strong>SLE ${amount || '100'}</strong>
            </div>
            <div class="row">
              <span>Transaction Ref</span>
              <strong>${transactionRef || 'MONIME-' + Date.now()}</strong>
            </div>
            ${temporaryPassword ? `
            <div class="row">
              <span>Temporary Password</span>
              <strong style="font-family: monospace; color: #0a2540;">${temporaryPassword}</strong>
            </div>
            ` : ''}
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            You can now log in to the EduLink mobile app with your Student ID (<strong>${studentId}</strong>) and password. Your first device will be automatically bound for secure access.
          </p>
        </div>
        <div class="footer">
          EduLink University Academic Management • Goderich • Congo Cross • Brookfields
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Dear ${studentName}, your payment of SLE ${amount} for Student ID ${studentId} was successful (Ref: ${transactionRef}). You may now sign in to EduLink.`
  });
}

/**
 * Sends grade publication alert email to student
 */
export async function sendGradeAlertEmail({ to, studentName, moduleCode, moduleTitle, grade, score }) {
  const subject = `New Grade Released: ${moduleCode} — EduLink`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; }
        .title { color: #0a2540; font-size: 20px; font-weight: 800; margin: 0 0 10px; }
        .grade-box { background: #eaf1f8; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .grade { font-size: 38px; font-weight: 900; color: #0a2540; margin: 0; }
        .module { font-size: 14px; font-weight: 600; color: #475569; margin: 4px 0 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="title">Grade Published</h2>
        <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
        <p>Your lecturer has published the official grade for <strong>${moduleCode}</strong> (${moduleTitle || ''}):</p>
        
        <div class="grade-box">
          <div class="grade">${grade}</div>
          <div class="module">${moduleCode} — Score: ${score || '-'}%</div>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          Open the EduLink app to view your full academic breakdown and coursework marks.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Your grade for ${moduleCode} has been published: Grade ${grade} (${score}%). Log in to EduLink to view your full transcript.`
  });
}

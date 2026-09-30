import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';

export async function requestPasswordRecovery(identifier, role = 'student') {
  if (!identifier || !identifier.trim()) {
    throw new Error('Please enter your Student ID, Lecturer ID, or registered email address.');
  }

  const cleanInput = identifier.trim();
  let targetEmail = cleanInput;
  let resolvedName = '';
  let resolvedRole = role;

  // If user entered an ID (e.g. 8100, LECT-2026-...) rather than an email
  if (!cleanInput.includes('@')) {
    let found = null;
    const isLecturerPrefix = cleanInput.toUpperCase().startsWith('LECT');

    if (role === 'lecturer' || isLecturerPrefix) {
      const { data: lec } = await supabase
        .from('lecturers')
        .select('id, email, full_name, lecturer_id')
        .eq('lecturer_id', cleanInput)
        .maybeSingle();

      if (lec?.email) {
        found = lec;
        resolvedRole = 'lecturer';
      }
    }

    if (!found) {
      const { data: stu } = await supabase
        .from('students')
        .select('id, email, full_name, student_id')
        .eq('student_id', cleanInput)
        .maybeSingle();

      if (stu?.email) {
        found = stu;
        resolvedRole = 'student';
      }
    }

    // Secondary fallback: if not found, check lecturers table
    if (!found && role !== 'lecturer' && !isLecturerPrefix) {
      const { data: lec } = await supabase
        .from('lecturers')
        .select('id, email, full_name, lecturer_id')
        .eq('lecturer_id', cleanInput)
        .maybeSingle();

      if (lec?.email) {
        found = lec;
        resolvedRole = 'lecturer';
      }
    }

    if (!found || !found.email) {
      throw new Error(`No account found matching ID "${cleanInput}". Please double-check your ID or enter your registered email address.`);
    }

    targetEmail = found.email.trim();
    resolvedName = found.full_name || '';
  }

  // Create masked email for user reassurance, e.g. "s***a@gmail.com"
  let maskedEmail = targetEmail;
  const atIdx = targetEmail.indexOf('@');
  if (atIdx > 0) {
    const userPart = targetEmail.slice(0, atIdx);
    const domainPart = targetEmail.slice(atIdx + 1);
    if (userPart.length <= 2) {
      maskedEmail = `${userPart[0]}***@${domainPart}`;
    } else {
      maskedEmail = `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`;
    }
  }

  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });

  if (error) {
    if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
      throw new Error('Too many password reset requests. Please wait a few moments before trying again.');
    }
    throw error;
  }

  return {
    sent: true,
    email: targetEmail,
    maskedEmail,
    fullName: resolvedName,
    role: resolvedRole
  };
}

export async function updateRecoveredPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      requires_password_change: false,
      temporary_password: false
    }
  });

  if (error) throw error;

  // Clear requires_password_change in student/lecturer records if applicable
  if (data?.user?.id) {
    try {
      await Promise.allSettled([
        supabase.from('students').update({ requires_password_change: false }).eq('auth_user_id', data.user.id),
        supabase.from('lecturers').update({ requires_password_change: false }).eq('auth_user_id', data.user.id)
      ]);
    } catch (e) {
      // Non-blocking
    }
  }

  return { updated: true, user: data?.user };
}

export async function requestDeviceRecovery(role) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before requesting device recovery.');

  try {
    const response = await fetch(apiUrl('/api/recovery/device/request'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ role })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not start device recovery.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function verifyDeviceRecovery({ role, token, newDeviceCredential, deviceName }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before verifying device recovery.');

  try {
    const response = await fetch(apiUrl('/api/recovery/device/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ role, token, newDeviceCredential, deviceName })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Device recovery verification failed.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function requestRecoveryById({ role, id, email }) {
  try {
    const response = await fetch(apiUrl('/api/recovery/device/request-by-id'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, id, email })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'If the account details are valid, recovery instructions will be sent.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery service temporarily unreachable. Please try again in a moment.');
    }
    throw err;
  }
}

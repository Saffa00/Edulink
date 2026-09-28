import { createClient } from '@supabase/supabase-js';

let client;

export function getAdminSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return client;
}

export async function getAuthenticatedUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    throw new Error('Missing Bearer access token.');
  }

  const token = auth.slice(7).trim();
  if (!token) throw new Error('Missing access token.');

  const { data, error } = await getAdminSupabase().auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Invalid or expired access token.');
  }

  return data.user;
}

export function getUserSupabase(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

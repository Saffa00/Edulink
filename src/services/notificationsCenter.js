import { supabase } from './supabase';

export async function getMyNotificationCenter({unreadOnly=false}={}) {
  let q = supabase.from('notifications').select('id,title,body,read_at,created_at,notification_type,source_key').order('created_at',{ascending:false});
  if (unreadOnly) q = q.is('read_at', null);
  const {data,error}=await q;
  if(error) throw error;
  return data || [];
}

export async function markAllNotificationsRead() {
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('You must be signed in.');
  const {data,error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_user_id',user.id).is('read_at',null).select('id');
  if(error) throw error;
  return data || [];
}

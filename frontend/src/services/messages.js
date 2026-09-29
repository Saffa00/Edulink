import { supabase } from './supabase';

export async function getMyConversations(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('You must be signed in.');
  const {data,error}=await supabase.from('conversations')
    .select('id,module_id,student_id,lecturer_id,last_message_at,modules(code,title),students(student_id,full_name),lecturers(lecturer_id,full_name)')
    .or(`student_user_id.eq.${user.id},lecturer_user_id.eq.${user.id}`)
    .order('last_message_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function getConversationMessages(conversationId){
  const {data,error}=await supabase.from('messages')
    .select('id,conversation_id,sender_user_id,body,created_at,read_at')
    .eq('conversation_id',conversationId)
    .order('created_at',{ascending:true});
  if(error) throw error;
  return data||[];
}

export async function sendMessage({conversationId,body}){
  const clean=String(body||'').trim();
  if(!clean) throw new Error('Message cannot be empty.');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('You must be signed in.');
  const {data,error}=await supabase.from('messages')
    .insert({conversation_id:conversationId,sender_user_id:user.id,body:clean})
    .select('id,conversation_id,sender_user_id,body,created_at,read_at')
    .single();
  if(error) throw error;
  await supabase.from('conversations').update({last_message_at:new Date().toISOString()}).eq('id',conversationId);
  return data;
}

export async function markConversationRead(conversationId){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('You must be signed in.');
  const {data,error}=await supabase.from('messages')
    .update({read_at:new Date().toISOString()})
    .eq('conversation_id',conversationId)
    .neq('sender_user_id',user.id)
    .is('read_at',null)
    .select('id');
  if(error) throw error;
  return data||[];
}


async function notifyMessageRecipient({ conversationId, senderUserId, body }) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, module_id, student_user_id, lecturer_user_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) return

  const recipientUserId =
    conversation.student_user_id === senderUserId
      ? conversation.lecturer_user_id
      : conversation.student_user_id

  if (!recipientUserId) return

  const preview = String(body || '').trim().slice(0, 120)
  await supabase.from('notifications').insert({
    recipient_user_id: recipientUserId,
    title: 'New message',
    body: preview ? `You have a new message: ${preview}` : 'You have a new message.',
    notification_type: 'message',
    source_key: `message:${conversationId}:${Date.now()}`,
  })
}

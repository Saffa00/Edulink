import { supabase } from './supabase'

export async function markConversationRead(conversationId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !conversationId) return

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_user_id', user.id)
    .is('read_at', null)

  if (error) throw error
}

export async function getConversationUnreadCount(conversationId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !conversationId) return 0

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_user_id', user.id)
    .is('read_at', null)

  if (error) throw error
  return count || 0
}

export async function getMyUnreadMessageCount() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_user_id', user.id)
    .is('read_at', null)

  if (error) throw error
  return count || 0
}

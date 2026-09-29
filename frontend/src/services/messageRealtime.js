import { supabase } from './supabase'

export function subscribeToConversation(conversationId, onMessage) {
  if (!conversationId) return null

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage?.(payload.new)
    )
    .subscribe()

  return channel
}

export async function unsubscribeFromConversation(channel) {
  if (channel) await supabase.removeChannel(channel)
}

export function subscribeToMyMessages(userId, onMessage) {
  if (!userId) return null

  const channel = supabase
    .channel(`my-messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_user_id=neq.${userId}`,
      },
      (payload) => onMessage?.(payload.new)
    )
    .subscribe()

  return channel
}

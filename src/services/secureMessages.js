import { supabase } from './supabase'

export async function sendSecureMessage({ conversationId, body }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('You must be signed in.')
  }

  const response = await fetch('/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ conversationId, body })
  })

  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to send message.')
  return result.message
}

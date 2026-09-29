import { supabase } from './supabase'

async function accessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in.')
  return session.access_token
}

export async function createModuleConversation(moduleId) {
  const token = await accessToken()
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ moduleId })
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to create conversation.')
  return result.conversation
}

export async function getStudentConversationsSecure() {
  const token = await accessToken()
  const response = await fetch('/api/conversations/student', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load conversations.')
  return result.conversations || []
}

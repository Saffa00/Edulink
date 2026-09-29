import { supabase } from './supabase'

async function token() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in.')
  return session.access_token
}

export async function createConversationFromModule(moduleId) {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await token()}`
    },
    body: JSON.stringify({ moduleId })
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to start conversation.')
  return result.conversation
}

export async function getStudentConversationCenter() {
  const response = await fetch('/api/conversations/student', {
    headers: { Authorization: `Bearer ${await token()}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load conversations.')
  return result.conversations || []
}

export async function getLecturerConversationCenter() {
  const response = await fetch('/api/conversations/lecturer', {
    headers: { Authorization: `Bearer ${await token()}` }
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load conversations.')
  return result.conversations || []
}

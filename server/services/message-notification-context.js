const { createClient } = require('@supabase/supabase-js')

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function getMessageNotificationContext(conversationId, senderUserId) {
  const supabase = adminClient()

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      id,
      student_user_id,
      lecturer_user_id,
      module_id,
      modules(code,title),
      students(student_id,full_name),
      lecturers(lecturer_id,full_name)
    `)
    .eq('id', conversationId)
    .single()

  if (error) throw error
  if (!conversation) throw new Error('Conversation not found.')

  const recipientUserId =
    conversation.student_user_id === senderUserId
      ? conversation.lecturer_user_id
      : conversation.student_user_id

  const senderName =
    conversation.student_user_id === senderUserId
      ? conversation.students?.full_name
      : conversation.lecturers?.full_name

  const moduleLabel = conversation.modules
    ? `${conversation.modules.code || ''} ${conversation.modules.title || ''}`.trim()
    : ''

  return {
    recipientUserId,
    senderName,
    moduleLabel
  }
}

module.exports = { getMessageNotificationContext }

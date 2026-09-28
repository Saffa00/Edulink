const { createClient } = require('@supabase/supabase-js')

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function getUser(req) {
  const auth = String(req.headers.authorization || '')
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await client.auth.getUser(token)
  return error || !data.user ? null : data.user
}

async function createConversation({ req, moduleId }) {
  const user = await getUser(req)
  if (!user) return { status: 401, error: 'Authentication required.' }
  if (!moduleId) return { status: 400, error: 'Module is required.' }

  const admin = adminClient()
  const { data: module, error: moduleError } = await admin
    .from('modules')
    .select('id,lecturer_id,active')
    .eq('id', moduleId)
    .single()

  if (moduleError || !module || !module.active) {
    return { status: 404, error: 'Active module not found.' }
  }

  const { data: lecturer } = await admin
    .from('lecturers')
    .select('id,auth_user_id,active,full_name')
    .eq('id', module.lecturer_id)
    .single()

  if (!lecturer || !lecturer.active || !lecturer.auth_user_id) {
    return { status: 409, error: 'This module has no active lecturer.' }
  }

  const { data: student } = await admin
    .from('students')
    .select('id,auth_user_id,account_status,student_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!student || student.account_status !== 'active') {
    return { status: 403, error: 'Only active students can start module conversations.' }
  }

  const { data: registration } = await admin
    .from('student_modules')
    .select('id')
    .eq('student_id', student.id)
    .eq('module_id', module.id)
    .maybeSingle()

  if (!registration) {
    return { status: 403, error: 'You are not registered for this module.' }
  }

  const { data: existing } = await admin
    .from('conversations')
    .select('*')
    .eq('module_id', module.id)
    .eq('student_id', student.id)
    .eq('lecturer_id', lecturer.id)
    .maybeSingle()

  if (existing) return { status: 200, data: existing }

  const { data: conversation, error } = await admin
    .from('conversations')
    .insert({
      module_id: module.id,
      student_id: student.id,
      lecturer_id: lecturer.id,
      student_user_id: student.auth_user_id,
      lecturer_user_id: lecturer.auth_user_id,
      last_message_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) return { status: 400, error: error.message }
  return { status: 201, data: conversation }
}

async function getStudentConversations({ req }) {
  const user = await getUser(req)
  if (!user) return { status: 401, error: 'Authentication required.' }

  const admin = adminClient()
  const { data: student } = await admin
    .from('students')
    .select('id,account_status')
    .eq('auth_user_id', user.id)
    .single()

  if (!student || student.account_status !== 'active') {
    return { status: 403, error: 'Active student account required.' }
  }

  const { data, error } = await admin
    .from('conversations')
    .select('*, modules(id,code,title), lecturers(id,lecturer_id,full_name)')
    .eq('student_id', student.id)
    .order('last_message_at', { ascending: false })

  if (error) return { status: 400, error: error.message }
  return { status: 200, data }
}

async function getLecturerConversations({ req }) {
  const user = await getUser(req)
  if (!user) return { status: 401, error: 'Authentication required.' }

  const admin = adminClient()
  const { data: lecturer } = await admin
    .from('lecturers')
    .select('id,active')
    .eq('auth_user_id', user.id)
    .single()

  if (!lecturer || lecturer.active !== true) {
    return { status: 403, error: 'Active lecturer account required.' }
  }

  const { data, error } = await admin
    .from('conversations')
    .select('*, modules(id,code,title), students(id,student_id,full_name,email)')
    .eq('lecturer_id', lecturer.id)
    .order('last_message_at', { ascending: false })

  if (error) return { status: 400, error: error.message }
  return { status: 200, data }
}

module.exports = {
  createConversation,
  getStudentConversations,
  getLecturerConversations
}

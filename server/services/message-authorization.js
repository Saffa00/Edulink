async function authorizeConversation({ admin, userId, conversation }) {
  const isStudent = conversation.student_user_id === userId
  const isLecturer = conversation.lecturer_user_id === userId

  if (!isStudent && !isLecturer) {
    return { allowed: false, reason: 'You are not a participant in this conversation.' }
  }

  if (isStudent) {
    const { data: student } = await admin
      .from('students')
      .select('id,account_status')
      .eq('auth_user_id', userId)
      .single()

    if (!student || student.account_status !== 'active') {
      return { allowed: false, reason: 'Student account is not active.' }
    }

    const { data: registration } = await admin
      .from('student_modules')
      .select('id')
      .eq('student_id', conversation.student_id)
      .eq('module_id', conversation.module_id)
      .maybeSingle()

    if (!registration) {
      return { allowed: false, reason: 'Student is not registered for this module.' }
    }
  }

  if (isLecturer) {
    const { data: lecturer } = await admin
      .from('lecturers')
      .select('id,active')
      .eq('auth_user_id', userId)
      .single()

    if (!lecturer || lecturer.active !== true) {
      return { allowed: false, reason: 'Lecturer account is not active.' }
    }

    const { data: module } = await admin
      .from('modules')
      .select('id,lecturer_id,active')
      .eq('id', conversation.module_id)
      .single()

    if (!module || module.active !== true || module.lecturer_id !== lecturer.id) {
      return { allowed: false, reason: 'Lecturer is not assigned to this module.' }
    }
  }

  return { allowed: true }
}

module.exports = { authorizeConversation }

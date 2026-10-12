import { supabase } from './supabase'

export async function getMyAccountProfile(role) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const table = role === 'lecturer' ? 'lecturers' : 'students'
  let { data } = await supabase
    .from(table)
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!data && user.email) {
    const resEmail = await supabase
      .from(table)
      .select('*')
      .eq('email', user.email)
      .maybeSingle()
    if (resEmail.data) {
      data = resEmail.data
      if (!data.auth_user_id) {
        supabase.from(table).update({ auth_user_id: user.id }).eq('id', data.id).then(null, () => {})
      }
    }
  }

  return data
}

export async function updateMyProfile(role, changes) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const table = role === 'lecturer' ? 'lecturers' : 'students'
  const allowed = ['full_name','phone','photo_url']
  const payload = Object.fromEntries(Object.entries(changes).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('auth_user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function changePassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must contain at least 8 characters.')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

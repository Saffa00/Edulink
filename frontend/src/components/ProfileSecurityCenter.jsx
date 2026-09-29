import React, { useEffect, useState } from 'react'
import { getMyAccountProfile, updateMyProfile, changePassword } from '../services/profileSecurity'
import { supabase } from '../services/supabase'

export default function ProfileSecurityCenter({ role }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ full_name:'', phone:'', photo_url:'' })
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await getMyAccountProfile(role)
      setProfile(data)
      setForm({full_name:data.full_name||'', phone:data.phone||'', photo_url:data.photo_url||''})
    } catch (e) { setError(e.message) }
  }

  useEffect(() => { load() }, [role])

  async function saveProfile(e) {
    e.preventDefault(); setMessage(''); setError('')
    try {
      const data = await updateMyProfile(role, form)
      setProfile(data); setMessage('Profile updated successfully.')
    } catch (e) { setError(e.message) }
  }

  async function savePassword(e) {
    e.preventDefault(); setMessage(''); setError('')
    try {
      await changePassword(password)
      setPassword('')
      setMessage('Password changed successfully.')
    } catch (e) { setError(e.message) }
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!profile && !error) return <p>Loading security center…</p>

  return (
    <section>
      <h2>Profile & Security</h2>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {profile && (
        <>
          <p><strong>{role === 'lecturer' ? 'Lecturer ID' : 'Student ID'}:</strong> {role === 'lecturer' ? profile.lecturer_id : profile.student_id}</p>
          <p><strong>Email:</strong> {profile.email}</p>

          <form onSubmit={saveProfile}>
            <h3>Personal Information</h3>
            <input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Full name" />
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone" />
            <input value={form.photo_url} onChange={e=>setForm({...form,photo_url:e.target.value})} placeholder="Profile photo URL" />
            <button type="submit">Save Profile</button>
          </form>

          <form onSubmit={savePassword}>
            <h3>Change Password</h3>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" minLength={8} />
            <button type="submit">Change Password</button>
          </form>

          <button type="button" onClick={logout}>Secure Logout</button>
        </>
      )}
    </section>
  )
}

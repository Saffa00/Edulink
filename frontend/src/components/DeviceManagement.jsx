import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export default function DeviceManagement({ role }) {
  const [devices,setDevices]=useState([])
  const [error,setError]=useState('')

  async function load() {
    try {
      const { data:{user} } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be signed in.')
      const column = role === 'lecturer' ? 'lecturer_id' : 'student_id'
      const table = role === 'lecturer' ? 'lecturers' : 'students'
      const {data:profile,error:pErr}=await supabase.from(table).select(`id,${column}`).eq('auth_user_id',user.id).single()
      if(pErr) throw pErr
      const {data,error:dErr}=await supabase.from('devices').select('*').eq(column,profile.id).order('last_seen_at',{ascending:false})
      if(dErr) throw dErr
      setDevices(data||[])
    } catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[role])

  async function revoke(id) {
    try {
      const {error}=await supabase.from('devices').update({revoked_at:new Date().toISOString()}).eq('id',id)
      if(error) throw error
      await load()
    } catch(e){setError(e.message)}
  }

  return <section>
    <h3>Registered Devices</h3>
    {error && <p role="alert">{error}</p>}
    {!devices.length && <p>No registered devices found.</p>}
    {devices.map(d=><div key={d.id}>
      <strong>{d.device_label || 'Registered device'}</strong>
      <small> Last seen: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'Never'}</small>
      {d.revoked_at ? <span> Revoked</span> : <button onClick={()=>revoke(d.id)}>Revoke</button>}
    </div>)}
  </section>
}

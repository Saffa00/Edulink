import React, {useEffect,useState} from 'react'
import { supabase } from '../services/supabase'

export default function LoginHistory({role}) {
  const [rows,setRows]=useState([]),[error,setError]=useState('')
  useEffect(()=>{(async()=>{
    try {
      const {data:{session}}=await supabase.auth.getSession()
      const res=await fetch(`/api/login-history?role=${role}`,{headers:{Authorization:`Bearer ${session?.access_token||''}`}})
      const json=await res.json()
      if(!res.ok) throw new Error(json.error||'Could not load login history.')
      setRows(json.rows||json||[])
    } catch(e){setError(e.message)}
  })()},[role])
  return <section><h3>Login History</h3>{error&&<p role="alert">{error}</p>}
    {rows.map((r,i)=><div key={r.id||i}><strong>{r.success?'Successful':'Failed'}</strong> · {r.event_type} · {r.created_at?new Date(r.created_at).toLocaleString():''} · {r.ip||'IP unavailable'}</div>)}
  </section>
}

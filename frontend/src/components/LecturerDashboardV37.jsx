import React, { useEffect, useState } from 'react'
import { getLecturerDashboardSummary } from '../services/lecturerDashboard'
import { getTimeBasedGreeting } from '../utils/greeting'

export default function LecturerDashboardV37({onNavigate}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){
    try{setData(await getLecturerDashboardSummary())}
    catch(e){setError(e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[])
  if(loading)return <main><p>Loading lecturer dashboard…</p></main>
  if(error)return <main><p role="alert">{error}</p></main>

  const activeModules=data.modules.filter(m=>m.active).length
  const today=new Date().toISOString().slice(0,10)
  const todayClasses=data.classes.filter(c=>c.class_date===today)

  return <main className="lecturer-dashboard-v37">
    <header className="lecturer-hero">
      <p>{getTimeBasedGreeting(data.lecturer.full_name || 'Moses Saffa')}</p>
      <h1>{data.lecturer.full_name}</h1>
      <span>{data.lecturer.lecturer_id} · {data.lecturer.department || data.lecturer.teaching_area || 'Lecturer'}</span>
    </header>

    <section className="lecturer-stats">
      <article><strong>{activeModules}</strong><span>Active Modules</span></article>
      <article><strong>{todayClasses.length}</strong><span>Today's Classes</span></article>
      <article><strong>{data.assignments.length}</strong><span>Assignments</span></article>
      <article><strong>{data.classes.length}</strong><span>Scheduled Classes</span></article>
    </section>

    <section>
      <div className="section-heading"><h2>My Modules</h2><button onClick={()=>onNavigate?.('modules')}>Manage</button></div>
      <div className="lecturer-module-grid">
        {data.modules.slice(0,6).map(m=><article key={m.id}>
          <strong>{m.code}</strong><h3>{m.title}</h3>
          <small>Level {m.level || '—'} · Semester {m.semester || '—'}</small>
          <div className="module-actions">
            <button onClick={()=>onNavigate?.('students',m.id)}>Students</button>
            <button onClick={()=>onNavigate?.('grades',m.id)}>Grades</button>
            <button onClick={()=>onNavigate?.('messages',m.id)}>Messages</button>
          </div>
        </article>)}
      </div>
    </section>

    <section>
      <div className="section-heading"><h2>Today's Classes</h2><button onClick={()=>onNavigate?.('attendance')}>Attendance</button></div>
      {todayClasses.length ? todayClasses.map(c=><article className="lecturer-list-card" key={c.id}>
        <div><strong>{c.modules?.code} · {c.modules?.title}</strong><span>{c.start_time}–{c.end_time} · {c.location_name || 'Campus'}</span></div>
        <button onClick={()=>onNavigate?.('open-attendance',c.id)}>Open Attendance</button>
      </article>) : <p>No classes scheduled for today.</p>}
    </section>

    <section>
      <div className="section-heading"><h2>Assignments</h2><button onClick={()=>onNavigate?.('assignments')}>Manage</button></div>
      {data.assignments.slice(0,5).map(a=><article className="lecturer-list-card" key={a.id}>
        <div><strong>{a.modules?.code} · {a.title}</strong><span>Due {new Date(a.due_at).toLocaleString()}</span></div>
        <button onClick={()=>onNavigate?.('submissions',a.id)}>Submissions</button>
      </article>)}
      {!data.assignments.length && <p>No assignments yet.</p>}
    </section>
  </main>
}

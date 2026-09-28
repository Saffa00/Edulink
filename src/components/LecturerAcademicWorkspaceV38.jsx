import React,{useEffect,useMemo,useState} from 'react'
import {getLecturerWorkspace} from '../services/lecturerWorkspace'

export default function LecturerAcademicWorkspaceV38({moduleId,onNavigate}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [tab,setTab]=useState('overview')
  async function load(){try{setData(await getLecturerWorkspace(moduleId))}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[moduleId])
  if(loading)return <main><p>Loading academic workspace…</p></main>
  if(error)return <main><p role="alert">{error}</p></main>
  if(!data.selectedModule)return <main><h2>No module selected</h2><p>Create or select a module to manage academic activities.</p><button onClick={()=>onNavigate?.('modules')}>Manage Modules</button></main>

  const present=data.attendance.filter(a=>a.status==='present').length
  const late=data.attendance.filter(a=>a.status==='late').length
  const published=data.grades.filter(g=>g.published).length
  const missing=data.students.length-published
  const byAssignment=useMemo(()=>data.assignments.map(a=>({...a,count:data.submissions.filter(s=>s.assignment_id===a.id).length})),[data])

  return <main className="workspace-v38">
    <header className="workspace-header">
      <div><p>{data.selectedModule.code}</p><h1>{data.selectedModule.title}</h1><span>{data.students.length} registered students</span></div>
      <button onClick={()=>onNavigate?.('modules')}>Change Module</button>
    </header>

    <nav className="workspace-tabs">
      {['overview','students','attendance','assignments','grades'].map(x=>
        <button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}
    </nav>

    {tab==='overview'&&<section className="workspace-grid">
      <article><strong>{data.students.length}</strong><span>Registered Students</span></article>
      <article><strong>{present}</strong><span>Present Records</span></article>
      <article><strong>{late}</strong><span>Late Records</span></article>
      <article><strong>{published}</strong><span>Published Grades</span></article>
      <article><strong>{missing}</strong><span>Grades Pending</span></article>
      <article><strong>{data.submissions.length}</strong><span>Submissions</span></article>
      <div className="quick-actions">
        <button onClick={()=>setTab('students')}>👥 Student Roster</button>
        <button onClick={()=>setTab('attendance')}>📍 Attendance Register</button>
        <button onClick={()=>setTab('assignments')}>📝 Mark Submissions</button>
        <button onClick={()=>setTab('grades')}>🎓 Manage Individual Grades</button>
        <button onClick={()=>onNavigate?.('messages',data.selectedModule.id)}>💬 Module Messages</button>
        <button onClick={()=>onNavigate?.('dissertation')}>📖 Dissertation</button>
      </div>
    </section>}

    {tab==='students'&&<section><h2>Student Roster</h2><div className="table-list">
      {data.students.map(s=><article key={s.id}><strong>{s.student_id}</strong><span>{s.full_name}</span><small>{s.email} · {s.programme||'Programme not set'}</small></article>)}
      {!data.students.length&&<p>No registered students.</p>}
    </div></section>}

    {tab==='attendance'&&<section><h2>Attendance Register</h2>
      <div className="mini-stats"><span>Present: {present}</span><span>Late: {late}</span><span>Total records: {data.attendance.length}</span></div>
      <div className="table-list">{data.attendance.map(a=><article key={a.id}>
        <strong>{a.students?.student_id}</strong><span>{a.students?.full_name}</span><b>{a.status}</b><small>{new Date(a.marked_at).toLocaleString()} · {Math.round(a.distance_meters||0)}m</small>
      </article>)}</div>
      <button onClick={()=>onNavigate?.('attendance')}>Manage Classes & Attendance</button>
    </section>}

    {tab==='assignments'&&<section><h2>Assignments & Submissions</h2>
      {byAssignment.map(a=><article className="assignment-row" key={a.id}>
        <div><strong>{a.title}</strong><span>Due {new Date(a.due_at).toLocaleString()} · Max {a.max_mark}</span></div>
        <button onClick={()=>onNavigate?.('submissions',a.id)}>{a.count} submissions</button>
      </article>)}
      {!data.assignments.length&&<p>No assignments for this module.</p>}
    </section>}

    {tab==='grades'&&<section><h2>Individual Student Grades</h2>
      <p>Each registered Student ID has its own grade. GPA and CGPA are not calculated.</p>
      <div className="grade-list">{data.students.map(s=>{
        const g=data.grades.find(x=>x.student_id===s.id)
        return <article key={s.id}><strong>{s.student_id}</strong><span>{s.full_name}</span><b>{g?.score ?? 'Not entered'} {g?.grade?`(${g.grade})`:''}</b><small>{g?.published?'Published':'Not published'}</small></article>
      })}</div>
      <button onClick={()=>onNavigate?.('grades',data.selectedModule.id)}>Open Grade Publisher</button>
    </section>}
  </main>
}

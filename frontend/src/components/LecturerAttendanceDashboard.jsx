import React,{useEffect,useMemo,useState} from 'react';
import {getLecturerAttendance,attendanceStats} from '../services/lecturerAttendance';

export default function LecturerAttendanceDashboard(){
 const [data,setData]=useState({classes:[],attendance:[]}),[selected,setSelected]=useState(''),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{getLecturerAttendance().then(setData).catch(e=>setMsg(e.message)).finally(()=>setLoading(false))},[]);
 const cls=data.classes.find(x=>x.id===selected)||data.classes[0];
 const rows=useMemo(()=>cls?data.attendance.filter(x=>x.class_id===cls.id):[],[data,cls]);
 const stats=attendanceStats(rows);
 function exportCsv(){
  const head='Student ID,Full Name,Status,Marked At,Distance (m)\n';
  const body=rows.map(x=>[x.students?.student_id,x.students?.full_name,x.status,x.marked_at,Math.round(x.distance_meters||0)].map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([head+body],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`attendance-${cls?.modules?.code||'class'}-${cls?.class_date||''}.csv`;a.click();URL.revokeObjectURL(url);
 }
 if(loading)return <div className="v16-card">Loading lecturer attendance…</div>;
 return <div className="v16-wrap">
  <section className="v16-card"><h2>Attendance Dashboard</h2>{msg&&<div className="v16-msg">{msg}</div>}
   {!data.classes.length?<p>No classes scheduled yet.</p>:<select className="v16-select" value={cls?.id||''} onChange={e=>setSelected(e.target.value)}>
    {data.classes.map(c=><option key={c.id} value={c.id}>{c.modules?.code} — {c.class_date} · {c.start_time}–{c.end_time}</option>)}
   </select>}
  </section>
  {cls&&<><section className="v16-stats">
    <div><b>{stats.unique}</b><span>Marked</span></div><div><b>{stats.present}</b><span>Present</span></div><div><b>{stats.late}</b><span>Late</span></div><div><b>{stats.absent}</b><span>Not Marked</span></div>
   </section>
   <section className="v16-card"><div className="v16-heading"><div><h3>{cls.modules?.code} — {cls.modules?.title}</h3><p>{cls.class_date} · {cls.start_time}–{cls.end_time} · {cls.location_name}</p></div><button onClick={exportCsv}>Export CSV</button></div>
    {!rows.length?<p>No attendance has been recorded for this class.</p>:rows.map(r=><div className="v16-row" key={r.id}><div><b>{r.students?.student_id}</b> — {r.students?.full_name}<small>{r.students?.email||''}</small></div><span>{r.status}</span><span>{Math.round(r.distance_meters||0)}m</span><small>{new Date(r.marked_at).toLocaleTimeString()}</small></div>)}
   </section></>}
 </div>
}

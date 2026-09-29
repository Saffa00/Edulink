import React,{useEffect,useState}from'react';
import{getLecturerAssignments,createAssignment}from'../services/assignments';
export default function AssignmentManagement(){
 const[a,setA]=useState([]),[form,setForm]=useState({module_id:'',title:'',description:'',due_at:'',max_mark:100,attachment_url:''}),[msg,setMsg]=useState('');
 async function load(){try{setA(await getLecturerAssignments())}catch(e){setMsg(e.message)}} useEffect(()=>{load()},[]);
 async function save(e){e.preventDefault();try{await createAssignment({...form,max_mark:Number(form.max_mark)});setMsg('Assignment published.');setForm({module_id:'',title:'',description:'',due_at:'',max_mark:100,attachment_url:''});load()}catch(e){setMsg(e.message)}}
 const modules=[...new Map(a.map(x=>[x.modules?.id,x.modules]).filter(x=>x[0])).values()];
 return <div className="v17-wrap"><section className="v17-card"><h2>Create Assignment</h2>{msg&&<div className="v17-msg">{msg}</div>}<form className="v17-form" onSubmit={save}>
 <select required value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value})}><option value="">Select module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}</select>
 <input required placeholder="Assignment title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
 <textarea required placeholder="Description / instructions" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
 <input required type="datetime-local" value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}/>
 <input required type="number" min="1" placeholder="Maximum mark" value={form.max_mark} onChange={e=>setForm({...form,max_mark:e.target.value})}/>
 <input placeholder="Attachment URL (optional)" value={form.attachment_url} onChange={e=>setForm({...form,attachment_url:e.target.value})}/>
 <button>Publish Assignment</button></form></section><section className="v17-card"><h3>My Assignments</h3>{!a.length?<p>No assignments yet.</p>:a.map(x=><div className="v17-item" key={x.id}><b>{x.modules?.code} — {x.title}</b><span>Due: {new Date(x.due_at).toLocaleString()} · Max: {x.max_mark}</span><small>{x.description}</small></div>)}</section></div>
}

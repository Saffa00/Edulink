import React,{useEffect,useState}from'react';
import{getMyModules,getModuleStudents}from'../services/modules';
import{getLecturerGrades,saveGrade,publishGrade,letterGrade}from'../services/grades';

export default function GradeManagement(){
 const[mods,setMods]=useState([]),[mid,setMid]=useState(''),[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{getMyModules().then(setMods).catch(e=>setMsg(e.message))},[]);
 async function load(id){setMid(id);if(!id)return setRows([]);try{const [students,grades]=await Promise.all([getModuleStudents(id),getLecturerGrades(id)]);const map=new Map(grades.map(g=>[g.student_id,g]));setRows(students.map(s=>({...s,gradeRow:map.get(s.id)})))}catch(e){setMsg(e.message)}}
 function update(i,k,v){setRows(r=>r.map((x,n)=>n===i?{...x,[k]:v}:x))}
 async function save(i){const r=rows[i];try{const score=Number(r.score);if(score<0||score>100)throw new Error('Score must be between 0 and 100.');const g=await saveGrade({id:r.gradeRow?.id,moduleId:mid,studentId:r.id,score,grade:letterGrade(score),published:r.gradeRow?.published||false});update(i,'gradeRow',g);setMsg('Grade saved.')}catch(e){setMsg(e.message)}}
 async function pub(i){try{const g=await publishGrade(rows[i].gradeRow.id,true);update(i,'gradeRow',g);setMsg('Grade published to student.')}catch(e){setMsg(e.message)}}
 return <div className="v19-wrap"><section className="v19-card"><h2>Grade Management</h2>{msg&&<div className="v19-msg">{msg}</div>}<select value={mid} onChange={e=>load(e.target.value)}><option value="">Select module</option>{mods.map(m=><option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}</select></section>{mid&&<section className="v19-card"><h3>Student Grades</h3>{!rows.length?<p>No registered students.</p>:rows.map((r,i)=><div className="v19-grade-row" key={r.id}><div><b>{r.student_id}</b><small>{r.full_name}</small></div><input type="number" min="0" max="100" placeholder="Score" value={r.score??r.gradeRow?.score??''} onChange={e=>update(i,'score',e.target.value)}/><strong>{r.gradeRow?.grade||'—'}</strong><span>{r.gradeRow?.published?'Published':'Draft'}</span><button onClick={()=>save(i)}>Save</button>{r.gradeRow&&!r.gradeRow.published&&<button onClick={()=>pub(i)}>Publish</button>}</div>)}</section>}</div>
}

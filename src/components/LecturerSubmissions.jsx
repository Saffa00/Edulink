import React,{useEffect,useState}from'react';import{getLecturerAssignments}from'../services/assignments';import{getLecturerSubmissions,getSubmissionFileUrl,gradeSubmission}from'../services/submissions';

export default function LecturerSubmissions(){
 const[a,setA]=useState([]),[selected,setSelected]=useState(''),[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{getLecturerAssignments().then(setA).catch(e=>setMsg(e.message))},[]);
 async function choose(id){setSelected(id);try{setRows(await getLecturerSubmissions(id))}catch(e){setMsg(e.message)}}
 async function openFile(path){try{const u=await getSubmissionFileUrl(path);window.open(u,'_blank','noopener,noreferrer')}catch(e){setMsg(e.message)}}
 async function grade(r){const mark=window.prompt('Enter mark:',r.mark??'');if(mark===null)return;const comment=window.prompt('Lecturer comment:',r.lecturer_comment||'')??'';try{await gradeSubmission(r.id,mark,comment);setRows(await getLecturerSubmissions(selected));setMsg('Submission graded.')}catch(e){setMsg(e.message)}}
 return <div className="v18-wrap"><section className="v18-card"><h2>Submission Review</h2>{msg&&<div className="v18-msg">{msg}</div>}<select value={selected} onChange={e=>choose(e.target.value)}><option value="">Select assignment</option>{a.map(x=><option key={x.id} value={x.id}>{x.modules?.code} — {x.title}</option>)}</select></section>{selected&&<section className="v18-card"><h3>Student Submissions</h3>{!rows.length?<p>No submissions yet.</p>:rows.map(r=><div className="v18-row" key={r.id}><div><b>{r.students?.student_id} — {r.students?.full_name}</b><small>{r.submitted_at&&new Date(r.submitted_at).toLocaleString()}</small></div><span>{r.mark??'Not graded'}</span><button onClick={()=>openFile(r.file_url)}>Open File</button><button onClick={()=>grade(r)}>Grade</button></div>)}</section>}</div>
}

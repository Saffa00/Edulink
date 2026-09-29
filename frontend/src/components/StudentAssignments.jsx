import React,{useEffect,useState}from'react';
import{getMyStudentProfile}from'../services/studentAttendance';import{getStudentAssignments,submitAssignment}from'../services/assignments';
export default function StudentAssignments(){
 const[a,setA]=useState([]),[student,setStudent]=useState(null),[msg,setMsg]=useState('');
 async function load(){try{const s=await getMyStudentProfile();setStudent(s);setA(await getStudentAssignments(s.id))}catch(e){setMsg(e.message)}}useEffect(()=>{load()},[]);
 async function submit(x){try{const url=window.prompt('Paste the uploaded file URL for this prototype:');if(!url)return;await submitAssignment({assignmentId:x.id,studentId:student.id,fileUrl:url});setMsg('Assignment submitted successfully.');}catch(e){setMsg(e.message)}}
 return <div className="v17-wrap"><section className="v17-card"><h2>My Assignments</h2>{msg&&<div className="v17-msg">{msg}</div>}{!a.length?<p>No assignments available for your registered modules.</p>:a.map(x=><div className="v17-item" key={x.id}><b>{x.module?.code} — {x.title}</b><span>Due: {new Date(x.due_at).toLocaleString()} · Max: {x.max_mark}</span><p>{x.description}</p>{x.attachment_url&&<a href={x.attachment_url} target="_blank" rel="noreferrer">Open attachment</a>}<button onClick={()=>submit(x)}>Submit Assignment</button></div>)}</section></div>
}

import React,{useEffect,useState}from'react';
import{getMyStudentProfile}from'../services/studentAttendance';import{uploadSubmissionFile,saveSubmission}from'../services/submissions';import{getStudentAssignments}from'../services/assignments';

export default function SubmissionCenter(){
 const[s,setS]=useState(null),[a,setA]=useState([]),[files,setFiles]=useState({}),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const x=await getMyStudentProfile();setS(x);setA(await getStudentAssignments(x.id))}catch(e){setMsg(e.message)}})()},[]);
 async function submit(x){try{const f=files[x.id];if(!f)return setMsg('Choose a PDF, DOC or DOCX file first.');const path=await uploadSubmissionFile(f,s.id,x.id);await saveSubmission(x.id,s.id,path);setMsg('File uploaded and assignment submitted successfully.')}catch(e){setMsg(e.message)}}
 return <div className="v18-wrap"><section className="v18-card"><h2>Submit Assignments</h2>{msg&&<div className="v18-msg">{msg}</div>}{!a.length?<p>No assignments available.</p>:a.map(x=><div className="v18-item" key={x.id}><b>{x.module?.code} — {x.title}</b><span>Due: {new Date(x.due_at).toLocaleString()} · Max: {x.max_mark}</span><p>{x.description}</p><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>setFiles({...files,[x.id]:e.target.files?.[0]})}/><button onClick={()=>submit(x)}>Upload & Submit</button></div>)}</section></div>
}

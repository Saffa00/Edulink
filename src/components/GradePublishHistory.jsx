import React,{useEffect,useState}from'react';
import{getMyLecturerProfile,getMyTeachingModules}from'../services/moduleGrades';
import{getGradePublishHistory}from'../services/gradeAudit';

export default function GradePublishHistory(){
 const[mods,setMods]=useState([]),[mid,setMid]=useState(''),[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const l=await getMyLecturerProfile();setMods(await getMyTeachingModules(l.id))}catch(e){setMsg(e.message)}})()},[]);
 async function load(id){setMid(id);setMsg('');if(!id){setRows([]);return}try{setRows(await getGradePublishHistory(id))}catch(e){setMsg(e.message)}}
 return <section className="v23-card"><h2>Grade Publishing History</h2><p>Audit record of module grade publications.</p>{msg&&<div className="v23-msg">{msg}</div>}<select value={mid} onChange={e=>load(e.target.value)}><option value="">Select module</option>{mods.map(m=><option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}</select>{mid&&!rows.length?<p>No publication history for this module.</p>:rows.map(r=><div className="v23-history" key={r.id}><div><b>{r.published_count}</b><span>student grades published</span></div><time>{new Date(r.published_at).toLocaleString()}</time></div>)}</section>
}

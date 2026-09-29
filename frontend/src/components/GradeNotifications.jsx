import React,{useEffect,useState}from'react';
import{getMyNotifications,markNotificationRead}from'../services/gradeNotifications';

export default function GradeNotifications(){
 const[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{getMyNotifications().then(setRows).catch(e=>setMsg(e.message))},[]);
 async function read(r){
  if(r.read_at)return;
  try{const x=await markNotificationRead(r.id);setRows(rs=>rs.map(n=>n.id===r.id?x:n))}
  catch(e){setMsg(e.message)}
 }
 return <div className="v21-wrap"><section className="v21-card"><h2>Notifications</h2>{msg&&<div className="v21-msg">{msg}</div>}{!rows.length?<p>No notifications.</p>:rows.map(r=><button className={`v21-note ${r.read_at?'read':''}`} key={r.id} onClick={()=>read(r)}><b>{r.title}</b><span>{r.body}</span><small>{new Date(r.created_at).toLocaleString()}</small></button>)}</section></div>
}

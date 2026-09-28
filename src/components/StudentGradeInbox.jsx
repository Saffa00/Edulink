import React,{useEffect,useState}from'react';
import{getMyPublishedGrades}from'../services/moduleGrades';
import{getMyNotifications,markNotificationRead}from'../services/gradeNotifications';

export default function StudentGradeInbox(){
 const[grades,setGrades]=useState([]),[notes,setNotes]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const[s1,s2]=await Promise.all([import('../services/studentAttendance').then(x=>x.getMyStudentProfile()),getMyNotifications()]);setNotes(s2);setGrades(await getMyPublishedGrades(s1.id));}catch(e){setMsg(e.message)}})()},[]);
 const gradeMap=new Map(grades.map(g=>[g.modules?.code,g]));
 async function read(n){if(n.read_at)return;try{const x=await markNotificationRead(n.id);setNotes(ns=>ns.map(v=>v.id===n.id?x:v))}catch(e){setMsg(e.message)}}
 return <div className="v22-wrap"><section className="v22-card"><h2>My Published Grades</h2>{msg&&<div className="v22-msg">{msg}</div>}{!grades.length?<p>No grades have been published to your account.</p>:grades.map(g=><div className="v22-result" key={g.id}><div><b>{g.modules?.code}</b><span>{g.modules?.title}</span></div><strong>{g.score}</strong></div>)}</section><section className="v22-card"><h2>Grade Notifications</h2>{!notes.length?<p>No notifications.</p>:notes.map(n=><button className={`v22-note ${n.read_at?'read':''}`} key={n.id} onClick={()=>read(n)}><b>{n.title}</b><span>{n.body}</span><small>{new Date(n.created_at).toLocaleString()}</small></button>)}</section></div>
}

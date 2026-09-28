import React,{useEffect,useState}from'react';
import{getMyStudentProfile}from'../services/studentAttendance';
import{getMyPublishedGrades}from'../services/moduleGrades';

export default function StudentModuleGrades(){
 const[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const s=await getMyStudentProfile();setRows(await getMyPublishedGrades(s.id))}catch(e){setMsg(e.message)}})()},[]);
 return <div className="v20-wrap"><section className="v20-card"><h2>My Module Grades</h2>{msg&&<div className="v20-msg">{msg}</div>}{!rows.length?<p>No module grades have been published to your account.</p>:rows.map(r=><div className="v20-result" key={r.id}><div><b>{r.modules?.code}</b><span>{r.modules?.title}</span></div><strong>{r.score}</strong></div>)}</section></div>
}

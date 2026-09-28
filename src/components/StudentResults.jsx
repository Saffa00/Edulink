import React,{useEffect,useState}from'react';
import{getMyStudentProfile}from'../services/studentAttendance';
import{getStudentGrades,gradePoint}from'../services/grades';

export default function StudentResults(){
 const[rows,setRows]=useState([]),[msg,setMsg]=useState('');
 useEffect(()=>{(async()=>{try{const s=await getMyStudentProfile();setRows(await getStudentGrades(s.id))}catch(e){setMsg(e.message)}})()},[]);
 const points=rows.reduce((a,r)=>a+gradePoint(r.score),0);
 const gpa=rows.length?(points/rows.length).toFixed(2):'0.00';
 return <div className="v19-wrap"><section className="v19-card"><h2>My Results</h2>{msg&&<div className="v19-msg">{msg}</div>}<div className="v19-gpa"><b>{gpa}</b><span>GPA (simple module average)</span></div>{!rows.length?<p>No published results yet.</p>:rows.map(r=><div className="v19-result" key={r.id}><div><b>{r.modules?.code}</b><span>{r.modules?.title}</span></div><strong>{r.score}%</strong><strong>{r.grade}</strong></div>)}<small>GPA is currently an unweighted average of published module grade points. Credit-unit weighting can be added when module credits are available.</small></section></div>
}

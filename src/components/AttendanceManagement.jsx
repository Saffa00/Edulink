import React,{useEffect,useState} from 'react';
import {getLecturerClasses,createClass} from '../services/attendance';

export default function AttendanceManagement(){
 const [classes,setClasses]=useState([]),[modules,setModules]=useState([]),[form,setForm]=useState({module_id:'',class_date:'',start_time:'',end_time:'',location_name:'',latitude:'',longitude:'',radius_meters:100}),[msg,setMsg]=useState('');
 async function load(){try{const r=await getLecturerClasses();setClasses(r);setModules([...new Map(r.map(x=>[x.modules?.id,x.modules]).filter(x=>x[0])).values()])}catch(e){setMsg(e.message)}}
 useEffect(()=>{load()},[]);
 async function save(e){e.preventDefault();try{await createClass({...form,latitude:Number(form.latitude),longitude:Number(form.longitude),radius_meters:Number(form.radius_meters)});setMsg('Class scheduled. Attendance will open 30 minutes before the class ends.');setForm({module_id:'',class_date:'',start_time:'',end_time:'',location_name:'',latitude:'',longitude:'',radius_meters:100});load()}catch(e){setMsg(e.message)}}
 return <div className="v14-wrap"><section className="v14-card"><h2>Class & Attendance</h2><p>Schedule a class and define its attendance geofence.</p>{msg&&<div className="v14-msg">{msg}</div>}
 <form className="v14-form" onSubmit={save}>
 <select required value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value})}><option value="">Select module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.code} — {m.title}</option>)}</select>
 <input required type="date" value={form.class_date} onChange={e=>setForm({...form,class_date:e.target.value})}/>
 <input required type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/>
 <input required type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/>
 <input required placeholder="Location name" value={form.location_name} onChange={e=>setForm({...form,location_name:e.target.value})}/>
 <input required type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/>
 <input required type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/>
 <input required type="number" min="10" value={form.radius_meters} onChange={e=>setForm({...form,radius_meters:e.target.value})}/>
 <button>Schedule Class</button></form></section>
 <section className="v14-card"><h3>Scheduled Classes</h3>{classes.map(c=><div className="v14-class" key={c.id}><b>{c.modules?.code} — {c.modules?.title}</b><span>{c.class_date} · {c.start_time}–{c.end_time}</span><small>{c.location_name} · radius {c.radius_meters}m · attendance opens 30 min before end</small></div>)}</section></div>
}

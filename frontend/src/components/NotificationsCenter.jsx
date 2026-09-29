import React,{useEffect,useMemo,useState}from'react';
import{getMyNotificationCenter,markAllNotificationsRead}from'../services/notificationsCenter';

export default function NotificationsCenter(){
 const[items,setItems]=useState([]),[filter,setFilter]=useState('all'),[msg,setMsg]=useState('');
 async function load(){try{setItems(await getMyNotificationCenter())}catch(e){setMsg(e.message)}}
 useEffect(()=>{load()},[]);
 const shown=useMemo(()=>filter==='unread'?items.filter(x=>!x.read_at):items,[items,filter]);
 async function markAll(){try{await markAllNotificationsRead();await load()}catch(e){setMsg(e.message)}}
 const unread=items.filter(x=>!x.read_at).length;
 return <div className="v24-wrap"><section className="v24-card"><div className="v24-head"><div><h2>Notifications</h2><p>{unread} unread notification{unread===1?'':'s'}</p></div>{unread>0&&<button onClick={markAll}>Mark all read</button>}</div>{msg&&<div className="v24-msg">{msg}</div>}<div className="v24-tabs"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button><button className={filter==='unread'?'active':''} onClick={()=>setFilter('unread')}>Unread</button></div>{!shown.length?<p className="v24-empty">No notifications here.</p>:shown.map(n=><article className={`v24-note ${n.read_at?'read':'unread'}`} key={n.id}><div className="v24-dot"/><div><h3>{n.title}</h3><p>{n.body}</p><time>{new Date(n.created_at).toLocaleString()}</time></div></article>)}</section></div>
}

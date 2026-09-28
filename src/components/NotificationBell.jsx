import React,{useEffect,useState}from'react';
import{getMyNotificationCenter}from'../services/notificationsCenter';

export default function NotificationBell({onOpen}){
 const[count,setCount]=useState(0);
 useEffect(()=>{let alive=true;async function load(){try{const n=await getMyNotificationCenter({unreadOnly:true});if(alive)setCount(n.length)}catch{}}load();const id=setInterval(load,30000);return()=>{alive=false;clearInterval(id)}},[]);
 return <button className="v24-bell" aria-label="Notifications" onClick={onOpen}>🔔{count>0&&<span>{count>99?'99+':count}</span>}</button>
}

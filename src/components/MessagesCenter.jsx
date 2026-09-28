import React,{useEffect,useState}from'react';
import { subscribeToConversation, unsubscribeFromConversation } from '../services/messageRealtime'
import{getMyConversations,getConversationMessages,sendMessage,markConversationRead}from'../services/messages';

export default function MessagesCenter(){
 const[convos,setConvos]=useState([]),[active,setActive]=useState(null),[msgs,setMsgs]=useState([]),[body,setBody]=useState(''),[msg,setMsg]=useState('');
 async function load(){try{setConvos(await getMyConversations())}catch(e){setMsg(e.message)}}
 useEffect(()=>{load()},[]);
 async function open(c){setActive(c);try{setMsgs(await getConversationMessages(c.id));await markConversationRead(c.id)}catch(e){setMsg(e.message)}}
 async function send(){if(!active||!body.trim())return;try{await sendMessage({conversationId:active.id,body});setBody('');setMsgs(await getConversationMessages(active.id));await load()}catch(e){setMsg(e.message)}}
 function other(c){return c.student_id?c.students?.full_name:c.lecturers?.full_name}
 return <div className="v25-layout"><aside className="v25-list"><h2>Messages</h2>{msg&&<div className="v25-msg">{msg}</div>}{!convos.length?<p>No conversations yet.</p>:convos.map(c=><button className={active?.id===c.id?'selected':''} key={c.id} onClick={()=>open(c)}><b>{other(c)||'Conversation'}</b><span>{c.modules?.code||'Academic'}</span></button>)}</aside><section className="v25-chat">{!active?<div className="v25-empty">Select a conversation to start messaging.</div>:<><header><b>{other(active)}</b><span>{active.modules?.code} — {active.modules?.title}</span></header><div className="v25-messages">{msgs.map(m=><div className="v25-bubble" key={m.id}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div><div className="v25-compose"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Type your message..." rows="2"/><button onClick={send}>Send</button></div></>}</section></div>
}

import { supabase } from './supabase';

export async function createGradeNotifications({moduleId, lecturerName}){
  const {data:grades,error:gErr}=await supabase.from('grades')
    .select('id,student_id,score,grade,published,modules(code,title)')
    .eq('module_id',moduleId).eq('published',true);
  if(gErr) throw gErr;

  const studentIds=(grades||[]).map(g=>g.student_id);
  if(!studentIds.length) return 0;

  const {data:students,error:sErr}=await supabase.from('students')
    .select('id,auth_user_id,student_id').in('id',studentIds);
  if(sErr) throw sErr;

  const byId=new Map((students||[]).map(s=>[s.id,s]));
  const rows=(grades||[]).map(g=>{
    const s=byId.get(g.student_id);
    return s?.auth_user_id ? {
      recipient_user_id:s.auth_user_id,
      title:`${g.modules?.code || 'Module'} grade published`,
      body:`Your individual grade for ${g.modules?.title || 'your module'} is ${g.score}.`,
      created_at:new Date().toISOString()
    }:null;
  }).filter(Boolean);

  if(!rows.length) return 0;
  const {error}=await supabase.from('notifications').insert(rows);
  if(error) throw error;
  return rows.length;
}

export async function getMyNotifications(){
  const {data:{user},error:uErr}=await supabase.auth.getUser();
  if(uErr) throw uErr;
  const {data,error}=await supabase.from('notifications')
    .select('id,title,body,read_at,created_at')
    .eq('recipient_user_id',user.id)
    .order('created_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function markNotificationRead(id){
  const {data,error}=await supabase.from('notifications')
    .update({read_at:new Date().toISOString()})
    .eq('id',id).select().single();
  if(error) throw error; return data;
}

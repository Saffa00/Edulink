import { supabase } from './supabase';

export async function getLecturerAssignments(){
 const {data:{user},error:u}=await supabase.auth.getUser(); if(u||!user)throw u||new Error('Not authenticated');
 const {data:l,error:le}=await supabase.from('lecturers').select('id').eq('auth_user_id',user.id).single(); if(le)throw le;
 const {data,error}=await supabase.from('assignments').select('id,title,description,due_at,max_mark,attachment_url,created_at,modules(id,code,title)').eq('lecturer_id',l.id).order('created_at',{ascending:false});
 if(error)throw error; return data||[];
}
export async function createAssignment(payload){
 const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error('Not authenticated');
 const {data:l,error:le}=await supabase.from('lecturers').select('id').eq('auth_user_id',user.id).single(); if(le)throw le;
 const {data,error}=await supabase.from('assignments').insert({...payload,lecturer_id:l.id}).select().single(); if(error)throw error; return data;
}
export async function getStudentAssignments(studentId){
 const {data,error}=await supabase.from('student_modules').select('module_id,modules(id,code,title,assignments(id,title,description,due_at,max_mark,attachment_url,created_at,lecturer_id))').eq('student_id',studentId);
 if(error)throw error; return (data||[]).flatMap(x=>(x.modules?.assignments||[]).map(a=>({...a,module:x.modules}))).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at));
}
export async function submitAssignment({assignmentId,studentId,fileUrl}){
 const {data,error}=await supabase.from('submissions').upsert({assignment_id:assignmentId,student_id:studentId,file_url:fileUrl,submitted_at:new Date().toISOString(),status:'submitted'},{onConflict:'assignment_id,student_id'}).select().single();
 if(error)throw error; return data;
}

import { supabase } from './supabase';

export async function getLecturerGrades(moduleId){
  const {data,error}=await supabase.from('grades')
    .select('id,module_id,student_id,score,grade,published,updated_at,students(student_id,full_name,email)')
    .eq('module_id',moduleId).order('students(full_name)');
  if(error) throw error; return data||[];
}

export async function saveGrade({id,moduleId,studentId,score,grade,published=false}){
  const payload={module_id:moduleId,student_id:studentId,score:Number(score),grade,published,updated_at:new Date().toISOString()};
  const q=id
    ? supabase.from('grades').update(payload).eq('id',id)
    : supabase.from('grades').upsert(payload,{onConflict:'module_id,student_id'});
  const {data,error}=await q.select().single();
  if(error) throw error; return data;
}

export async function publishGrade(id,published=true){
  const {data,error}=await supabase.from('grades').update({published,updated_at:new Date().toISOString()}).eq('id',id).select().single();
  if(error) throw error; return data;
}

export async function getStudentGrades(studentId){
  const {data,error}=await supabase.from('grades')
    .select('id,score,grade,published,updated_at,modules(code,title)')
    .eq('student_id',studentId).eq('published',true);
  if(error) throw error; return data||[];
}

export function letterGrade(score){
  const n=Number(score);
  if(n>=80)return'A'; if(n>=70)return'B'; if(n>=60)return'C';
  if(n>=50)return'D'; return'F';
}

export function gradePoint(score){
  const n=Number(score);
  if(n>=80)return5; if(n>=70)return4; if(n>=60)return3;
  if(n>=50)return2; return0;
}

import { supabase } from './supabase';

export async function getMyLecturerProfile(){
  const {data:{user},error:uerr}=await supabase.auth.getUser();
  if(uerr) throw uerr;
  const {data,error}=await supabase.from('lecturers')
    .select('id,lecturer_id,full_name,email').eq('auth_user_id',user.id).single();
  if(error) throw error; return data;
}
export async function getMyTeachingModules(lecturerId){
  const {data,error}=await supabase.from('modules')
    .select('id,code,title').eq('lecturer_id',lecturerId).eq('active',true).order('code');
  if(error) throw error; return data||[];
}
export async function getRegisteredStudentsWithGrades(moduleId){
  const {data:regs,error:re}=await supabase.from('student_modules')
    .select('student_id,students(id,student_id,full_name,email)').eq('module_id',moduleId);
  if(re) throw re;
  const {data:grades,error:ge}=await supabase.from('grades')
    .select('id,module_id,student_id,lecturer_id,score,grade,published,updated_at')
    .eq('module_id',moduleId);
  if(ge) throw ge;
  const map=new Map((grades||[]).map(g=>[g.student_id,g]));
  return (regs||[]).map(r=>({...r.students,gradeRecord:map.get(r.student_id)})).filter(Boolean);
}
export async function saveIndividualGrade({lecturerId,moduleId,studentId,score}){
  const n=Number(score);
  if(!Number.isFinite(n)||n<0||n>100) throw new Error('Grade must be between 0 and 100.');
  const {data,error}=await supabase.from('grades').upsert({
    module_id:moduleId,student_id:studentId,lecturer_id:lecturerId,
    score:n,grade:String(n),published:false,updated_at:new Date().toISOString()
  },{onConflict:'module_id,student_id'}).select().single();
  if(error) throw error; return data;
}
export async function publishModuleGrades({moduleId,lecturerId}){
  const {data,error}=await supabase.from('grades').update({
    published:true,updated_at:new Date().toISOString()
  }).eq('module_id',moduleId).eq('lecturer_id',lecturerId).eq('published',false).select();
  if(error) throw error;
  return data||[];
}
export async function getMyPublishedGrades(studentId){
  const {data,error}=await supabase.from('grades')
    .select('id,score,grade,published,updated_at,modules(code,title)')
    .eq('student_id',studentId).eq('published',true)
    .order('updated_at',{ascending:false});
  if(error) throw error; return data||[];
}

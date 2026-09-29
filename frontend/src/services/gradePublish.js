import { supabase } from './supabase';

export async function getLecturerModuleGradeSummary(moduleId){
  const {data:students,error:se}=await supabase.from('student_modules')
    .select('student_id,students(id,student_id,full_name,email)').eq('module_id',moduleId);
  if(se) throw se;
  const {data:grades,error:ge}=await supabase.from('grades')
    .select('id,student_id,score,published,updated_at').eq('module_id',moduleId);
  if(ge) throw ge;
  const gm=new Map((grades||[]).map(g=>[g.student_id,g]));
  const rows=(students||[]).map(x=>({...x.students,grade:gm.get(x.student_id)})).filter(Boolean);
  return {
    total:rows.length,
    entered:rows.filter(r=>r.grade && r.grade.score!==null).length,
    published:rows.filter(r=>r.grade?.published).length,
    rows
  };
}

export async function publishModuleGradesSafely({moduleId,lecturerId}){
  const summary=await getLecturerModuleGradeSummary(moduleId);
  if(!summary.total) throw new Error('No students are registered for this module.');
  const missing=summary.rows.filter(r=>!r.grade || r.grade.score===null || r.grade.score===undefined);
  if(missing.length){
    throw new Error(`Cannot publish. ${missing.length} registered student(s) do not have a grade.`);
  }
  const {data,error}=await supabase.from('grades')
    .update({published:true,updated_at:new Date().toISOString()})
    .eq('module_id',moduleId).eq('lecturer_id',lecturerId).eq('published',false)
    .select('id,student_id,score,published');
  if(error) throw error;
  return {published:data||[],summary};
}

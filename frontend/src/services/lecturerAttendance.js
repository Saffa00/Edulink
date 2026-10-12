import { supabase } from './supabase';

export async function getLecturerAttendance() {
  const {data:{user},error:u}=await supabase.auth.getUser();
  if(u||!user) throw u||new Error('Not authenticated');
  let {data:l}=await supabase.from('lecturers').select('id,auth_user_id').eq('auth_user_id',user.id).maybeSingle();
  if(!l && user.email) {
    const r=await supabase.from('lecturers').select('id,auth_user_id').eq('email',user.email).maybeSingle();
    if(r.data) {
      l=r.data;
      if(!l.auth_user_id) supabase.from('lecturers').update({auth_user_id:user.id}).eq('id',l.id).then(null,()=>{});
    }
  }
  if(!l) throw new Error('Lecturer record not found.');
  const {data:classes,error:ce}=await supabase.from('classes')
    .select('id,class_date,start_time,end_time,location_name,modules(id,code,title)')
    .eq('lecturer_id',l.id).order('class_date',{ascending:false}).order('start_time',{ascending:false});
  if(ce) throw ce;
  const ids=(classes||[]).map(x=>x.id);
  if(!ids.length) return {classes:[],attendance:[]};
  const {data:attendance,error:ae}=await supabase.from('attendance')
    .select('id,class_id,student_id,marked_at,status,distance_meters,students(student_id,full_name,email)')
    .in('class_id',ids).order('marked_at',{ascending:false});
  if(ae) throw ae;
  return {classes:classes||[],attendance:attendance||[]};
}

export function attendanceStats(rows,totalStudents=0){
  const present=rows.filter(x=>x.status==='present').length;
  const late=rows.filter(x=>x.status==='late').length;
  const unique=new Set(rows.map(x=>x.student_id)).size;
  return {present,late,unique,absent:Math.max(0,totalStudents-unique),totalStudents};
}

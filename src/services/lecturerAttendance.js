import { supabase } from './supabase';

export async function getLecturerAttendance() {
  const {data:{user},error:u}=await supabase.auth.getUser();
  if(u||!user) throw u||new Error('Not authenticated');
  const {data:l,error:le}=await supabase.from('lecturers').select('id').eq('auth_user_id',user.id).single();
  if(le) throw le;
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

import { supabase } from './supabase';

export async function getLecturerClasses() {
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('Not authenticated');
  const {data:l,error:le}=await supabase.from('lecturers').select('id').eq('auth_user_id',user.id).single();
  if(le) throw le;
  const {data,error}=await supabase.from('classes')
    .select('id,class_date,start_time,end_time,location_name,latitude,longitude,radius_meters,modules(id,code,title)')
    .eq('lecturer_id',l.id).order('class_date',{ascending:false}).order('start_time');
  if(error) throw error; return data||[];
}

export async function createClass(payload) {
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('Not authenticated');
  const {data:l,error:le}=await supabase.from('lecturers').select('id').eq('auth_user_id',user.id).single();
  if(le) throw le;
  const {data,error}=await supabase.from('classes').insert({...payload,lecturer_id:l.id}).select().single();
  if(error) throw error; return data;
}

export async function getStudentClasses(studentId) {
  const {data,error}=await supabase.from('student_modules')
    .select('module_id,modules(id,code,title,lecturer_id,classes(id,class_date,start_time,end_time,location_name,latitude,longitude,radius_meters))')
    .eq('student_id',studentId);
  if(error) throw error; return data||[];
}

export async function markAttendance({classId,latitude,longitude,deviceToken}) {
  const res=await fetch('/api/attendance/mark',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId,latitude,longitude,deviceToken})});
  const data=await res.json(); if(!res.ok) throw new Error(data.error||'Attendance failed'); return data;
}

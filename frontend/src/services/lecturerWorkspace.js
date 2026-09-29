import { supabase } from './supabase'

export async function getLecturerWorkspace(moduleId) {
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { data: lecturer, error: le } = await supabase
    .from('lecturers').select('id,lecturer_id,full_name,email,teaching_area')
    .eq('auth_user_id',user.id).single()
  if (le) throw le

  let moduleQuery=supabase.from('modules')
    .select('id,code,title,level,semester,active')
    .eq('lecturer_id',lecturer.id)
  if (moduleId) moduleQuery=moduleQuery.eq('id',moduleId)
  const {data: modules,error:me}=await moduleQuery.order('code')
  if(me) throw me
  const selected=modules?.[0]

  if(!selected) return {lecturer,modules:[],students:[],classes:[],attendance:[],assignments:[],submissions:[],grades:[]}

  const {data: regs,error:re}=await supabase
    .from('student_modules')
    .select('student_id,students(id,student_id,full_name,email,programme,level,account_status)')
    .eq('module_id',selected.id)
  if(re) throw re

  const [classesR, assignmentsR, gradesR]=await Promise.all([
    supabase.from('classes').select('id,class_date,start_time,end_time,location_name,radius_meters').eq('module_id',selected.id).order('class_date',{ascending:false}).limit(20),
    supabase.from('assignments').select('id,title,due_at,max_mark,created_at').eq('module_id',selected.id).order('due_at',{ascending:true}),
    supabase.from('grades').select('id,student_id,score,grade,published,updated_at,students(student_id,full_name)').eq('module_id',selected.id).order('updated_at',{ascending:false})
  ])
  if(classesR.error) throw classesR.error
  if(assignmentsR.error) throw assignmentsR.error
  if(gradesR.error) throw gradesR.error

  const classIds=(classesR.data||[]).map(c=>c.id)
  const assignmentIds=(assignmentsR.data||[]).map(a=>a.id)
  const [attendanceR, submissionsR]=await Promise.all([
    classIds.length ? supabase.from('attendance').select('id,class_id,student_id,status,marked_at,distance_meters,students(student_id,full_name)').in('class_id',classIds).order('marked_at',{ascending:false}) : {data:[],error:null},
    assignmentIds.length ? supabase.from('submissions').select('id,assignment_id,student_id,submitted_at,mark,lecturer_comment,status,students(student_id,full_name)').in('assignment_id',assignmentIds).order('submitted_at',{ascending:false}) : {data:[],error:null}
  ])
  if(attendanceR.error) throw attendanceR.error
  if(submissionsR.error) throw submissionsR.error

  return {lecturer,modules,selectedModule:selected,students:(regs||[]).map(x=>x.students).filter(Boolean),
    classes:classesR.data||[],attendance:attendanceR.data||[],assignments:assignmentsR.data||[],
    submissions:submissionsR.data||[],grades:gradesR.data||[]}
}

import { supabase } from './supabase'

export async function getLecturerDashboardSummary() {
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { data: lecturer, error: lecturerError } = await supabase
    .from('lecturers').select('*').eq('auth_user_id', user.id).single()
  if (lecturerError) throw lecturerError

  const { data: modules, error: moduleError } = await supabase
    .from('modules')
    .select('id,code,title,level,semester,active,lecturer_id')
    .eq('lecturer_id', lecturer.id)
    .order('code')
  if (moduleError) throw moduleError

  const moduleIds=(modules||[]).map(m=>m.id)

  const [assignmentsRes, classesRes] = await Promise.all([
    moduleIds.length ? supabase.from('assignments')
      .select('id,module_id,title,due_at,max_mark,modules(code,title)')
      .in('module_id',moduleIds).order('due_at',{ascending:true}).limit(8)
      : {data:[],error:null},
    moduleIds.length ? supabase.from('classes')
      .select('id,module_id,class_date,start_time,end_time,location_name,modules(code,title)')
      .in('module_id',moduleIds).order('class_date',{ascending:true}).limit(8)
      : {data:[],error:null}
  ])
  if (assignmentsRes.error) throw assignmentsRes.error
  if (classesRes.error) throw classesRes.error

  return {
    lecturer,
    modules: modules||[],
    assignments: assignmentsRes.data||[],
    classes: classesRes.data||[]
  }
}

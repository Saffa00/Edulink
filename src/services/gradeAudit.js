import { supabase } from './supabase';

export async function getGradePublishHistory(moduleId){
  const {data,error}=await supabase.from('grade_publish_batches')
    .select('id,module_id,lecturer_id,published_count,published_at')
    .eq('module_id',moduleId)
    .order('published_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function createPublishBatch({moduleId,lecturerId,publishedCount}){
  const {data,error}=await supabase.from('grade_publish_batches')
    .insert({module_id:moduleId,lecturer_id:lecturerId,published_count:publishedCount})
    .select()
    .single();
  if(error) throw error;
  return data;
}

export async function getUnpublishedGradeIds(moduleId,lecturerId){
  const {data,error}=await supabase.from('grades')
    .select('id,student_id,score')
    .eq('module_id',moduleId)
    .eq('lecturer_id',lecturerId)
    .eq('published',false);
  if(error) throw error;
  return data||[];
}

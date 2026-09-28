import { supabase } from './supabase';

const BUCKET='assignment-submissions';

export async function uploadSubmissionFile(file, studentId, assignmentId){
 if(!file) throw new Error('Select a file first.');
 const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
 if(file.type && !allowed.includes(file.type)) throw new Error('Only PDF, DOC or DOCX files are allowed.');
 if(file.size>10*1024*1024) throw new Error('Maximum file size is 10 MB.');
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 const path=`${studentId}/${assignmentId}/${Date.now()}-${safe}`;
 const {error}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false});
 if(error) throw error;
 return path;
}
export async function saveSubmission(assignmentId,studentId,filePath){
 const {data,error}=await supabase.from('submissions').upsert({
  assignment_id:assignmentId,student_id:studentId,file_url:filePath,
  submitted_at:new Date().toISOString(),status:'submitted'
 },{onConflict:'assignment_id,student_id'}).select().single();
 if(error)throw error; return data;
}
export async function getSubmissionFileUrl(path){
 const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,300);
 if(error)throw error; return data.signedUrl;
}
export async function getLecturerSubmissions(assignmentId){
 const {data,error}=await supabase.from('submissions').select('id,student_id,file_url,submitted_at,mark,lecturer_comment,status,students(student_id,full_name,email)').eq('assignment_id',assignmentId).order('submitted_at',{ascending:false});
 if(error)throw error; return data||[];
}
export async function gradeSubmission(submissionId,mark,comment){
 const {data,error}=await supabase.from('submissions').update({mark:Number(mark),lecturer_comment:comment,status:'reviewed'}).eq('id',submissionId).select().single();
 if(error)throw error; return data;
}

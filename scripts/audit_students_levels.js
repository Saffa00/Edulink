const SUPABASE_URL = 'https://cdpxngnhurcswvieccph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcHhuZ25odXJjc3d2aWVjY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NjIwODUsImV4cCI6MjEwNTUzODA4NX0.SbG5guiX77HUgohmXFI_swTsZSIUBDbe8WlTUw9vIqE';

async function checkStudents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id,student_id,full_name,email,level,semester,academic_year,registration_type`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!res.ok) {
    console.log('Error fetching students:', res.status, await res.text());
    return;
  }

  const students = await res.json();
  console.log(`Found ${students.length} student(s) in Supabase:`);
  students.forEach(s => {
    console.log(`- ${s.full_name} (${s.student_id}) | Level: ${s.level} | Semester: ${s.semester} | RegType: ${s.registration_type || 'N/A'}`);
  });
}

checkStudents().catch(console.error);

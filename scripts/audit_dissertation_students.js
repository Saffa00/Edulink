const SUPABASE_URL = 'https://cdpxngnhurcswvieccph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcHhuZ25odXJjc3d2aWVjY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NjIwODUsImV4cCI6MjEwNTUzODA4NX0.SbG5guiX77HUgohmXFI_swTsZSIUBDbe8WlTUw9vIqE';

async function audit() {
  console.log('Auditing existing students with dissertation records via Supabase REST API...');
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dissertations?select=id,title,status,current_chapter,student_id,students(id,student_id,full_name,email,level,semester,academic_year)`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    console.log('Notice or error fetching dissertations:', res.status, txt);
    return;
  }

  const dissertations = await res.json();

  if (!dissertations || dissertations.length === 0) {
    console.log('No dissertation records found in database.');
    return;
  }

  console.log(`Found ${dissertations.length} dissertation record(s):`);
  const ineligible = [];
  dissertations.forEach(d => {
    const s = d.students;
    const isLevel4 = s && (String(s.level) === '4' || String(s.level) === 'Year 4');
    const isSem2 = s && (String(s.semester).toLowerCase().includes('second') || String(s.semester) === '2');
    console.log(`- Student: ${s?.full_name || 'Unknown'} (ID: ${s?.student_id || d.student_id}) | Level: ${s?.level || 'N/A'} | Semester: ${s?.semester || 'N/A'} | Title: "${d.title}"`);
    if (!isLevel4 || !isSem2) {
      ineligible.push({
        dissertation_id: d.id,
        student_id: s?.student_id || d.student_id,
        student_uuid: d.student_id,
        full_name: s?.full_name || 'Unknown',
        email: s?.email || 'N/A',
        current_level: s?.level || 'N/A',
        current_semester: s?.semester || 'N/A',
        title: d.title,
        reason: (!isLevel4 ? 'Not Year 4' : '') + (!isLevel4 && !isSem2 ? ', ' : '') + (!isSem2 ? 'Not Semester 2' : '')
      });
    }
  });

  console.log('\n--- INELIGIBLE DISSERTATION STUDENTS AUDIT SUMMARY ---');
  console.log(JSON.stringify(ineligible, null, 2));
}

audit().catch(console.error);

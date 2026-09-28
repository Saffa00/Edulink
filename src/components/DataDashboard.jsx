import React from 'react';

export function StudentDataDashboard({data}) {
  const {student, modules, grades, attendance} = data;
  return <div className="v12-dashboard">
    <div className="v12-card">
      <h2>{student.full_name}</h2>
      <p>{student.student_id} · {student.programmes?.name || 'Programme not set'}</p>
      <p>{student.faculties?.name || ''} · {student.departments?.name || ''} · Level {student.level || '—'}</p>
    </div>
    <div className="v12-stats">
      <div><b>{modules.length}</b><span>Modules</span></div>
      <div><b>{attendance.length}</b><span>Attendance</span></div>
      <div><b>{grades.length}</b><span>Grades</span></div>
    </div>
    <section className="v12-card"><h3>My Modules</h3>
      {modules.length ? modules.map(x => <div className="v12-row" key={x.id}>
        <span><b>{x.modules?.code}</b> — {x.modules?.title}</span>
        <small>{x.modules?.lecturers?.full_name || 'Lecturer not assigned'}</small>
      </div>) : <p>No registered modules.</p>}
    </section>
    <section className="v12-card"><h3>Published Grades</h3>
      {grades.length ? grades.map(x => <div className="v12-row" key={x.id}>
        <span>{x.modules?.code} — {x.modules?.title}</span><b>{x.score ?? '—'} / {x.grade ?? '—'}</b>
      </div>) : <p>No published grades yet.</p>}
    </section>
  </div>;
}

export function LecturerDataDashboard({data}) {
  const {lecturer, modules, assignments} = data;
  return <div className="v12-dashboard">
    <div className="v12-card">
      <h2>{lecturer.full_name}</h2>
      <p>{lecturer.lecturer_id} · {lecturer.teaching_area || 'Teaching area not set'}</p>
      <p>{lecturer.faculties?.name || ''} · {lecturer.departments?.name || ''}</p>
    </div>
    <div className="v12-stats">
      <div><b>{modules.length}</b><span>My Modules</span></div>
      <div><b>{assignments.length}</b><span>Assignments</span></div>
    </div>
    <section className="v12-card"><h3>My Modules</h3>
      {modules.length ? modules.map(x => <div className="v12-row" key={x.id}>
        <span><b>{x.code}</b> — {x.title}</span><small>Level {x.level || '—'} · Semester {x.semester || '—'}</small>
      </div>) : <p>No modules assigned.</p>}
    </section>
    <section className="v12-card"><h3>My Assignments</h3>
      {assignments.length ? assignments.map(x => <div className="v12-row" key={x.id}>
        <span>{x.title}</span><small>{x.modules?.code} · {x.due_at ? new Date(x.due_at).toLocaleString() : 'No deadline'}</small>
      </div>) : <p>No assignments created.</p>}
    </section>
  </div>;
}

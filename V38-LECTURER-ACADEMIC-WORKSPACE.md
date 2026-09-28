# V38 — Lecturer Academic Workspace

V38 adds a module-focused workspace for the lecturer.

## Module workspace
- Student roster
- Attendance register
- Attendance present/late statistics
- Assignment/submission overview
- Individual student grades
- Published/pending grade counts
- Grade Publisher shortcut
- Attendance management shortcut
- Messaging shortcut
- Dissertation shortcut

## Grade rule
Grades are displayed individually by Student ID. The workspace does not calculate or display GPA or CGPA.

## Security
The workspace first resolves the signed-in lecturer and only queries modules where `modules.lecturer_id` belongs to that lecturer. Existing Supabase RLS remains the final authorization layer.

## Integration
Use:

`<LecturerAcademicWorkspaceV38 moduleId={moduleId} onNavigate={(screen,id)=>...} />`

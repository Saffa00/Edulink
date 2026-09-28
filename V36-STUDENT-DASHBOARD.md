# V36 — Complete Student Dashboard

V36 provides a mobile-first student home dashboard that brings together the main academic activities.

## Dashboard
- Student name and Student ID
- Programme context
- Module count
- Recent attendance summary
- Upcoming assignment count
- Unread notification count
- My Modules
- Lecturer shortcut / Message Lecturer
- Latest published individual grade
- Upcoming assignments
- Recent module conversations
- Attendance shortcut
- Assignments shortcut
- Grades shortcut
- Notifications shortcut
- Dissertation shortcut
- Profile & Security shortcut

## Important
Grades remain individual. The dashboard does not calculate or display GPA/CGPA.

## Integration
Use:

`<StudentDashboardV36 onNavigate={(screen, moduleId) => ...} />`

Connect `onNavigate` to the existing application router/navigation state.

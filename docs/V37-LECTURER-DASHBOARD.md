# V37 — Complete Lecturer Dashboard

V37 provides a mobile-first lecturer home dashboard for day-to-day academic management.

## Included
- Lecturer name and Lecturer ID
- Department/teaching area
- Active module count
- Today's class count
- Assignment count
- Scheduled class count
- My Modules
- Module student shortcut
- Individual grade management shortcut
- Module messaging shortcut
- Today's classes
- Open Attendance shortcut
- Assignment management
- Submission shortcut
- Attendance
- Grades
- Messages
- Dissertation
- Notifications
- Profile & Security

## Integration
Use:

`<LecturerDashboardV37 onNavigate={(screen, id) => ...} />`

Connect `onNavigate` to the existing application navigation.

## Security
The dashboard only queries modules owned by the signed-in lecturer. Existing RLS policies remain in place.

# V16 — Lecturer Attendance Dashboard

Adds a lecturer-facing attendance dashboard.

Features:
- Select a scheduled class.
- View attendance records for that lecturer's classes.
- Present, late and not-marked summary counts.
- Student ID, name, email, status, GPS distance and marked time.
- Export the selected class attendance as CSV.

The dashboard reads only classes owned by the authenticated lecturer and attendance associated with those classes.

Note: "Not Marked" is the number of students represented by the attendance records, not a complete absence calculation unless the system also knows the full registered-student roster for the selected module. The current prototype therefore labels this as "Not Marked" rather than asserting confirmed absence.

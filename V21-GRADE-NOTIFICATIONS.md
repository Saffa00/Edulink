# V21 — Individual Grade Notifications

When a lecturer publishes a module's grades:
1. Every registered student's grade remains linked to that student's Student ID.
2. A private notification is created for each student with their own grade.
3. A student can read only their own notification.
4. The student can mark the notification as read.
5. GPA/CGPA is not used.

For production, notification creation should be moved to a trusted server/Edge Function so students cannot trigger notification creation from the browser.

# V13 — Lecturer Module Management

Adds the lecturer module-management layer.

Lecturers can:
- view their assigned modules
- create modules
- edit their modules
- view students registered for each module

Student allocation remains automatic:
Student → student_modules → module → lecturer

Run `supabase/v13_module_management_rls.sql` in Supabase SQL Editor.

Next stage: V14 class scheduling and GPS attendance.

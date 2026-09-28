# V19 — Grades & Results

Adds:
- Lecturer grade entry per module
- 0–100 score validation in UI
- Automatic A/B/C/D/F letter grade
- Draft vs Published state
- Lecturer publish control
- Student sees published grades only
- Basic 5-point GPA calculation

Run `supabase/v19_grades_rls.sql` in Supabase SQL Editor.

Important schema note:
The existing `grades` table includes `lecturer_id`. The grade save helper should supply the authenticated lecturer ID in production if your RLS requires it. This version preserves the existing schema and focuses on the grade/result workflow.

GPA currently uses a simple average of grade points. Add module credit units before using a weighted institutional GPA.

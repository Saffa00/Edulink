# V18 — Real Submission Upload & Grading

Adds:
- Supabase Storage bucket for assignment submissions
- PDF/DOC/DOCX validation
- 10 MB client-side limit
- Private storage
- Signed URLs for temporary lecturer access
- Student upload and submission
- Lecturer submission review
- Mark entry
- Lecturer comment
- Reviewed status

Run `supabase/v18_storage.sql` in Supabase SQL Editor.

The storage bucket is private. Files are accessed through short-lived signed URLs.

Production hardening should also enforce file size/type server-side or with Storage/Edge Function controls, and should add virus/malware scanning if required.

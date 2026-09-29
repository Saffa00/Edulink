# V40 — Complete Assignment System

V40 delivers the complete, production-ready Assignment Management System for both lecturers and students, advancing from V17/V18 prototypes into an end-to-end coursework lifecycle.

---

## Core Features

### 1. Enhanced Assignment Creation & Brief Attachments
- **Module Allocation**: Scoped to the authenticated lecturer's assigned modules.
- **Detailed Specifications**: Title, rich instructions, submission deadline (date & time), and maximum marks.
- **Late Submission Controls**:
  - `allow_late`: Toggle whether submissions are permitted after the deadline.
  - `grace_period_hours`: Configurable grace window in hours.
- **Brief / Prompt Attachment**: Lecturers can upload PDF, DOCX, or ZIP question papers and syllabus guides directly to the private `assignment-briefs` Supabase Storage bucket.

### 2. Student Submission & Upload Workflow
- **Module-Aware Portal**: Displays all active and past assignments for enrolled modules.
- **File Upload Engine**: Validates file types (PDF, Word, ZIP) with a 20 MB client/storage limit.
- **Submission Remarks**: Students can provide context, comments, or notes alongside their uploaded files.
- **Download Receipts**: Students receive an instant timestamped receipt and can download their submitted file at any time.

### 3. Submission Deadline Enforcement & Late Tracking
- Authoritative date comparisons between check-in timestamp (`submitted_at`) and `due_at`.
- If submitted after the due date (with grace period evaluated):
  - Automatically flagged with `is_late = true`.
  - Computes `late_duration_minutes` for academic transparency.
  - If late submissions are disabled by the lecturer, upload attempts after the deadline are blocked with clear feedback.

### 4. Lecturer Grading & Qualitative Feedback
- **Integrated Roster Review**: Cross-references module enrollment rosters with submissions, displaying who submitted, who is graded, who is pending, and who has not submitted.
- **Score Validation**: Strict validation ensuring entered mark is between 0 and `max_mark`.
- **Qualitative Feedback**: Dedicated constructive feedback text area provided directly to the student.
- **Status Workflow**: `graded` (finalized score) or `needs_revision` (requesting revisions).

### 5. Resubmission & Complete Version History
- If an updated submission is uploaded (e.g. before deadline or upon revision request):
  - The previous submission is archived into `public.submission_versions` (`version_number`, `file_url`, `student_notes`, `submitted_at`).
  - The current record advances its `version_number` (e.g. Version 2, Version 3).
  - Lecturers can view and download all previous versions alongside the latest draft.

---

## Database Schema & Storage Migration

Run `supabase/v40_assignment_system.sql` in the Supabase SQL Editor:
- **`assignments`**: Added `allow_late`, `grace_period_hours`, and `brief_file_path`.
- **`submissions`**: Added `version_number`, `is_late`, `late_duration_minutes`, `student_notes`, and `graded_at`.
- **`submission_versions`**: New table for immutable version history archiving.
- **RLS Policies**: Added lecturer `UPDATE` on `submissions` for grading, student version management, and storage policies for `assignment-briefs` and `assignment-submissions`.
- **Realtime**: Enabled realtime publications on `assignments` and `submissions`.

---

## Integration

Use in React:
```jsx
import AssignmentManagementV40 from './components/AssignmentManagementV40';

// For Lecturer:
<AssignmentManagementV40 role="lecturer" onNavigate={(page) => setPage(page)} />

// For Student:
<AssignmentManagementV40 role="student" onNavigate={(page) => setPage(page)} />
```

Or navigate to **Assignments** in the application sidebar or bottom navigation bar.

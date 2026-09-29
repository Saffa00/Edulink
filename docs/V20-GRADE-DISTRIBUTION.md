# V20 — Individual Module Grade Distribution

This version removes GPA/CGPA from the workflow.

Lecturer workflow:
1. Select a module they teach.
2. The system loads only students registered for that module.
3. Enter each student's individual grade.
4. Save grades as drafts.
5. Click **Publish All Grades**.
6. The system publishes each grade against its own Student ID.

Student workflow:
- A student sees only grades where `student_id` belongs to their account.
- Only published grades are visible.
- Students cannot see classmates' grades.
- There is no GPA or CGPA calculation.

The grade identity is:
`Student ID + Module ID + Lecturer ID`

Run `supabase/v20_individual_grade_distribution.sql` in Supabase SQL Editor.

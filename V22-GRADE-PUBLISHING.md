# V22 — Safe Individual Grade Publishing

V22 makes the publish action class-wide but the result remains individual.

Rules:
- The lecturer selects one module.
- The system loads only students registered for that module.
- Every registered student must have a grade before publishing.
- The Publish All Grades button stays disabled until all grades are entered.
- Publishing updates each grade row separately.
- Each row is linked to exactly one Student ID and module.
- Each student can read only their own published grade.
- Individual grade notifications are generated after publication.
- No GPA or CGPA exists.

If any registered student is missing a grade, the whole publish action is blocked so the lecturer cannot accidentally release an incomplete class result.

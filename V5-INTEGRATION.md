# V5 — Authentication UI Integration

The project now contains the real Supabase auth service from V4 and a `V5AuthActions` helper in `src/App.jsx`.

## Login mapping

Student:
- `role`: `student`
- `form.id`: Student ID
- `form.password`: password

Lecturer:
- `role`: `lecturer`
- `form.id`: Lecturer ID
- `form.password`: password

Call `signInById()` on the Login button. On success, route to the matching dashboard.

## Student registration mapping

Pass:
- fullName
- studentId
- email
- phone
- facultyId
- departmentId
- programmeId
- level
- academicYear
- semester
- registrationType (`normal` or `dissertation`)
- password

Then use the returned auth user/profile to start the payment step.

## Lecturer registration mapping

Pass:
- fullName
- email
- phone
- facultyId
- departmentId
- teachingArea
- password

The service generates a Lecturer ID when one is not supplied.

## Important production rule

Do not trust client-submitted fees, account status, lecturer allocation, or payment status. The next payment stage must verify Monime server-side and activate the student only after verified payment.

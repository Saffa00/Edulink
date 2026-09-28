# V12 — Real Supabase Data Integration

V12 adds the database-backed data layer for the Student and Lecturer dashboards.

### Added
- `src/services/supabase.js`
- `src/services/data.js`
- `src/components/DataDashboard.jsx`
- `src/v12-data.css`
- `supabase/v12_dashboard_rls.sql`

Run the SQL migration in Supabase SQL Editor after the previous migrations.

Data relationship:
Student → student_modules → modules → lecturer

The browser must use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose a service-role key in frontend code.

# V14 — GPS Attendance & Class Scheduling

Adds:
- Lecturer class scheduling
- Date/start/end time
- Attendance location and geofence radius
- Attendance opens exactly 30 minutes before class end
- Student module eligibility check
- Registered-device check
- Haversine distance calculation
- Duplicate attendance prevention
- Server-side validation

Important: the server must receive the student's Supabase Bearer token. The browser should send GPS coordinates from `navigator.geolocation`, while the server remains authoritative.

Time handling in this prototype treats class date/time as UTC (Sierra Leone is UTC+0). For production, keep all server/database time comparisons consistently in UTC.

Run `supabase/v14_attendance_rls.sql` in Supabase SQL Editor.

Before production, register `server/routes/attendance.js` in the Express bootstrap with the existing Supabase admin client.

# V39 — Complete Attendance Management System

V39 delivers the complete, production-grade Attendance Management System for lecturers and students, building upon the foundations of V14–V16 and the V37/V38 academic workspace.

---

## Key Features

### 1. Lecturer Class Scheduling & Geofencing
- **Module Allocation**: Select from the lecturer's actual assigned modules.
- **Timing & Schedule**: Specify class date, start time, and end time.
- **Location & Presets**: Venue naming with 1-click campus presets (*IT Lab 1, Room 201, Auditorium A, etc.*).
- **GPS Coordinates**: Decimal latitude and longitude with an integrated **"Use Current Device GPS"** tool (`navigator.geolocation.getCurrentPosition` with high accuracy).
- **Geofence Radius**: Configurable boundary in meters (default 100m).
- **Late Threshold**: Configurable cutoff minutes (default 15 mins after session start/open).

### 2. Live Attendance Open / Close Controls
- **On-Demand Activation**: Lecturer can open or close attendance at any point with instant real-time reflection across student devices.
- **Live Status Indicator**: Real-time status badge (*LIVE: ATTENDANCE OPEN*, *SCHEDULED*, *ATTENDANCE CLOSED*) with animated live pulse.
- **Scheduled Window Fallback**: If left on 'scheduled', attendance automatically unlocks 30 minutes before class end until class end.

### 3. Full Registered-Student Module Roster
- Cross-references the module's enrolled student database (`student_modules` joined with `students`) against logged check-ins.
- Guarantees complete accountability: every registered student is accounted for, eliminating unmarked ambiguity.

### 4. Present / Late / Absent / Excused Calculations
- **Present**: Checked in within geofence before the late threshold.
- **Late**: Checked in within geofence after the late threshold.
- **Absent**: Registered student with no check-in recorded for the session.
- **Excused**: Manually excused by the lecturer.
- **Real-Time Summary Metrics**:
  - Total Enrolled Roster (100%)
  - Present Count & Percentage
  - Late Count & Percentage
  - Absent Count & Percentage
  - Average GPS Distance from classroom center pin

### 5. Live GPS Distance Tracking & Verification
- Precise distance calculation via the Haversine formula on both client and authoritative server.
- Distance badge for each student showing proximity in meters (e.g. `14m` within 100m radius).
- Cryptographic verification badge: `GPS + Device Bound` or `Manual Lecturer`.

### 6. Lecturer Manual Overrides
- One-click buttons on each student row to adjust status:
  - **Present**
  - **Late**
  - **Excuse**
  - **Absent**
- Supports lecturer notes for administrative and academic audit trails.

### 7. Attendance History & Analytics
- Complete history table of all past sessions.
- Visual attendance progress bars (% present + late vs total roster).
- Breakdown of P / L / A counts per session.

### 8. CSV Report Export
- 1-click export of the selected session or historical records.
- Standardized CSV format including:
  - Header with Module Code, Title, Class Date, Time, Venue, Geofence Radius, and Timestamp.
  - Student ID, Full Name, Email, Programme, Status, Marked Time, GPS Distance (m), Verification Method, and Lecturer Notes.

---

## Database Migration

Run `supabase/v39_attendance_system.sql` in the Supabase SQL Editor:
- Adds `attendance_status`, `opened_at`, `closed_at`, and `late_threshold_minutes` to `public.classes`.
- Updates `public.attendance` check constraints for `('present', 'late', 'absent', 'rejected', 'excused')` and adds `verified`, `verification_method`, `lecturer_notes`.
- Enables full RLS policies for lecturers to manage attendance records of their classes.
- Enables Supabase Realtime publication on `attendance` and `classes`.

---

## Component Integration

Use:
```jsx
import AttendanceManagementV39 from './components/AttendanceManagementV39';

<AttendanceManagementV39
  initialClassId={classId}
  onNavigate={(page) => setPage(page)}
/>
```

Or access via the main navigation sidebar/bottom nav under **Attendance**.

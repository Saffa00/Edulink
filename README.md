# Lecturer–Student Academic Management PWA — V8

Mobile-first PWA for lecturer/student academic management.

## Roles
- Student
- Lecturer

## V8 adds
- authenticated payment initialization;
- server-side Supabase service-role integration;
- persistent pending payment records;
- Monime checkout-session ID reconciliation;
- HMAC-protected Monime webhook endpoint;
- server-side checkout status and amount verification;
- automatic student activation only after verified payment;
- module-driven lecturer allocation view;
- payment reconciliation SQL migration.

## Fees
- Normal student (Year 1–3): SLE 100
- Dissertation student: SLE 500

## Security
Monime credentials and the Supabase service-role key stay on the backend.
The browser receives only the hosted Monime checkout redirect URL.

See `V8-MONIME-WEBHOOK-SETUP.md` for setup.


## V9 adds
- PWA-compatible first-device binding
- one active device policy
- device credential hashing
- IP/user-agent security audit fields
- login history foundation
- device registration/revocation API
- device security UI component
- explicit device recovery foundation


## V11 adds
- Supabase password-recovery flow
- password reset UI
- secure device-replacement foundation
- short-lived hashed recovery tokens
- recovery audit events
- generic account-enumeration-safe recovery responses


## V12
Real Supabase data services and dashboard components added. See V12-SUPABASE-DATA-INTEGRATION.md.


## V13
Lecturer module management added. See V13-MODULE-MANAGEMENT.md.


## V14
GPS class scheduling and secure attendance foundation added. See V14-GPS-ATTENDANCE.md.


## V15
Student GPS attendance UI added. See V15-ATTENDANCE-UI.md.


## V16
Lecturer attendance dashboard with class filtering, statistics and CSV export. See V16-LECTURER-ATTENDANCE.md.


## V17
Assignments and submissions foundation added. See V17-ASSIGNMENTS.md.


## V18
Real Supabase Storage uploads and lecturer grading foundation. See V18-FILE-UPLOAD-GRADING.md.


## V19
Grades, publishing controls and student results. See V19-GRADES-RESULTS.md.


## V20
Individual module grade distribution. No GPA/CGPA. Lecturer publishes all grades once and each registered Student ID receives only its own grade. See V20-GRADE-DISTRIBUTION.md.


## V21
Individual grade publication notifications. See V21-GRADE-NOTIFICATIONS.md.


## V22
Safe module-wide publishing with complete-grade validation and individual student distribution. See V22-GRADE-PUBLISHING.md.


## V23
Adds grade publication audit history and notification deduplication hardening. See V23-GRADE-AUDIT.md.


## V24
Adds a shared notification center, unread filter/count, mark-all-read, notification bell, and notification metadata. See V24-NOTIFICATIONS-CENTER.md.


## V25
Adds private Student-Lecturer module-based messaging. See V25-MESSAGING.md.


## V26
Adds real-time module messaging and message notifications. See `V26-REALTIME-MESSAGING.md` and `supabase/v26_realtime_messaging.sql`.


## V27
Adds trusted server-side message sending and notification creation. See `V27-SECURE-MESSAGING.md`, `server/routes/secure-messages.js`, and `supabase/v27_secure_messaging.sql`.


## V28
Adds server-side message authorization, rate limiting, validation, audit logging, and database hardening. See `V28-MESSAGE-SECURITY.md`.


## V29
Adds secure module-based conversation creation. Students can only start/reuse conversations for modules they are registered in, and the assigned lecturer is derived server-side.


## V30
Integrates secure module-based conversations into the Student module workflow and adds a Lecturer conversation center grouped by module.


## V31
Adds unread message counts, read tracking, conversation-list realtime refresh, and participant-only read-state updates.


## V32
Adds Web Push notification infrastructure with service worker, VAPID server sender, private subscriptions, and notification permission flow.


## V33
Connects secure Student ↔ Lecturer messaging to Web Push notifications with server-derived recipients and delivery audit.


## V34
Adds Profile & Security Center, password change, device management, login history, secure logout, and profile RLS hardening.


## V35
Adds the mobile-first Settings Center for account/security, notifications, appearance, and app preferences.


## V36
Adds a complete mobile-first Student Dashboard integrating modules, attendance, assignments, individual grades, notifications, messages, dissertation and security shortcuts.


## V37
Adds a complete mobile-first Lecturer Dashboard integrating modules, classes, attendance, assignments, submissions, individual grades, messages, dissertation, notifications and security shortcuts.


## V38
Adds a module-focused Lecturer Academic Workspace with roster, attendance, assignments/submissions and individual grade views.

# V15 — Student GPS Attendance UI

Adds the student attendance workflow and attendance history.

- Today's classes are loaded from registered modules.
- Attendance activates only from 30 minutes before class end until class end.
- Browser GPS is requested with high accuracy.
- The authenticated server validates registration, device, time window, geofence and duplicates.
- Students receive a confirmation with measured distance.
- The existing V14 server attendance route must be registered in Express.

This is layered protection, not a guarantee against sophisticated GPS spoofing.

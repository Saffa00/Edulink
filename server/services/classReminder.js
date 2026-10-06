import { getAdminSupabase } from './supabase.js';
import { sendPushToUser } from '../routes/push.js';

// Cache reminded schedule intervals to prevent spamming duplicate reminders on the same day
const remindedEvents = new Set();

/**
 * Checks for upcoming classes or recurring timetable schedules starting in 5 minutes
 * and sends push notifications to the lecturer and all enrolled students.
 */
export async function checkUpcomingClassesAndNotify() {
  try {
    const admin = getAdminSupabase();
    const now = new Date();
    
    // Days of week array
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const todayYMD = now.toISOString().slice(0, 10);

    // Calculate time window 5 minutes from now (+- 2 minutes tolerance)
    const targetTimeMs = now.getTime() + 5 * 60 * 1000;
    const targetDate = new Date(targetTimeMs);
    const targetHour = targetDate.getHours();
    const targetMin = targetDate.getMinutes();
    const targetTimeStr = `${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`;

    // 1. Check one-off classes scheduled for today
    const { data: upcomingClasses } = await admin
      .from('classes')
      .select('id, module_id, lecturer_id, class_date, start_time, room_code, modules(id, code, title), lecturers(id, auth_user_id, full_name)')
      .eq('class_date', todayYMD)
      .eq('attendance_status', 'scheduled');

    for (const cls of (upcomingClasses || [])) {
      if (!cls.start_time) continue;
      const classStart = String(cls.start_time).slice(0, 5);
      const cacheKey = `cls-${cls.id}-${todayYMD}-${classStart}`;

      // Check if starting within ~5 minutes
      if (Math.abs(timeToMinutes(classStart) - timeToMinutes(targetTimeStr)) <= 2 && !remindedEvents.has(cacheKey)) {
        remindedEvents.add(cacheKey);
        await dispatchClassReminder({
          admin,
          moduleId: cls.module_id,
          moduleCode: cls.modules?.code || 'Class',
          moduleTitle: cls.modules?.title || '',
          room: cls.room_code || 'Lecture Hall',
          lecturerUserId: cls.lecturers?.auth_user_id,
          startTime: classStart
        });
      }
    }

    // 2. Check recurring schedules from timetable
    const { data: schedules } = await admin
      .from('schedules')
      .select('id, module_id, lecturer_id, day_of_week, start_time, location_name, room_code, modules(id, code, title), lecturers(id, auth_user_id, full_name)')
      .eq('day_of_week', currentDay);

    for (const sch of (schedules || [])) {
      if (!sch.start_time) continue;
      const schStart = String(sch.start_time).slice(0, 5);
      const cacheKey = `sch-${sch.id}-${todayYMD}-${schStart}`;

      if (Math.abs(timeToMinutes(schStart) - timeToMinutes(targetTimeStr)) <= 2 && !remindedEvents.has(cacheKey)) {
        remindedEvents.add(cacheKey);
        await dispatchClassReminder({
          admin,
          moduleId: sch.module_id,
          moduleCode: sch.modules?.code || 'Class',
          moduleTitle: sch.modules?.title || '',
          room: sch.room_code || sch.location_name || 'Lecture Hall',
          lecturerUserId: sch.lecturers?.auth_user_id,
          startTime: schStart
        });
      }
    }

    // Clean up cache at midnight
    if (now.getHours() === 0 && now.getMinutes() <= 2) {
      remindedEvents.clear();
    }
  } catch (err) {
    console.warn('Class reminder background check notice:', err.message);
  }
}

function timeToMinutes(timeStr) {
  const parts = String(timeStr).split(':');
  return parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
}

async function dispatchClassReminder({ admin, moduleId, moduleCode, moduleTitle, room, lecturerUserId, startTime }) {
  const title = `Class Starting in 5 Mins: ${moduleCode}`;
  const body = `Your class for ${moduleCode} (${moduleTitle}) is scheduled to start at ${startTime} in ${room}.`;

  const recipients = new Set();

  // Notify lecturer
  if (lecturerUserId) {
    recipients.add(lecturerUserId);
  }

  // Find enrolled students
  try {
    const { data: enrolled } = await admin
      .from('student_modules')
      .select('students(auth_user_id)')
      .eq('module_id', moduleId);

    (enrolled || []).forEach(e => {
      if (e.students?.auth_user_id) recipients.add(e.students.auth_user_id);
    });
  } catch (err) {
    console.warn('Class reminder student query notice:', err.message);
  }

  for (const userId of recipients) {
    try {
      await admin.from('notifications').insert({
        recipient_user_id: userId,
        title,
        body,
        category: 'attendance',
        link_url: '/attendance',
        created_at: new Date().toISOString()
      });
    } catch {}

    try {
      await sendPushToUser(userId, {
        title,
        body,
        icon: '/edulink-logo.jpg',
        data: { url: '/attendance', category: 'attendance' }
      });
    } catch {}
  }
}

/**
 * Starts the reminder background interval (runs every 60 seconds)
 */
export function startClassReminderWorker() {
  // Initial check after 5 seconds
  setTimeout(checkUpcomingClassesAndNotify, 5000);
  // Interval every minute
  setInterval(checkUpcomingClassesAndNotify, 60 * 1000);
}

// Supabase Edge Function: send-class-reminders
// Triggered every 5 minutes (06:00-20:00, Mon-Sat) via pg_cron + pg_net in Africa/Freetown timezone.
// 1. Queries public.classes_due_for_reminder() for timetable slots starting in 25-35 min.
// 2. For each slot, gets enrolled students with class reminders enabled, sends ONE OneSignal push:
//    title: "<module code> starts in 30 min"
//    body:  "<room>, <campus>"
//    url:   "/student?page=timetable"
// 3. Inserts into public.class_reminders_sent ONLY after a successful send so failed pushes retry on the next run.
// 4. Notifies the lecturer as well and logs each notification to public.notifications.
// 5. Also checks public.classes_ended_due_for_attendance_prompt() to send the lecturer
//    "Take attendance for <module>?" after a class ends.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface DueClassSlot {
  timetable_id: string;
  class_date: string;
  module_id: string;
  module_code: string;
  module_name: string;
  room: string;
  campus_id: string;
  campus_name: string;
  offering_id: string | null;
  lecturer_user_id: string | null;
  start_time: string;
  end_time: string;
}

interface EndedClassSlot {
  timetable_id: string;
  class_date: string;
  module_id: string;
  module_code: string;
  module_name: string;
  campus_name: string;
  lecturer_user_id: string;
}

async function sendOneSignalBatch(
  appId: string,
  restApiKey: string,
  appOrigin: string,
  externalIds: string[],
  title: string,
  body: string,
  relativeUrl: string,
  collapseId?: string
): Promise<boolean> {
  if (!externalIds.length) return true;

  const fullUrl = `${appOrigin.replace(/\/$/, "")}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  const res = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: externalIds },
      headings: { en: title },
      contents: { en: body },
      url: fullUrl,
      chrome_web_icon: `${appOrigin.replace(/\/$/, "")}/edulink-logo.jpg`,
      firefox_icon: `${appOrigin.replace(/\/$/, "")}/edulink-logo.jpg`,
      collapse_id: collapseId,
    }),
  });
  return res.ok;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_REMINDER_SECRET");
    const headerSecret = req.headers.get("x-cron-secret");
    if (cronSecret && headerSecret && cronSecret !== headerSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized cron secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
    const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const appOrigin = Deno.env.get("PUBLIC_APP_URL") || "https://edulink-gilt-gamma.vercel.app";

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch classes starting in 25–35 minutes in Africa/Freetown
    const { data: dueSlots, error: dueErr } = await supabaseAdmin.rpc("classes_due_for_reminder");
    if (dueErr) throw dueErr;

    const slots: DueClassSlot[] = Array.isArray(dueSlots) ? dueSlots : [];
    const processedReminders: Array<{ timetable_id: string; module_code: string; recipients: number }> = [];

    for (const slot of slots) {
      // Find enrolled students for this offering or module+campus
      const studentUserIds = new Set<string>();

      if (slot.offering_id) {
        const { data: enrRows } = await supabaseAdmin
          .from("enrollments")
          .select("student_id, students!inner(user_id)")
          .eq("offering_id", slot.offering_id);

        for (const r of enrRows || []) {
          const st = (r as { students?: { user_id?: string } }).students;
          if (st?.user_id) studentUserIds.add(String(st.user_id));
        }
      }

      if (studentUserIds.size === 0 && slot.module_id) {
        const { data: smRows } = await supabaseAdmin
          .from("student_modules")
          .select("student_id, students!inner(user_id, campus_id)")
          .eq("module_id", slot.module_id);

        for (const r of smRows || []) {
          const st = (r as { students?: { user_id?: string; campus_id?: string } }).students;
          if (st?.user_id && (!slot.campus_id || !st.campus_id || st.campus_id === slot.campus_id)) {
            studentUserIds.add(String(st.user_id));
          }
        }
      }

      const candidateStudentIds = [...studentUserIds];
      let enabledStudentIds: string[] = [];

      if (candidateStudentIds.length > 0) {
        const { data: prefs } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id, push_enabled, class_reminders_notify")
          .in("user_id", candidateStudentIds);

        const disabledIds = new Set<string>();
        for (const p of prefs || []) {
          if (p.push_enabled === false || p.class_reminders_notify === false) {
            disabledIds.add(String(p.user_id));
          }
        }
        enabledStudentIds = candidateStudentIds.filter((uid) => !disabledIds.has(uid));
      }

      const title = `${slot.module_code} starts in 30 min`;
      const body = `${slot.room || "TBA"}, ${slot.campus_name || "Main Campus"}`;
      const studentUrl = `/student?page=timetable&slot=${slot.timetable_id}`;
      const lecturerUrl = `/lecturer?page=timetable&slot=${slot.timetable_id}`;

      // Send ONE OneSignal request containing all enrolled students with reminders enabled
      const studentPushOk = await sendOneSignalBatch(
        oneSignalAppId,
        oneSignalRestApiKey,
        appOrigin,
        enabledStudentIds,
        title,
        body,
        studentUrl,
        `class_start_${slot.timetable_id}_${slot.class_date}`
      );

      // Also notify the lecturer if they have a user_id
      let lecturerPushOk = true;
      if (slot.lecturer_user_id) {
        lecturerPushOk = await sendOneSignalBatch(
          oneSignalAppId,
          oneSignalRestApiKey,
          appOrigin,
          [slot.lecturer_user_id],
          title,
          body,
          lecturerUrl,
          `lecturer_class_start_${slot.timetable_id}_${slot.class_date}`
        );
      }

      // Only log to class_reminders_sent AFTER successful send so failed pushes retry next run
      if (studentPushOk && lecturerPushOk) {
        await supabaseAdmin.from("class_reminders_sent").upsert({
          timetable_id: slot.timetable_id,
          class_date: slot.class_date,
          sent_at: new Date().toISOString(),
        });

        // Save in-app notifications for students and lecturer
        const notifRows = enabledStudentIds.map((uid) => ({
          user_id: uid,
          recipient_user_id: uid,
          type: "class_reminders",
          category: "class_reminders",
          title,
          body,
          url: studentUrl,
          link_url: studentUrl,
          read: false,
        }));

        if (slot.lecturer_user_id) {
          notifRows.push({
            user_id: slot.lecturer_user_id,
            recipient_user_id: slot.lecturer_user_id,
            type: "class_reminders",
            category: "class_reminders",
            title,
            body,
            url: lecturerUrl,
            link_url: lecturerUrl,
            read: false,
          });
        }

        if (notifRows.length > 0) {
          await supabaseAdmin.from("notifications").insert(notifRows);
        }

        processedReminders.push({
          timetable_id: slot.timetable_id,
          module_code: slot.module_code,
          recipients: enabledStudentIds.length + (slot.lecturer_user_id ? 1 : 0),
        });
      }
    }

    // 2. Check classes that recently ended for post-class lecturer attendance prompt ("Take attendance for <module>?")
    const { data: endedSlots } = await supabaseAdmin.rpc("classes_ended_due_for_attendance_prompt");
    const endedList: EndedClassSlot[] = Array.isArray(endedSlots) ? endedSlots : [];
    const attendancePromptsSent: string[] = [];

    for (const ended of endedList) {
      if (!ended.lecturer_user_id) continue;
      const promptTitle = `Take attendance for ${ended.module_code}?`;
      const promptBody = `${ended.module_name} (${ended.campus_name}) has ended. Tap to record class attendance.`;
      const promptUrl = `/lecturer?page=attendance&module=${ended.module_id}`;

      const ok = await sendOneSignalBatch(
        oneSignalAppId,
        oneSignalRestApiKey,
        appOrigin,
        [ended.lecturer_user_id],
        promptTitle,
        promptBody,
        promptUrl,
        `att_prompt_${ended.timetable_id}_${ended.class_date}`
      );

      if (ok) {
        await supabaseAdmin.from("post_class_attendance_prompts_sent").upsert({
          timetable_id: ended.timetable_id,
          class_date: ended.class_date,
          sent_at: new Date().toISOString(),
        });

        await supabaseAdmin.from("notifications").insert({
          user_id: ended.lecturer_user_id,
          recipient_user_id: ended.lecturer_user_id,
          type: "class_reminders",
          category: "class_reminders",
          title: promptTitle,
          body: promptBody,
          url: promptUrl,
          link_url: promptUrl,
          read: false,
        });

        attendancePromptsSent.push(ended.timetable_id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reminders_sent: processedReminders,
        attendance_prompts_sent: attendancePromptsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

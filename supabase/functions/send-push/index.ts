// Supabase Edge Function: send-push
// Calls https://api.onesignal.com/notifications?c=push with include_aliases.external_id.
// Reads ONESIGNAL_REST_API_KEY and ONESIGNAL_APP_ID from Supabase secrets (Deno.env.get).
// Never exposes REST API keys to the frontend.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface PushRequestPayload {
  external_ids: string[];
  type?: "grades" | "assignments" | "class_reminders" | "announcement" | "general";
  title: string;
  body: string;
  url?: string;
  collapse_id?: string;
  save_to_db?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushRequestPayload = await req.json();

    const rawExternalIds = Array.isArray(payload.external_ids)
      ? payload.external_ids.map((id) => String(id || "").trim()).filter(Boolean)
      : [];

    if (rawExternalIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, reason: "No recipient external_ids provided." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notifType = payload.type || "general";
    let filteredExternalIds = [...new Set(rawExternalIds)];

    // Filter recipients by their notification_preferences (grades, assignments, class_reminders)
    if (["grades", "assignments", "class_reminders"].includes(notifType)) {
      const { data: prefs } = await supabaseAdmin
        .from("notification_preferences")
        .select("user_id, push_enabled, grades_notify, assignments_notify, class_reminders_notify")
        .in("user_id", filteredExternalIds);

      if (Array.isArray(prefs) && prefs.length > 0) {
        const disabledSet = new Set<string>();
        for (const pref of prefs) {
          if (pref.push_enabled === false) {
            disabledSet.add(String(pref.user_id));
            continue;
          }
          if (notifType === "grades" && pref.grades_notify === false) {
            disabledSet.add(String(pref.user_id));
          } else if (notifType === "assignments" && pref.assignments_notify === false) {
            disabledSet.add(String(pref.user_id));
          } else if (notifType === "class_reminders" && pref.class_reminders_notify === false) {
            disabledSet.add(String(pref.user_id));
          }
        }
        filteredExternalIds = filteredExternalIds.filter((id) => !disabledSet.has(id));
      }
    }

    const targetUrl = payload.url || "/";
    const appOrigin = Deno.env.get("PUBLIC_APP_URL") || "https://edulink-gilt-gamma.vercel.app";
    const fullWebUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `${appOrigin.replace(/\/$/, "")}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;

    // Save to public.notifications if requested
    if (payload.save_to_db) {
      const rows = filteredExternalIds.map((uid) => ({
        user_id: uid,
        recipient_user_id: uid,
        type: notifType,
        category: notifType,
        title: payload.title,
        body: payload.body,
        url: targetUrl,
        link_url: targetUrl,
        read: false,
      }));
      if (rows.length > 0) {
        await supabaseAdmin.from("notifications").insert(rows);
      }
    }

    if (filteredExternalIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, reason: "All recipients have disabled this notification type." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneSignalBody: Record<string, unknown> = {
      app_id: oneSignalAppId,
      target_channel: "push",
      include_aliases: {
        external_id: filteredExternalIds,
      },
      headings: { en: payload.title },
      contents: { en: payload.body },
      url: fullWebUrl,
      chrome_web_icon: `${appOrigin.replace(/\/$/, "")}/edulink-logo.jpg`,
      firefox_icon: `${appOrigin.replace(/\/$/, "")}/edulink-logo.jpg`,
    };

    if (payload.collapse_id) {
      oneSignalBody.collapse_id = payload.collapse_id;
      oneSignalBody.web_push_topic = payload.collapse_id;
    }

    const response = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${oneSignalRestApiKey}`,
      },
      body: JSON.stringify(oneSignalBody),
    });

    const resultData = await response.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        sent: response.ok,
        status: response.status,
        recipients_count: filteredExternalIds.length,
        onesignal: resultData,
      }),
      {
        status: response.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Authentication: this is a scheduled job. Only allow callers that
    // present the service role key (used by pg_cron / pg_net) or an
    // authenticated admin user.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
    );
    if (token !== serviceKey) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const allowed = (roles || []).some((r: any) => r.role === "admin");
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: due, error } = await supabase
      .from("screening_follow_ups")
      .select("*")
      .eq("status", "pending")
      .lte("due_at", new Date().toISOString())
      .limit(200);
    if (error) throw error;

    let notified = 0;
    for (const f of due || []) {
      const recipients: string[] = [];
      if (f.assigned_doctor_id) {
        recipients.push(f.assigned_doctor_id);
      } else {
        const { data: docs } = await supabase.from("user_roles").select("user_id").eq("role", "doctor").limit(20);
        (docs || []).forEach((d: any) => recipients.push(d.user_id));
      }
      const { data: patientProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("patient_identifier", f.patient_identifier)
        .maybeSingle();
      if (patientProfile?.user_id) recipients.push(patientProfile.user_id);

      const rows = recipients.map((uid) => ({
        user_id: uid,
        title: "Follow-up screening recommended",
        message: `Patient ${f.patient_identifier}: ${f.reason}`,
        type: "info",
        related_id: f.screening_id,
        severity: "medium",
        category: "screening_followup",
      }));
      if (rows.length > 0) {
        await supabase.from("notifications").insert(rows);
      }
      await supabase.from("screening_follow_ups").update({ status: "notified" }).eq("id", f.id);
      notified++;
    }

    return new Response(JSON.stringify({ processed: notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-follow-ups error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
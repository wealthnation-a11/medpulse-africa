import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fhir-ingest-token",
};

const LOINC_MAP: Record<string, { key: string; canonicalUnit: string; convert?: (v: number, unit: string) => number }> = {
  "4548-4":  { key: "hba1c", canonicalUnit: "%" },
  "2339-0":  { key: "glucose", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 18 : v },
  "2093-3":  { key: "cholesterol_total", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "13457-7": { key: "ldl", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "2085-9":  { key: "hdl", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "2160-0":  { key: "creatinine", canonicalUnit: "mg/dL", convert: (v, u) => /µmol|umol/i.test(u) ? v / 88.4 : v },
  "2857-1":  { key: "psa", canonicalUnit: "ng/mL" },
  "6598-7":  { key: "troponin", canonicalUnit: "ng/mL" },
  "1988-5":  { key: "crp", canonicalUnit: "mg/L" },
  "3016-3":  { key: "tsh", canonicalUnit: "mIU/L" },
  "2276-4":  { key: "ferritin", canonicalUnit: "ng/mL" },
  "1989-3":  { key: "vitamin_d", canonicalUnit: "ng/mL" },
  "718-7":   { key: "hemoglobin", canonicalUnit: "g/dL" },
  "6690-2":  { key: "wbc", canonicalUnit: "×10³/µL" },
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Obs = { code: string; value: number; unit: string; effective: string };

function extractObservations(resource: any): Obs[] {
  if (!resource) return [];
  const out: Obs[] = [];
  const coding: any[] = resource.code?.coding || [];
  const loinc = coding.find((c) => /loinc/i.test(c.system || ""));
  const code = loinc?.code;
  const vq = resource.valueQuantity;
  if (!code || !vq || typeof vq.value !== "number") return [];
  out.push({
    code,
    value: vq.value,
    unit: vq.unit || vq.code || "",
    effective: resource.effectiveDateTime || resource.issued || new Date().toISOString(),
  });
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Auth: either valid Supabase JWT (doctor/admin) or X-FHIR-Ingest-Token
  let submittedBy: string | null = null;
  const authHeader = req.headers.get("Authorization");
  const ingestToken = req.headers.get("X-FHIR-Ingest-Token");
  if (authHeader?.startsWith("Bearer ")) {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = data?.claims?.sub as string | undefined;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if ((roles || []).some((r: any) => r.role === "doctor" || r.role === "admin")) submittedBy = uid;
    }
  }
  if (!submittedBy && ingestToken) {
    const hash = await sha256(ingestToken);
    const { data: tok } = await supabase.from("fhir_ingest_tokens").select("created_by, revoked_at").eq("token_hash", hash).maybeSingle();
    if (tok && !tok.revoked_at) {
      submittedBy = tok.created_by;
      await supabase.from("fhir_ingest_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", hash);
    }
  }
  if (!submittedBy) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  const rawText = await req.text();
  try { body = JSON.parse(rawText); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const resources: any[] = body.resourceType === "Bundle"
    ? (body.entry || []).map((e: any) => e.resource).filter(Boolean)
    : [body];

  // Find Patient resource
  const patientRes = resources.find((r) => r.resourceType === "Patient");
  let patientName = "Unknown";
  let dob: string | null = null;
  let sex = "unknown";
  let age = 0;
  if (patientRes) {
    const n = (patientRes.name || [])[0];
    if (n) patientName = [(n.given || []).join(" "), n.family].filter(Boolean).join(" ").trim() || "Unknown";
    dob = patientRes.birthDate || null;
    sex = (patientRes.gender || "unknown").toLowerCase();
    if (dob) age = Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
  }

  const { data: patientId } = await supabase.rpc("match_or_create_patient", { in_name: patientName, in_dob: dob, in_sex: sex });

  // Collect observations grouped by effective date (yyyy-mm-dd)
  const obs: Obs[] = [];
  for (const r of resources) {
    if (r.resourceType === "Observation") obs.push(...extractObservations(r));
    if (r.resourceType === "DiagnosticReport" && Array.isArray(r.contained)) {
      for (const c of r.contained) if (c.resourceType === "Observation") obs.push(...extractObservations(c));
    }
  }

  const skipped: string[] = [];
  const byDate: Record<string, Obs[]> = {};
  for (const o of obs) {
    if (!LOINC_MAP[o.code]) { skipped.push(o.code); continue; }
    const day = o.effective.slice(0, 10);
    (byDate[day] ||= []).push(o);
  }

  let createdScreenings = 0;
  let createdBiomarkers = 0;
  const report = resources.find((r) => r.resourceType === "DiagnosticReport");
  const conclusion = report?.conclusion || "";

  for (const [day, list] of Object.entries(byDate)) {
    const testResults: Record<string, number> = {};
    for (const o of list) {
      const m = LOINC_MAP[o.code];
      const value = m.convert ? m.convert(o.value, o.unit) : o.value;
      testResults[m.key] = value;
    }
    const { data: hs, error: hsErr } = await supabase.from("health_screenings").insert({
      submitted_by: submittedBy,
      patient_age: age,
      patient_sex: sex === "male" || sex === "female" ? sex : "unknown",
      patient_name: patientName,
      patient_identifier: patientId,
      patient_dob: dob,
      family_history: [],
      screening_type: "blood_test",
      test_results: testResults,
      clinical_notes: conclusion,
      status: "pending",
      source: "fhir",
      created_at: new Date(day + "T00:00:00Z").toISOString(),
    }).select().single();
    if (hsErr || !hs) continue;
    createdScreenings++;
    createdBiomarkers += Object.keys(testResults).length;
    // trigger analysis (fire and forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-screening`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ screening_id: hs.id }),
    }).catch(() => {});
  }

  await supabase.from("fhir_ingest_logs").insert({
    source_system: req.headers.get("X-Source-System") || "",
    bundle_id: body.id || null,
    resource_count: resources.length,
    created_count: createdScreenings,
    skipped,
    payload_size: rawText.length,
  });

  return new Response(JSON.stringify({
    success: true,
    created_screenings: createdScreenings,
    biomarkers: createdBiomarkers,
    skipped,
    patient_identifier: patientId,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
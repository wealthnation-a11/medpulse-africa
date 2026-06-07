import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const refRanges: Record<string, { low?: number; high?: number; unit: string }> = {
  hemoglobin: { low: 12, high: 17.5, unit: "g/dL" },
  wbc: { low: 4.5, high: 11, unit: "×10³/µL" },
  glucose: { low: 70, high: 100, unit: "mg/dL" },
  cholesterol_total: { high: 200, unit: "mg/dL" },
  ldl: { high: 100, unit: "mg/dL" },
  hdl: { low: 40, unit: "mg/dL" },
  hba1c: { high: 5.7, unit: "%" },
  creatinine: { low: 0.6, high: 1.2, unit: "mg/dL" },
  psa: { high: 4, unit: "ng/mL" },
  troponin: { high: 0.04, unit: "ng/mL" },
  crp: { high: 3, unit: "mg/L" },
  tsh: { low: 0.4, high: 4, unit: "mIU/L" },
  ferritin: { low: 12, high: 300, unit: "ng/mL" },
  vitamin_d: { low: 30, high: 100, unit: "ng/mL" },
  systolic_bp: { low: 90, high: 130, unit: "mmHg" },
  diastolic_bp: { low: 60, high: 85, unit: "mmHg" },
  spo2: { low: 94, unit: "%" },
  pulse: { low: 50, high: 100, unit: "bpm" },
};

type Level = "Low" | "Medium" | "High";
const LEVEL_RANK: Record<Level, number> = { Low: 0, Medium: 1, High: 2 };

function pctToLevel(pct: number): Level {
  if (pct >= 60) return "High";
  if (pct >= 30) return "Medium";
  return "Low";
}

function ruleScoreScreening(testResults: Record<string, any>): Level {
  let abnormalCount = 0;
  let severeCount = 0;
  for (const [key, val] of Object.entries(testResults || {})) {
    if (typeof val !== "number") continue;
    const ref = refRanges[key];
    if (!ref) continue;
    const lowBad = ref.low !== undefined && val < ref.low;
    const highBad = ref.high !== undefined && val > ref.high;
    if (!lowBad && !highBad) continue;
    abnormalCount++;
    if (lowBad && ref.low !== undefined && val < ref.low * 0.75) severeCount++;
    if (highBad && ref.high !== undefined && val > ref.high * 1.25) severeCount++;
  }
  if (severeCount >= 2 || abnormalCount >= 4) return "High";
  if (abnormalCount >= 2 || severeCount >= 1) return "Medium";
  return "Low";
}

function biomarkerSlope(points: { value: number; created_at: string }[]): number | null {
  if (points.length < 2) return null;
  const t0 = new Date(points[0].created_at).getTime();
  const xs = points.map((p) => (new Date(p.created_at).getTime() - t0) / (1000 * 60 * 60 * 24 * 365));
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication & authorization ---
    // Allow either: (a) a service-role token (used for internal invocations
    // such as fhir-ingest -> analyze-screening), or (b) an authenticated user
    // with the doctor/admin role, or the volunteer who submitted the screening.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { screening_id } = await req.json();
    if (!screening_id) {
      return new Response(JSON.stringify({ error: "screening_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const isServiceRoleCall = token === serviceKey;
    if (!isServiceRoleCall) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = userData.user.id;
      const [{ data: roles }, { data: ownsRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("health_screenings").select("submitted_by").eq("id", screening_id).maybeSingle(),
      ]);
      const isPrivileged = (roles || []).some((r: any) => r.role === "doctor" || r.role === "admin");
      const isOwner = ownsRow?.submitted_by === userId;
      if (!isPrivileged && !isOwner) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: screening, error: sErr } = await supabase.from("health_screenings").select("*").eq("id", screening_id).single();
    if (sErr || !screening) {
      return new Response(JSON.stringify({ error: "Screening not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isImaging = screening.screening_type === "imaging";
    const isSelfReported = screening.source === "self_reported";
    const imagePaths: string[] = Array.isArray(screening.test_results?.image_paths) ? screening.test_results.image_paths : [];

    const signedImageUrls: string[] = [];
    if (isImaging && imagePaths.length > 0) {
      for (const path of imagePaths) {
        const { data: signed } = await supabase.storage.from("medical-images").createSignedUrl(path, 60 * 10);
        if (signed?.signedUrl) signedImageUrls.push(signed.signedUrl);
      }
    }

    // ---------- Longitudinal context ----------
    const patientId: string = (screening.patient_identifier || "").trim();
    let priorScreenings: any[] = [];
    let priorBiomarkers: any[] = [];
    if (patientId) {
      const { data: ps } = await supabase
        .from("health_screenings")
        .select("id, created_at, screening_type, test_results, imaging_findings")
        .eq("patient_identifier", patientId)
        .neq("id", screening_id)
        .order("created_at", { ascending: true })
        .limit(20);
      priorScreenings = ps || [];
      if (priorScreenings.length > 0) {
        const ids = priorScreenings.map((p) => p.id);
        const { data: bm } = await supabase
          .from("biomarker_profiles")
          .select("screening_id, biomarker_name, value, unit, is_abnormal, created_at")
          .in("screening_id", ids);
        priorBiomarkers = bm || [];
      }
    }

    const trendsBySeries: Record<string, { value: number; created_at: string; unit: string }[]> = {};
    for (const bm of priorBiomarkers) {
      if (!trendsBySeries[bm.biomarker_name]) trendsBySeries[bm.biomarker_name] = [];
      trendsBySeries[bm.biomarker_name].push({ value: Number(bm.value), created_at: bm.created_at, unit: bm.unit });
    }
    for (const [key, val] of Object.entries(screening.test_results || {})) {
      if (typeof val !== "number") continue;
      if (!refRanges[key]) continue;
      if (!trendsBySeries[key]) trendsBySeries[key] = [];
      trendsBySeries[key].push({ value: val, created_at: screening.created_at, unit: refRanges[key].unit });
    }
    const trendRows: string[] = [];
    for (const [name, points] of Object.entries(trendsBySeries)) {
      points.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      if (points.length < 2) continue;
      const slope = biomarkerSlope(points);
      if (slope === null) continue;
      const current = points[points.length - 1];
      const projected12mo = current.value + slope;
      trendRows.push(`- ${name}: current ${current.value}${current.unit}, slope ${slope.toFixed(3)} ${current.unit}/yr, 12-mo projection ${projected12mo.toFixed(2)}${current.unit} (n=${points.length})`);
    }

    // ---------- Cohort calibration ----------
    const ageMin = Math.max(0, (screening.patient_age || 0) - 10);
    const ageMax = (screening.patient_age || 0) + 10;
    const { data: cohortRaw } = await supabase
      .from("ai_feedback_examples")
      .select("disease_name, ai_risk_percentage, corrected_risk_level, doctor_notes, patient_age, patient_sex, created_at")
      .eq("patient_sex", screening.patient_sex)
      .gte("patient_age", ageMin)
      .lte("patient_age", ageMax)
      .order("created_at", { ascending: false })
      .limit(5);
    const cohort = cohortRaw || [];

    const ruleLevel = ruleScoreScreening(screening.test_results || {});

    const historyBlock = priorScreenings.length > 0
      ? priorScreenings.map((p, i) => `  ${i + 1}. ${new Date(p.created_at).toISOString().slice(0,10)} • ${p.screening_type}: ${JSON.stringify(p.test_results).slice(0,400)}${p.imaging_findings ? ` | imaging: ${p.imaging_findings.slice(0,200)}` : ""}`).join("\n")
      : "  (no prior screenings on file)";

    const trendsBlock = trendRows.length > 0 ? trendRows.join("\n") : "  (insufficient longitudinal data for trend analysis)";

    const cohortBlock = cohort.length > 0
      ? cohort.map((c, i) => `  ${i + 1}. Similar ${c.patient_sex} age ${c.patient_age} — AI predicted ${c.disease_name} at ${Math.round(c.ai_risk_percentage)}%, clinician revised to "${c.corrected_risk_level}"${c.doctor_notes ? ` — notes: ${String(c.doctor_notes).slice(0,150)}` : ""}`).join("\n")
      : "  (no past clinician corrections in this cohort)";

    const prompt = `You are an expert medical AI analyzing diagnostic screening data for EARLY disease detection. Reason over the patient's TRAJECTORY (not just current values) and provide explainable, evidence-grounded risk assessments.

Patient Information:
- Age: ${screening.patient_age}
- Sex: ${screening.patient_sex}
- Family History: ${JSON.stringify(screening.family_history)}
- Screening Type: ${screening.screening_type}
- Data Source: ${screening.source || "clinical"}${isSelfReported ? " (treat as advisory; do not flip risk class on a single self-reported outlier)" : ""}
- Test Results: ${JSON.stringify(screening.test_results)}
- Clinical Notes: ${screening.clinical_notes || "None"}

Patient History (prior screenings, oldest first):
${historyBlock}

Biomarker Trends (linear slope per year):
${trendsBlock}

Past Clinician Corrections — calibrate against these when AI tended to over/under-estimate similar patients:
${cohortBlock}

Rule-Based Engine Reference Reading: ${ruleLevel}
(Sanity check only. If you disagree, explain why in your rationale.)

Predict risks for relevant diseases (cancers, heart disease, diabetes, kidney/liver disease, thyroid, etc.). For each disease provide: risk_percentage (0-100), confidence (0-1), time_horizon, recommended_actions, a SHORT rationale (2-4 sentences) that explicitly references trajectory when relevant, and an evidence array citing the specific values/trends used (e.g., "HbA1c 6.4% above 5.7% threshold", "LDL trending +18 mg/dL/yr over 3 screenings").
${isImaging ? `\nThe attached image(s) are "${screening.test_results?.imaging_type ?? "unknown"}" of "${screening.test_results?.body_region ?? "unspecified"}". Call submit_imaging_findings FIRST with: findings (plain-English summary) AND regions[] of advisory bounding boxes (bbox_pct=[x,y,w,h] normalized 0..1) with label and severity ("low"|"medium"|"high"). Then call submit_risk_assessments.` : ""}

Base analysis on established medical reference ranges. Be thorough but evidence-based.`;

    const userContent: any[] = [{ type: "text", text: prompt }];
    for (const url of signedImageUrls) userContent.push({ type: "image_url", image_url: { url } });

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "submit_risk_assessments",
          description: "Submit disease risk assessments based on screening analysis",
          parameters: {
            type: "object",
            properties: {
              assessments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    disease_name: { type: "string" },
                    risk_percentage: { type: "number" },
                    confidence: { type: "number" },
                    time_horizon: { type: "string" },
                    recommended_actions: { type: "array", items: { type: "string" } },
                    rationale: { type: "string" },
                    evidence: { type: "array", items: { type: "string" } },
                  },
                  required: ["disease_name", "risk_percentage", "confidence", "time_horizon", "recommended_actions", "rationale", "evidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["assessments"],
            additionalProperties: false,
          },
        },
      },
    ];
    if (isImaging) {
      tools.push({
        type: "function",
        function: {
          name: "submit_imaging_findings",
          description: "Submit a concise textual summary AND advisory bounding-box regions from the medical image(s)",
          parameters: {
            type: "object",
            properties: {
              findings: { type: "string" },
              regions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    severity: { type: "string" },
                    bbox_pct: { type: "array", items: { type: "number" } },
                  },
                  required: ["label", "severity", "bbox_pct"],
                  additionalProperties: false,
                },
              },
            },
            required: ["findings"],
            additionalProperties: false,
          },
        },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: isImaging && !isSelfReported ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a medical AI specialist focused on early disease detection through blood tests, genetic screening, biomarker analysis, and longitudinal trend reasoning." },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCalls: any[] = aiData.choices?.[0]?.message?.tool_calls || [];
    const riskCall = toolCalls.find((c) => c.function?.name === "submit_risk_assessments");
    const findingsCall = toolCalls.find((c) => c.function?.name === "submit_imaging_findings");
    if (!riskCall) {
      console.error("No tool call in response");
      return new Response(JSON.stringify({ error: "AI returned no structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { assessments } = JSON.parse(riskCall.function.arguments);
    let imagingFindings = "";
    let imagingRegions: any[] = [];
    if (findingsCall) {
      try {
        const parsed = JSON.parse(findingsCall.function.arguments);
        imagingFindings = parsed?.findings || "";
        if (Array.isArray(parsed?.regions)) imagingRegions = parsed.regions;
      } catch { /* ignore */ }
    }

    const inserts = assessments.map((a: any) => {
      const pct = Math.min(100, Math.max(0, a.risk_percentage));
      const aiLevel = pctToLevel(pct);
      const disagreement = Math.abs(LEVEL_RANK[aiLevel] - LEVEL_RANK[ruleLevel]) >= 2;
      return {
        screening_id,
        disease_name: a.disease_name,
        risk_percentage: pct,
        confidence: Math.min(1, Math.max(0, a.confidence)),
        time_horizon: a.time_horizon || "",
        recommended_actions: a.recommended_actions || [],
        rationale: a.rationale || "",
        evidence: a.evidence || [],
        rule_based_level: ruleLevel,
        disagreement,
      };
    });

    if (inserts.length > 0) {
      await supabase.from("disease_risk_assessments").insert(inserts);
    }

    const testResults = screening.test_results || {};
    const biomarkers: any[] = [];
    for (const [key, val] of Object.entries(testResults)) {
      if (key === "preliminary_risk" || typeof val !== "number") continue;
      const ref = refRanges[key];
      if (!ref) continue;
      const isAbnormal = (ref.low !== undefined && val < ref.low) || (ref.high !== undefined && val > ref.high);
      biomarkers.push({
        screening_id,
        biomarker_name: key,
        value: val,
        unit: ref.unit,
        reference_range_low: ref.low ?? null,
        reference_range_high: ref.high ?? null,
        is_abnormal: isAbnormal,
      });
    }
    if (biomarkers.length > 0) {
      await supabase.from("biomarker_profiles").insert(biomarkers);
    }

    // ---------- Auto follow-up scheduling ----------
    try {
      if (patientId) {
        // find last sign-off doctor for this patient
        const priorIds = priorScreenings.map((p) => p.id).concat([screening_id]);
        const { data: lastVal } = await supabase
          .from("screening_validations")
          .select("doctor_id, signed_off_at")
          .in("screening_id", priorIds)
          .not("signed_off_at", "is", null)
          .order("signed_off_at", { ascending: false })
          .limit(1);
        const assignedDoctorId = lastVal?.[0]?.doctor_id ?? null;

        // recent follow-ups to dedupe (60 days)
        const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
        const { data: recentFu } = await supabase
          .from("screening_follow_ups")
          .select("biomarker_name")
          .eq("patient_identifier", patientId)
          .gte("created_at", since);
        const recentBm = new Set((recentFu || []).map((r: any) => r.biomarker_name));

        const followUps: any[] = [];
        for (const [name, points] of Object.entries(trendsBySeries)) {
          if (recentBm.has(name)) continue;
          if (points.length < 2) continue;
          const ref = refRanges[name];
          if (!ref) continue;
          const slope = biomarkerSlope(points);
          if (slope === null || slope === 0) continue;
          const current = points[points.length - 1].value;
          let threshold: number | null = null;
          let monthsToCross: number | null = null;
          if (ref.high !== undefined && current <= ref.high && slope > 0) {
            threshold = ref.high;
            monthsToCross = ((ref.high - current) / slope) * 12;
          } else if (ref.low !== undefined && current >= ref.low && slope < 0) {
            threshold = ref.low;
            monthsToCross = ((ref.low - current) / slope) * 12;
          }
          if (threshold === null || monthsToCross === null) continue;
          if (monthsToCross <= 0 || monthsToCross > 18) continue;
          const scheduleMonths = monthsToCross <= 3 ? 1 : Math.max(1, Math.floor(monthsToCross * 0.5));
          const dueAt = new Date(Date.now() + scheduleMonths * 30 * 24 * 3600 * 1000);
          const projected = current + slope * (scheduleMonths / 12);
          followUps.push({
            patient_identifier: patientId,
            screening_id,
            biomarker_name: name,
            projected_value: projected,
            threshold_value: threshold,
            due_at: dueAt.toISOString(),
            reason: `${name} trending ${slope > 0 ? "up" : "down"} toward ${threshold}; projected ~${projected.toFixed(2)} in ${scheduleMonths} mo`,
            status: "pending",
            assigned_doctor_id: assignedDoctorId,
          });
        }
        if (followUps.length > 0) {
          await supabase.from("screening_follow_ups").insert(followUps);
        }
      }
    } catch (e) {
      console.error("follow-up scheduling failed:", e);
    }

    await supabase.from("health_screenings").update({
      ai_analysis_complete: true,
      status: "analyzed",
      ...(imagingFindings ? { imaging_findings: imagingFindings } : {}),
      ...(imagingRegions.length > 0 ? { imaging_regions: imagingRegions } : {}),
    }).eq("id", screening_id);

    return new Response(JSON.stringify({ success: true, assessments_count: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-screening error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

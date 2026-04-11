import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { screening_id } = await req.json();
    if (!screening_id) {
      return new Response(JSON.stringify({ error: "screening_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch screening
    const { data: screening, error: sErr } = await supabase.from("health_screenings").select("*").eq("id", screening_id).single();
    if (sErr || !screening) {
      return new Response(JSON.stringify({ error: "Screening not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `You are an expert medical AI analyzing diagnostic screening data for early disease detection. Analyze the following patient data and provide disease risk assessments.

Patient Information:
- Age: ${screening.patient_age}
- Sex: ${screening.patient_sex}
- Family History: ${JSON.stringify(screening.family_history)}
- Screening Type: ${screening.screening_type}
- Test Results: ${JSON.stringify(screening.test_results)}
- Clinical Notes: ${screening.clinical_notes || "None"}

Analyze the data and predict risks for relevant diseases including cancer types, heart disease, diabetes, kidney disease, liver disease, thyroid disorders, and any other conditions suggested by the data. For each disease, provide a risk percentage (0-100), confidence score (0-1), time horizon for potential onset, and recommended follow-up actions.

IMPORTANT: Base your analysis on established medical reference ranges and risk factors. Be thorough but evidence-based.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a medical AI specialist focused on early disease detection through blood tests, genetic screening, and biomarker analysis." },
          { role: "user", content: prompt },
        ],
        tools: [
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
                        disease_name: { type: "string", description: "Name of the disease" },
                        risk_percentage: { type: "number", description: "Risk percentage 0-100" },
                        confidence: { type: "number", description: "Confidence score 0-1" },
                        time_horizon: { type: "string", description: "e.g. '2-5 years', '5-10 years'" },
                        recommended_actions: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of recommended follow-up actions",
                        },
                      },
                      required: ["disease_name", "risk_percentage", "confidence", "time_horizon", "recommended_actions"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["assessments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_risk_assessments" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(JSON.stringify({ error: "AI returned no structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { assessments } = JSON.parse(toolCall.function.arguments);

    // Save risk assessments
    const inserts = assessments.map((a: any) => ({
      screening_id,
      disease_name: a.disease_name,
      risk_percentage: Math.min(100, Math.max(0, a.risk_percentage)),
      confidence: Math.min(1, Math.max(0, a.confidence)),
      time_horizon: a.time_horizon || "",
      recommended_actions: a.recommended_actions || [],
    }));

    if (inserts.length > 0) {
      await supabase.from("disease_risk_assessments").insert(inserts);
    }

    // Save biomarker profiles from test results
    const testResults = screening.test_results || {};
    const biomarkers: any[] = [];
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
    };

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

    // Mark screening as analyzed
    await supabase.from("health_screenings").update({ ai_analysis_complete: true, status: "analyzed" }).eq("id", screening_id);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication & authorization ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
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
    const allowed = (roles || []).some((r: any) => r.role === "doctor" || r.role === "admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { observations } = await req.json();

    if (!observations || !Array.isArray(observations) || observations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No observations provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Summarize data for the AI prompt
    const summary = buildSummary(observations);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert epidemiologist and disease surveillance analyst for the WHO. 
Analyze the provided health observation data from Africa and provide:
1. **Outbreak Risk Assessment**: Identify regions/symptoms with rising case counts that may indicate an emerging outbreak.
2. **Disease Predictions**: Based on symptom patterns, predict which diseases are most likely spreading and where.
3. **Trend Analysis**: Identify temporal trends — is the situation improving or worsening?
4. **Action Recommendations**: Concrete steps for health authorities to take now.
5. **Risk Score**: An overall risk score from 1-10 for the current surveillance period.

Be specific about locations, symptoms, and timelines. Use data-driven language. Format with clear headings.`,
          },
          {
            role: "user",
            content: `Here is the latest disease surveillance data from MedPulse Africa:\n\n${summary}\n\nAnalyze this data and provide your outbreak prediction and risk assessment report.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "outbreak_analysis",
              description: "Structured outbreak risk analysis and disease prediction",
              parameters: {
                type: "object",
                properties: {
                  overall_risk_score: { type: "number", description: "1-10 risk score" },
                  risk_label: { type: "string", enum: ["Low", "Moderate", "High", "Critical"] },
                  summary: { type: "string", description: "2-3 sentence executive summary" },
                  hotspots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        location: { type: "string" },
                        risk_level: { type: "string" },
                        predicted_disease: { type: "string" },
                        case_count: { type: "number" },
                        trend: { type: "string", enum: ["rising", "stable", "declining"] },
                        confidence: { type: "number" },
                      },
                      required: ["location", "risk_level", "predicted_disease", "case_count", "trend", "confidence"],
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                  },
                  trend_analysis: { type: "string", description: "Detailed trend analysis" },
                },
                required: ["overall_risk_score", "risk_label", "summary", "hotspots", "recommendations", "trend_analysis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "outbreak_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to content
    return new Response(
      JSON.stringify({ analysis: null, raw: result.choices?.[0]?.message?.content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("predict-outbreak error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSummary(observations: any[]): string {
  const total = observations.length;
  const totalCases = observations.reduce((s: number, o: any) => s + (o.case_count || 0), 0);

  // Group by country/region
  const byRegion: Record<string, { count: number; cases: number; symptoms: string[]; riskLevels: string[] }> = {};
  for (const o of observations) {
    const key = `${o.city}, ${o.region}, ${o.country}`;
    if (!byRegion[key]) byRegion[key] = { count: 0, cases: 0, symptoms: [], riskLevels: [] };
    byRegion[key].count++;
    byRegion[key].cases += o.case_count || 0;
    byRegion[key].symptoms.push(...(o.symptoms || []));
    byRegion[key].riskLevels.push(o.rule_risk_level);
  }

  const highRisk = observations.filter((o: any) => o.rule_risk_level === "High").length;
  const alerts = observations.filter((o: any) => o.outbreak_alert).length;

  let text = `Total Reports: ${total}\nTotal Cases: ${totalCases}\nHigh-Risk Reports: ${highRisk}\nOutbreak Alerts: ${alerts}\n\n`;
  text += "Regional Breakdown:\n";

  for (const [loc, data] of Object.entries(byRegion)) {
    const uniqueSymptoms = [...new Set(data.symptoms)].join(", ");
    text += `- ${loc}: ${data.count} reports, ${data.cases} cases, symptoms: [${uniqueSymptoms}], risk levels: [${data.riskLevels.join(", ")}]\n`;
  }

  // Recent timeline
  const sorted = [...observations].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  text += "\nMost Recent Reports:\n";
  for (const o of sorted.slice(0, 10)) {
    text += `- ${o.created_at}: ${o.city}, ${o.country} | ${o.case_count} cases | Symptoms: ${(o.symptoms || []).join(", ")} | Risk: ${o.rule_risk_level}\n`;
  }

  return text;
}

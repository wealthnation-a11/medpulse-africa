// Trend-based biomarker risk delta analysis
// Detects when values are TRENDING toward abnormal even if currently in range

export interface BiomarkerReading {
  biomarker_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  is_abnormal: boolean;
  created_at: string;
}

export type TrendSeverity = "stable" | "improving" | "concerning" | "critical";

export interface TrendInsight {
  biomarker: string;
  label: string;
  unit: string;
  currentValue: number;
  slopePerYear: number; // change in unit per year
  projected12Mo: number;
  monthsToAbnormal: number | null;
  severity: TrendSeverity;
  message: string;
  suggestedDisease?: string;
  recommendation?: string;
}

const LABELS: Record<string, string> = {
  hemoglobin: "Hemoglobin",
  wbc: "WBC",
  glucose: "Fasting Glucose",
  cholesterol_total: "Total Cholesterol",
  ldl: "LDL Cholesterol",
  hdl: "HDL Cholesterol",
  hba1c: "HbA1c",
  creatinine: "Creatinine",
  psa: "PSA",
  troponin: "Troponin I",
  crp: "CRP",
  tsh: "TSH",
  ferritin: "Ferritin",
  vitamin_d: "Vitamin D",
};

// Velocity rules drawn from clinical literature.
// `direction` is the worsening direction. Threshold in unit-per-year.
const VELOCITY_RULES: Record<string, { direction: "up" | "down"; threshold: number; disease: string; advice: string }> = {
  psa: { direction: "up", threshold: 0.75, disease: "Prostate cancer", advice: "Schedule urology referral and repeat PSA in 3 months." },
  hba1c: { direction: "up", threshold: 0.3, disease: "Type 2 diabetes", advice: "Initiate lifestyle counselling and recheck HbA1c in 3 months." },
  ldl: { direction: "up", threshold: 10, disease: "Cardiovascular disease", advice: "Lipid panel in 3 months; consider statin if persistent." },
  cholesterol_total: { direction: "up", threshold: 15, disease: "Cardiovascular disease", advice: "Repeat lipid panel and review diet/exercise." },
  creatinine: { direction: "up", threshold: 0.2, disease: "Chronic kidney disease", advice: "eGFR + urinalysis; nephrology referral if trajectory continues." },
  glucose: { direction: "up", threshold: 8, disease: "Pre-diabetes", advice: "Confirm with HbA1c and fasting glucose." },
  crp: { direction: "up", threshold: 1, disease: "Chronic inflammation", advice: "Investigate underlying inflammatory source." },
  hdl: { direction: "down", threshold: 5, disease: "Cardiovascular disease", advice: "Address with exercise; rule out metabolic syndrome." },
  hemoglobin: { direction: "down", threshold: 1, disease: "Anemia", advice: "Iron studies, B12, folate workup." },
};

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Compute trend insights for one patient given an array of biomarker readings.
 */
export function computeTrendInsights(readings: BiomarkerReading[]): TrendInsight[] {
  // Group by biomarker name
  const byName: Record<string, BiomarkerReading[]> = {};
  for (const r of readings) {
    (byName[r.biomarker_name] ||= []).push(r);
  }

  const insights: TrendInsight[] = [];

  for (const [name, list] of Object.entries(byName)) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const t0 = +new Date(sorted[0].created_at);
    const xs = sorted.map((r) => (+new Date(r.created_at) - t0) / (1000 * 60 * 60 * 24)); // days
    const ys = sorted.map((r) => r.value);
    const { slope } = linearRegression(xs, ys); // value per day
    const slopePerYear = slope * 365;
    const latest = sorted[sorted.length - 1];
    const current = latest.value;
    const projected12Mo = current + slopePerYear;

    const refHigh = latest.reference_range_high ?? null;
    const refLow = latest.reference_range_low ?? null;
    const rule = VELOCITY_RULES[name];

    // Compute months until value crosses the worsening reference bound
    let monthsToAbnormal: number | null = null;
    if (slope !== 0) {
      if (slope > 0 && refHigh !== null && current < refHigh) {
        monthsToAbnormal = ((refHigh - current) / slope) / 30;
      } else if (slope < 0 && refLow !== null && current > refLow) {
        monthsToAbnormal = ((refLow - current) / slope) / 30;
      }
      if (monthsToAbnormal !== null && (monthsToAbnormal < 0 || !isFinite(monthsToAbnormal))) {
        monthsToAbnormal = null;
      }
    }

    let severity: TrendSeverity = "stable";
    const worseningDir: "up" | "down" | null =
      refHigh !== null && slope > 0 ? "up" : refLow !== null && slope < 0 ? "down" : null;

    if (latest.is_abnormal && worseningDir) {
      severity = "critical";
    } else if (rule && Math.abs(slopePerYear) >= rule.threshold &&
               ((rule.direction === "up" && slopePerYear > 0) || (rule.direction === "down" && slopePerYear < 0))) {
      severity = "concerning";
    } else if (monthsToAbnormal !== null && monthsToAbnormal <= 12) {
      severity = "concerning";
    } else if ((slope > 0 && refLow !== null && current < refLow) || (slope < 0 && refHigh !== null && current > refHigh)) {
      severity = "improving";
    }

    const label = LABELS[name] || name;
    const direction = slopePerYear > 0 ? "rising" : slopePerYear < 0 ? "falling" : "stable";
    const rate = Math.abs(slopePerYear).toFixed(2);
    let message = `${label} ${direction} ${rate} ${latest.unit}/yr`;
    if (monthsToAbnormal !== null) {
      message += ` — projected to cross reference range in ~${Math.round(monthsToAbnormal)} months`;
    }

    insights.push({
      biomarker: name,
      label,
      unit: latest.unit,
      currentValue: current,
      slopePerYear,
      projected12Mo,
      monthsToAbnormal,
      severity,
      message,
      suggestedDisease: rule?.disease,
      recommendation: severity === "concerning" || severity === "critical" ? rule?.advice : undefined,
    });
  }

  // Sort: critical first, then concerning, by absolute slope
  const order: Record<TrendSeverity, number> = { critical: 0, concerning: 1, improving: 2, stable: 3 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity] || Math.abs(b.slopePerYear) - Math.abs(a.slopePerYear));
}

export function severityColor(s: TrendSeverity): string {
  switch (s) {
    case "critical": return "hsl(var(--risk-high))";
    case "concerning": return "hsl(var(--risk-medium))";
    case "improving": return "hsl(var(--risk-low))";
    default: return "hsl(var(--muted-foreground))";
  }
}
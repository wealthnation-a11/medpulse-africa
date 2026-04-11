export type RiskLevel = "High" | "Medium" | "Low";

export function calculateRiskLevel(
  symptoms: string[],
  caseCount: number
): RiskLevel {
  const hasFever = symptoms.includes("fever");
  const hasDiarrhea = symptoms.includes("diarrhea");
  const hasCough = symptoms.includes("cough");

  // High: cases >= 10 AND symptoms include both fever AND diarrhea
  if (caseCount >= 10 && hasFever && hasDiarrhea) {
    return "High";
  }

  // Medium: cases >= 5 AND symptoms include fever OR cough
  if (caseCount >= 5 && (hasFever || hasCough)) {
    return "Medium";
  }

  // Low: all other cases
  return "Low";
}

export function getRiskColor(level: RiskLevel | string): string {
  switch (level) {
    case "High":
      return "hsl(var(--risk-high))";
    case "Medium":
      return "hsl(var(--risk-medium))";
    case "Low":
      return "hsl(var(--risk-low))";
    default:
      return "hsl(var(--muted-foreground))";
  }
}

export function calculateScreeningRisk(
  age: number,
  sex: string,
  familyHistory: string[],
  testResults: Record<string, string | number>,
  screeningType: string
): RiskLevel {
  let riskScore = 0;

  // Age factor
  if (age >= 60) riskScore += 3;
  else if (age >= 45) riskScore += 2;
  else if (age >= 35) riskScore += 1;

  // Family history
  riskScore += Math.min(familyHistory.length, 4);

  // Abnormal values
  const numericResults = Object.entries(testResults).filter(([k, v]) => typeof v === "number" && k !== "preliminary_risk");
  const abnormalCount = numericResults.filter(([key, val]) => {
    const v = val as number;
    const refs: Record<string, [number, number]> = {
      hemoglobin: [12, 17.5], wbc: [4.5, 11], glucose: [70, 100],
      cholesterol_total: [0, 200], ldl: [0, 100], hba1c: [0, 5.7],
      creatinine: [0.6, 1.2], psa: [0, 4], troponin: [0, 0.04],
      crp: [0, 3], tsh: [0.4, 4],
    };
    const ref = refs[key];
    if (!ref) return false;
    return v < ref[0] || v > ref[1];
  }).length;

  riskScore += abnormalCount * 2;

  // Genetic positives
  const geneticPositives = Object.entries(testResults).filter(
    ([, v]) => v === "Positive" || v === "Homozygous"
  ).length;
  riskScore += geneticPositives * 3;

  if (riskScore >= 10) return "High";
  if (riskScore >= 5) return "Medium";
  return "Low";
}

export function getRiskBadgeClasses(level: RiskLevel | string): string {
  switch (level) {
    case "High":
      return "bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] border-[hsl(var(--risk-high)/0.3)]";
    case "Medium":
      return "bg-[hsl(var(--risk-medium)/0.15)] text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium)/0.3)]";
    case "Low":
      return "bg-[hsl(var(--risk-low)/0.15)] text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low)/0.3)]";
    default:
      return "";
  }
}

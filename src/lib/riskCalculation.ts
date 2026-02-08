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

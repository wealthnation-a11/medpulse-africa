import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Brain, Activity, Shield } from "lucide-react";

interface RiskAssessment {
  id: string;
  disease_name: string;
  risk_percentage: number;
  confidence: number;
  time_horizon: string;
  recommended_actions: string[];
}

interface Screening {
  id: string;
  patient_age: number;
  patient_sex: string;
  screening_type: string;
  status: string;
  ai_analysis_complete: boolean;
  created_at: string;
  test_results: Record<string, any>;
  family_history: string[];
  clinical_notes: string;
}

interface ScreeningResultsProps {
  screening: Screening;
  riskAssessments: RiskAssessment[];
}

export function ScreeningResults({ screening, riskAssessments }: ScreeningResultsProps) {
  const getRiskColor = (pct: number) => {
    if (pct >= 60) return "text-[hsl(var(--risk-high))]";
    if (pct >= 30) return "text-[hsl(var(--risk-medium))]";
    return "text-[hsl(var(--risk-low))]";
  };

  const getRiskBg = (pct: number) => {
    if (pct >= 60) return "bg-[hsl(var(--risk-high))]";
    if (pct >= 30) return "bg-[hsl(var(--risk-medium))]";
    return "bg-[hsl(var(--risk-low))]";
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {screening.ai_analysis_complete ? (
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--risk-low))]" />
            ) : (
              <Clock className="h-5 w-5 text-[hsl(var(--risk-medium))] animate-pulse" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {screening.ai_analysis_complete ? "AI Analysis Complete" : "Analysis in Progress..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {screening.screening_type.replace("_", " ")} • Patient: {screening.patient_age}yrs, {screening.patient_sex}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessments */}
      {riskAssessments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Disease Risk Assessment
            </CardTitle>
            <CardDescription>AI-predicted disease risks based on your screening data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskAssessments
              .sort((a, b) => b.risk_percentage - a.risk_percentage)
              .map((ra) => (
                <div key={ra.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ra.risk_percentage >= 60 ? (
                        <AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-high))]" />
                      ) : ra.risk_percentage >= 30 ? (
                        <Activity className="h-4 w-4 text-[hsl(var(--risk-medium))]" />
                      ) : (
                        <Shield className="h-4 w-4 text-[hsl(var(--risk-low))]" />
                      )}
                      <span className="font-semibold text-sm capitalize">{ra.disease_name}</span>
                    </div>
                    <span className={`text-lg font-bold ${getRiskColor(ra.risk_percentage)}`}>
                      {ra.risk_percentage}%
                    </span>
                  </div>
                  <Progress value={ra.risk_percentage} className={`h-2 ${getRiskBg(ra.risk_percentage)}`} />
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(ra.confidence * 100)}%</span>
                    {ra.time_horizon && <span>• Time horizon: {ra.time_horizon}</span>}
                  </div>
                  {ra.recommended_actions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {ra.recommended_actions.map((action, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ) : (
        !screening.ai_analysis_complete && (
          <Card>
            <CardContent className="py-8 text-center">
              <Brain className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">AI is analyzing your screening data...</p>
              <p className="text-xs text-muted-foreground mt-1">Results will appear here automatically</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

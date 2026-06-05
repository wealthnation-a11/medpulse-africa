import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Brain, Activity, Shield, Eye, GitCompare, ChevronDown } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ImagingOverlay, type ImagingRegion } from "@/components/screening/ImagingOverlay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RiskAssessment {
  id: string;
  disease_name: string;
  risk_percentage: number;
  confidence: number;
  time_horizon: string;
  recommended_actions: string[];
  rationale?: string;
  evidence?: string[];
  rule_based_level?: string | null;
  disagreement?: boolean;
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
  imaging_findings?: string;
  imaging_regions?: ImagingRegion[];
  patient_identifier?: string;
  patient_name?: string;
}

interface ScreeningResultsProps {
  screening: Screening;
  riskAssessments: RiskAssessment[];
}

export function ScreeningResults({ screening, riskAssessments }: ScreeningResultsProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [validation, setValidation] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("screening_validations")
        .select("*")
        .eq("screening_id", screening.id)
        .not("signed_off_at", "is", null)
        .order("signed_off_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setValidation(data || null);
    })();
  }, [screening.id]);

  useEffect(() => {
    const paths: string[] = Array.isArray(screening.test_results?.image_paths)
      ? screening.test_results.image_paths
      : [];
    if (screening.screening_type !== "imaging" || paths.length === 0) return;
    (async () => {
      const urls: string[] = [];
      for (const p of paths) {
        const { data } = await supabase.storage.from("medical-images").createSignedUrl(p, 600);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setImageUrls(urls);
    })();
  }, [screening.id]);

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
      {/* Doctor-revised banner */}
      {validation && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-sm">Doctor reviewed this screening</p>
                  <Badge variant="secondary" className="capitalize">{validation.validation_status}</Badge>
                  {validation.corrected_risk_level && validation.corrected_risk_level !== "none" && (
                    <Badge className="bg-primary text-primary-foreground">Revised risk: {validation.corrected_risk_level}</Badge>
                  )}
                </div>
                {validation.doctor_notes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{validation.doctor_notes}</p>
                )}
                {validation.signed_off_at && (
                  <p className="text-xs text-muted-foreground">Signed off {format(new Date(validation.signed_off_at), "PPp")}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 justify-between flex-wrap">
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
                {screening.patient_name ? ` • ${screening.patient_name}` : ""}
              </p>
            </div>
            </div>
            {screening.patient_identifier && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/patient/${encodeURIComponent(screening.patient_identifier)}`}>View patient profile</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Imaging findings */}
      {screening.screening_type === "imaging" && (screening.imaging_findings || imageUrls.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Imaging Findings
            </CardTitle>
            <CardDescription>
              {(screening.test_results?.imaging_type ?? "Image").toString().toUpperCase()}
              {screening.test_results?.body_region ? ` • ${screening.test_results.body_region}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {screening.imaging_findings ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{screening.imaging_findings}</p>
            ) : (
              <p className="text-xs text-muted-foreground">AI is reviewing the uploaded image(s)…</p>
            )}
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {imageUrls.map((u, i) => (
                  <div key={i} className="pt-5">
                    <ImagingOverlay
                      src={u}
                      regions={i === 0 ? (screening.imaging_regions || []) : []}
                      alt={`Medical image ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                      {ra.disagreement && (
                        <Badge variant="outline" className="border-[hsl(var(--risk-medium))] text-[hsl(var(--risk-medium))] gap-1">
                          <GitCompare className="h-3 w-3" />
                          Models disagree
                        </Badge>
                      )}
                    </div>
                    <span className={`text-lg font-bold ${getRiskColor(ra.risk_percentage)}`}>
                      {ra.risk_percentage}%
                    </span>
                  </div>
                  <Progress value={ra.risk_percentage} className={`h-2 ${getRiskBg(ra.risk_percentage)}`} />
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(ra.confidence * 100)}%</span>
                    {ra.time_horizon && <span>• Time horizon: {ra.time_horizon}</span>}
                    {ra.rule_based_level && <span>• Rule-based: {ra.rule_based_level}</span>}
                  </div>
                  {(ra.rationale || (ra.evidence && ra.evidence.length > 0)) && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <ChevronDown className="h-3 w-3" />
                        Why this risk?
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-2">
                        {ra.rationale && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{ra.rationale}</p>
                        )}
                        {ra.evidence && ra.evidence.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1">Evidence:</p>
                            <ul className="space-y-1">
                              {ra.evidence.map((ev, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-primary mt-0.5">•</span>
                                  {ev}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
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

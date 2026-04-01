import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Shield,
  Lightbulb,
  BarChart3,
  RefreshCw,
} from "lucide-react";

interface Hotspot {
  location: string;
  risk_level: string;
  predicted_disease: string;
  case_count: number;
  trend: "rising" | "stable" | "declining";
  confidence: number;
}

interface AnalysisResult {
  overall_risk_score: number;
  risk_label: string;
  summary: string;
  hotspots: Hotspot[];
  recommendations: string[];
  trend_analysis: string;
}

interface OutbreakPredictionProps {
  observations: any[];
}

export function OutbreakPrediction({ observations }: OutbreakPredictionProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const { toast } = useToast();

  const runAnalysis = async () => {
    if (observations.length === 0) {
      toast({ title: "No data", description: "Submit observations first to enable AI analysis.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-outbreak", {
        body: { observations: observations.slice(0, 100) },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Analysis failed", description: data.error, variant: "destructive" });
        return;
      }

      if (data?.analysis) {
        setAnalysis(data.analysis);
        setLastRun(new Date());
        toast({ title: "Analysis complete", description: "AI outbreak prediction is ready." });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to run analysis", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "rising") return <TrendingUp className="h-4 w-4 text-[hsl(var(--risk-high))]" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-[hsl(var(--risk-low))]" />;
    return <Minus className="h-4 w-4 text-[hsl(var(--risk-medium))]" />;
  };

  const riskColor = (label: string) => {
    if (label === "Critical" || label === "High") return "text-[hsl(var(--risk-high))]";
    if (label === "Moderate") return "text-[hsl(var(--risk-medium))]";
    return "text-[hsl(var(--risk-low))]";
  };

  const riskBg = (label: string) => {
    if (label === "Critical" || label === "High") return "bg-[hsl(var(--risk-high)/0.1)] border-[hsl(var(--risk-high)/0.2)]";
    if (label === "Moderate") return "bg-[hsl(var(--risk-medium)/0.1)] border-[hsl(var(--risk-medium)/0.2)]";
    return "bg-[hsl(var(--risk-low)/0.1)] border-[hsl(var(--risk-low)/0.2)]";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Outbreak Prediction Engine
            </CardTitle>
            <CardDescription className="mt-1">
              AI-powered analysis of observation data to predict potential outbreaks
            </CardDescription>
          </div>
          <Button onClick={runAnalysis} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loading ? "Analyzing..." : analysis ? "Re-analyze" : "Run Analysis"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!analysis && !loading && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Click "Run Analysis" to generate AI-powered outbreak predictions from {observations.length} observations
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing {observations.length} observations for outbreak patterns...</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-5">
            {/* Risk Score */}
            <div className={`rounded-xl border p-4 ${riskBg(analysis.risk_label)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${riskColor(analysis.risk_label)}`} />
                  <span className="font-semibold text-sm">Overall Risk Assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${riskColor(analysis.risk_label)}`}>
                    {analysis.overall_risk_score}/10
                  </span>
                  <Badge className={`${riskColor(analysis.risk_label)} bg-transparent border`}>
                    {analysis.risk_label}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            </div>

            {/* Hotspots */}
            {analysis.hotspots.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Predicted Hotspots
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {analysis.hotspots.map((h, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{h.location}</span>
                        <TrendIcon trend={h.trend} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="secondary" className="text-xs">{h.predicted_disease}</Badge>
                        <Badge variant="outline" className="text-xs">{h.case_count} cases</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{h.trend}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Confidence: {Math.round(h.confidence * 100)}%</span>
                        <span className={riskColor(h.risk_level)}>{h.risk_level} Risk</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend Analysis */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Trend Analysis
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.trend_analysis}</p>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  Action Recommendations
                </h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lastRun && (
              <p className="text-xs text-muted-foreground text-right">
                Last analyzed: {lastRun.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

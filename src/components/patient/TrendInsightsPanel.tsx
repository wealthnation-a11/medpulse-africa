import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, Activity } from "lucide-react";
import { computeTrendInsights, type BiomarkerReading, type TrendInsight, type TrendSeverity } from "@/lib/trendAnalysis";

interface Props {
  readings: BiomarkerReading[];
  title?: string;
  description?: string;
}

const severityBadge: Record<TrendSeverity, string> = {
  critical: "bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] border-[hsl(var(--risk-high)/0.3)]",
  concerning: "bg-[hsl(var(--risk-medium)/0.15)] text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium)/0.3)]",
  improving: "bg-[hsl(var(--risk-low)/0.15)] text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low)/0.3)]",
  stable: "bg-muted text-muted-foreground border-border",
};

export function TrendInsightsPanel({ readings, title = "Trend-Based Risk Insights", description = "Early signals detected from biomarker velocity over time" }: Props) {
  const insights = computeTrendInsights(readings);
  const actionable = insights.filter((i) => i.severity === "critical" || i.severity === "concerning");

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>Two or more screenings needed per biomarker to detect trends.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Submit additional screenings to unlock trajectory analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
          {actionable.length > 0 && (
            <Badge className="bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] ml-1">
              {actionable.length} actionable
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((i) => (
          <InsightRow key={i.biomarker} insight={i} />
        ))}
      </CardContent>
    </Card>
  );
}

function InsightRow({ insight }: { insight: TrendInsight }) {
  const Icon = insight.severity === "critical" ? AlertTriangle
    : insight.slopePerYear > 0 ? TrendingUp
    : insight.slopePerYear < 0 ? TrendingDown
    : Activity;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: `var(--insight-color)` }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{insight.label}</p>
            <p className="text-xs text-muted-foreground">{insight.message}</p>
          </div>
        </div>
        <Badge variant="outline" className={severityBadge[insight.severity]}>
          {insight.severity}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border">
        <Stat label="Current" value={`${insight.currentValue} ${insight.unit}`} />
        <Stat label="12-mo projection" value={`${insight.projected12Mo.toFixed(1)} ${insight.unit}`} />
        <Stat label="Velocity" value={`${insight.slopePerYear >= 0 ? "+" : ""}${insight.slopePerYear.toFixed(2)}/yr`} />
      </div>
      {insight.suggestedDisease && (insight.severity === "critical" || insight.severity === "concerning") && (
        <div className="text-xs bg-muted/50 rounded-md p-2 mt-1">
          <span className="font-semibold">Disease trajectory:</span> {insight.suggestedDisease}
          {insight.recommendation && <p className="mt-1 text-muted-foreground">{insight.recommendation}</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OverviewCharts } from "./OverviewCharts";
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  FileText,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { getRiskBadgeClasses } from "@/lib/riskCalculation";

interface Observation {
  id: string;
  country: string;
  region: string;
  city: string;
  symptoms: string[];
  case_count: number;
  rule_risk_level: string;
  ai_risk_level: string | null;
  predicted_diseases: string[] | null;
  confidence_scores: number[] | null;
  outbreak_alert: boolean;
  status: string;
  created_at: string;
}

interface DoctorDashboardProps {
  observations: Observation[];
  displayName: string;
  casesOverTime: { date: string; cases: number }[];
  symptomChartData: { name: string; count: number }[];
}

export function DoctorDashboard({
  observations,
  displayName,
  casesOverTime,
  symptomChartData,
}: DoctorDashboardProps) {
  const totalReports = observations.length;
  const highRiskCount = observations.filter((o) => o.rule_risk_level === "High").length;
  const activeAlerts = observations.filter((o) => o.outbreak_alert).length;
  const totalCases = observations.reduce((sum, o) => sum + o.case_count, 0);

  const pendingCount = observations.filter((o) => o.status === "pending").length;
  const validatedCount = observations.filter((o) => o.status === "validated").length;
  const rejectedCount = observations.filter((o) => o.status === "rejected").length;

  const uniqueCountries = new Set(observations.map((o) => o.country)).size;
  const uniqueRegions = new Set(observations.map((o) => o.region)).size;

  const highRiskPending = observations
    .filter((o) => o.rule_risk_level === "High" && o.status === "pending")
    .slice(0, 5);

  const recentAlerts = observations.filter((o) => o.outbreak_alert).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Professional header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">
            Clinical Intelligence Hub
          </p>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dr. {displayName || "Doctor"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Disease surveillance overview &amp; validation portal
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/submit">
              <FileText className="mr-2 h-4 w-4" />
              Submit Report
            </Link>
          </Button>
          <Button asChild>
            <Link to="/validations">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Review Cases
            </Link>
          </Button>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label="Total Reports"
          value={totalReports}
          accent="primary"
        />
        <MetricCard
          icon={AlertTriangle}
          label="High Risk"
          value={highRiskCount}
          accent="destructive"
          highlight={highRiskCount > 0}
        />
        <MetricCard
          icon={Activity}
          label="Outbreak Alerts"
          value={activeAlerts}
          accent="accent"
          highlight={activeAlerts > 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Total Cases"
          value={totalCases}
          accent="primary"
        />
      </div>

      {/* Validation status + coverage */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Validation Pipeline</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/validations">
                  View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              <PipelineRow icon={Clock} label="Awaiting Review" count={pendingCount} color="text-amber-600" />
              <PipelineRow icon={CheckCircle2} label="Validated" count={validatedCount} color="text-emerald-600" />
              <PipelineRow icon={XCircle} label="Rejected" count={rejectedCount} color="text-red-500" />
            </div>
            {pendingCount > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-amber-600">{pendingCount}</span> observations need your expert review
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4">Geographic Coverage</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueCountries}</p>
                  <p className="text-xs text-muted-foreground">Countries</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2.5">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueRegions}</p>
                  <p className="text-xs text-muted-foreground">Regions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4">Validation Rate</h3>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-4xl font-bold text-primary">
                {totalReports > 0 ? Math.round((validatedCount / totalReports) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground mb-1">validated</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-3">
              <div
                className="bg-primary rounded-full h-2.5 transition-all"
                style={{ width: `${totalReports > 0 ? (validatedCount / totalReports) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{validatedCount} validated</span>
              <span>{totalReports} total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <OverviewCharts casesOverTime={casesOverTime} symptomChartData={symptomChartData} />

      {/* High-risk pending + outbreak alerts side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-[hsl(var(--risk-high)/0.2)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-high))]" />
              High-Risk Pending Review
            </CardTitle>
            <CardDescription>These reports require urgent medical assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {highRiskPending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                ✅ No high-risk reports pending review
              </p>
            ) : (
              <div className="space-y-3">
                {highRiskPending.map((obs) => (
                  <ObservationRow key={obs.id} obs={obs} />
                ))}
                <Button variant="outline" className="w-full mt-2" asChild>
                  <Link to="/validations">Review All Pending Cases</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Active Outbreak Alerts
            </CardTitle>
            <CardDescription>Flagged observations indicating potential outbreaks</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active outbreak alerts
              </p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((obs) => (
                  <ObservationRow key={obs.id} obs={obs} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: any;
  label: string;
  value: number;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)] shadow-sm" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${accent === "destructive" ? "bg-[hsl(var(--risk-high)/0.1)]" : accent === "accent" ? "bg-accent/10" : "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${accent === "destructive" ? "text-[hsl(var(--risk-high))]" : accent === "accent" ? "text-accent" : "text-primary"}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineRow({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-semibold text-sm">{count}</span>
    </div>
  );
}

function ObservationRow({ obs }: { obs: any }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{obs.city}, {obs.region}</span>
          <Badge className={getRiskBadgeClasses(obs.rule_risk_level)}>
            {obs.rule_risk_level}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {obs.symptoms.slice(0, 3).map((s: string) => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
          {obs.symptoms.length > 3 && (
            <Badge variant="secondary" className="text-xs">+{obs.symptoms.length - 3}</Badge>
          )}
        </div>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(obs.created_at), "MMM dd")}
      </span>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewCharts } from "./OverviewCharts";
import { ObservationHeatmap } from "./ObservationHeatmap";
import { ObservationFilters, applyFilters, INITIAL_FILTERS, type FilterState } from "./ObservationFilters";
import { OutbreakPrediction } from "./OutbreakPrediction";
import { ScreeningIntelligence } from "./ScreeningIntelligence";
import { PatientHealthTimeline } from "./PatientHealthTimeline";
import { SignOffQueue } from "./SignOffQueue";
import { PatientsList } from "./PatientsList";
import { FollowUpsCard } from "./FollowUpsCard";
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
  Globe,
  Microscope,
  BarChart3,
  Zap,
  HeartPulse,
  FlaskConical,
  Users,
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
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const filtered = useMemo(() => applyFilters(observations, filters), [observations, filters]);

  const totalReports = filtered.length;
  const highRiskCount = filtered.filter((o) => o.rule_risk_level === "High").length;
  const mediumRiskCount = filtered.filter((o) => o.rule_risk_level === "Medium").length;
  const activeAlerts = filtered.filter((o) => o.outbreak_alert).length;
  const totalCases = filtered.reduce((sum, o) => sum + o.case_count, 0);

  const pendingCount = filtered.filter((o) => o.status === "pending").length;
  const validatedCount = filtered.filter((o) => o.status === "validated").length;
  const rejectedCount = filtered.filter((o) => o.status === "rejected").length;

  const uniqueCountries = new Set(filtered.map((o) => o.country)).size;
  const uniqueRegions = new Set(filtered.map((o) => o.region)).size;

  const highRiskPending = filtered
    .filter((o) => o.rule_risk_level === "High" && o.status === "pending")
    .slice(0, 5);

  const recentAlerts = filtered.filter((o) => o.outbreak_alert).slice(0, 5);

  const diseaseFrequency = filtered
    .flatMap((o) => o.predicted_diseases || [])
    .reduce((acc: Record<string, number>, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const topDiseases = Object.entries(diseaseFrequency).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5);

  const validationRate = totalReports > 0 ? Math.round((validatedCount / totalReports) * 100) : 0;

  // Filtered chart data
  const filteredCasesOverTime = filtered
    .reduce((acc: { date: string; cases: number }[], obs) => {
      const date = format(new Date(obs.created_at), "MMM dd");
      const existing = acc.find((d) => d.date === date);
      if (existing) existing.cases += obs.case_count;
      else acc.push({ date, cases: obs.case_count });
      return acc;
    }, [])
    .reverse()
    .slice(-14);

  const filteredSymptomData = (() => {
    const freq = filtered.flatMap((o) => o.symptoms).reduce((acc: Record<string, number>, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    return Object.entries(freq).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count: count as number })).sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="space-y-6">
      {/* Professional header */}
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--foreground))] to-[hsl(160_25%_18%)] p-6 sm:p-8 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Microscope className="h-5 w-5 opacity-80" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Clinical Intelligence Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Dr. {displayName || "Doctor"}</h1>
            <p className="opacity-70 mt-1 text-sm">Early disease detection • Screening intelligence • Outbreak surveillance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" asChild>
              <Link to="/submit-screening"><FlaskConical className="mr-2 h-4 w-4" />New Screening</Link>
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/validations"><ShieldCheck className="mr-2 h-4 w-4" />Review Cases ({pendingCount})</Link>
            </Button>
          </div>
        </div>
        {(highRiskCount > 0 || activeAlerts > 0) && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-sm">
            {highRiskCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <span className="font-medium">{highRiskCount} high-risk reports require attention</span>
              </div>
            )}
            {activeAlerts > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-medium">{activeAlerts} active outbreak alerts</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs for Screening Intelligence vs Outbreak Surveillance */}
      <Tabs defaultValue="screening" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="screening" className="flex items-center gap-2"><FlaskConical className="h-4 w-4" />Screening Intelligence</TabsTrigger>
          <TabsTrigger value="signoff" className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Sign-Off Queue</TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2"><Users className="h-4 w-4" />Patients</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Health Timeline</TabsTrigger>
          <TabsTrigger value="surveillance" className="flex items-center gap-2"><Activity className="h-4 w-4" />Outbreak Surveillance</TabsTrigger>
        </TabsList>

        <TabsContent value="screening">
          <ScreeningIntelligence />
        </TabsContent>

        <TabsContent value="signoff">
          <SignOffQueue />
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <FollowUpsCard />
          <PatientsList />
        </TabsContent>

        <TabsContent value="timeline">
          <PatientHealthTimeline />
        </TabsContent>

        <TabsContent value="surveillance" className="space-y-6">

      {/* Filters */}
      <ObservationFilters
        observations={observations}
        filters={filters}
        onFiltersChange={setFilters}
        filteredCount={filtered.length}
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={FileText} label="Total Reports" value={totalReports} accent="primary" />
        <MetricCard icon={AlertTriangle} label="High Risk" value={highRiskCount} accent="destructive" highlight={highRiskCount > 0} />
        <MetricCard icon={Activity} label="Outbreak Alerts" value={activeAlerts} accent="accent" highlight={activeAlerts > 0} />
        <MetricCard icon={TrendingUp} label="Total Cases" value={totalCases} accent="primary" />
      </div>

      {/* Validation + Coverage + Rate */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Validation Pipeline</h3>
              <Button variant="ghost" size="sm" asChild><Link to="/validations">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
            </div>
            <div className="space-y-3">
              <PipelineRow icon={Clock} label="Awaiting Review" count={pendingCount} color="text-amber-600" />
              <PipelineRow icon={CheckCircle2} label="Validated" count={validatedCount} color="text-emerald-600" />
              <PipelineRow icon={XCircle} label="Rejected" count={rejectedCount} color="text-red-500" />
            </div>
            {pendingCount > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button className="w-full" size="sm" asChild>
                  <Link to="/validations"><Zap className="mr-2 h-3.5 w-3.5" />Review {pendingCount} Pending Cases</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Geographic Coverage</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Globe className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{uniqueCountries}</p><p className="text-xs text-muted-foreground">Countries Monitored</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2.5"><MapPin className="h-5 w-5 text-accent" /></div>
                <div><p className="text-2xl font-bold">{uniqueRegions}</p><p className="text-xs text-muted-foreground">Active Regions</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" />Validation Rate</h3>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-4xl font-bold text-primary">{validationRate}%</p>
              <p className="text-sm text-muted-foreground mb-1">validated</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-3">
              <div className="bg-primary rounded-full h-2.5 transition-all" style={{ width: `${validationRate}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{validatedCount} validated</span><span>{totalReports} total</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk + Disease cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4">Risk Distribution</h3>
            <div className="space-y-3">
              <RiskBar label="High" count={highRiskCount} total={totalReports} color="bg-[hsl(var(--risk-high))]" />
              <RiskBar label="Medium" count={mediumRiskCount} total={totalReports} color="bg-[hsl(var(--risk-medium))]" />
              <RiskBar label="Low" count={totalReports - highRiskCount - mediumRiskCount} total={totalReports} color="bg-[hsl(var(--risk-low))]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Microscope className="h-4 w-4 text-primary" />Top Predicted Diseases</h3>
            {topDiseases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No AI predictions yet</p>
            ) : (
              <div className="space-y-2">
                {topDiseases.map(([disease, count]) => (
                  <div key={disease} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{disease}</span>
                    <Badge variant="secondary">{count as number} cases</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Prediction */}
      <OutbreakPrediction observations={filtered} />

      {/* Heatmap */}
      <ObservationHeatmap observations={filtered} />

      {/* Charts */}
      <OverviewCharts casesOverTime={filteredCasesOverTime} symptomChartData={filteredSymptomData} />

      {/* High-risk + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-[hsl(var(--risk-high)/0.2)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-high))]" />High-Risk Pending Review</CardTitle>
            <CardDescription>These reports require urgent medical assessment</CardDescription>
          </CardHeader>
          <CardContent>
            {highRiskPending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">✅ No high-risk reports pending review</p>
            ) : (
              <div className="space-y-3">
                {highRiskPending.map((obs) => (<ObservationRow key={obs.id} obs={obs} />))}
                <Button variant="outline" className="w-full mt-2" asChild><Link to="/validations">Review All Pending Cases</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-accent" />Active Outbreak Alerts</CardTitle>
            <CardDescription>Flagged observations indicating potential outbreaks</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active outbreak alerts</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((obs) => (<ObservationRow key={obs.id} obs={obs} />))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent, highlight }: { icon: any; label: string; value: number; accent: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)] shadow-sm" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${accent === "destructive" ? "bg-[hsl(var(--risk-high)/0.1)]" : accent === "accent" ? "bg-accent/10" : "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${accent === "destructive" ? "text-[hsl(var(--risk-high))]" : accent === "accent" ? "text-accent" : "text-primary"}`} />
          </div>
          <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineRow({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><span className="text-sm">{label}</span></div>
      <span className="font-semibold text-sm">{count}</span>
    </div>
  );
}

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="font-medium">{label}</span><span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span></div>
      <div className="w-full bg-muted rounded-full h-2"><div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ObservationRow({ obs }: { obs: Observation }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{obs.city}, {obs.region}</span>
          <Badge className={getRiskBadgeClasses(obs.rule_risk_level)}>{obs.rule_risk_level}</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {obs.symptoms.slice(0, 3).map((s) => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
          {obs.symptoms.length > 3 && <Badge variant="secondary" className="text-xs">+{obs.symptoms.length - 3}</Badge>}
        </div>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(obs.created_at), "MMM dd")}</span>
    </div>
  );
}

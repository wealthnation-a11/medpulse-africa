import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCards } from "./StatsCards";
import { OverviewCharts } from "./OverviewCharts";
import {
  FileText,
  ClipboardList,
  TrendingUp,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

interface VolunteerDashboardProps {
  observations: Observation[];
  displayName: string;
  casesOverTime: { date: string; cases: number }[];
  symptomChartData: { name: string; count: number }[];
}

export function VolunteerDashboard({
  observations,
  displayName,
  casesOverTime,
  symptomChartData,
}: VolunteerDashboardProps) {
  const totalReports = observations.length;
  const highRiskCount = observations.filter((o) => o.rule_risk_level === "High").length;
  const activeAlerts = observations.filter((o) => o.outbreak_alert).length;
  const totalCases = observations.reduce((sum, o) => sum + o.case_count, 0);

  const pendingCount = observations.filter((o) => o.status === "pending").length;
  const validatedCount = observations.filter((o) => o.status === "validated").length;

  const recentObs = observations.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, {displayName || "Volunteer"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Your reports help protect communities across Africa.
          </p>
        </div>
        <Button asChild>
          <Link to="/submit">
            <FileText className="mr-2 h-4 w-4" />
            Submit Observation
          </Link>
        </Button>
      </div>

      <StatsCards
        totalReports={totalReports}
        highRiskCount={highRiskCount}
        activeAlerts={activeAlerts}
        totalCases={totalCases}
      />

      {/* Quick action cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold">{validatedCount}</p>
            <p className="text-sm text-muted-foreground">Validated</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 hover:border-accent/40 transition-colors">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="rounded-full bg-accent/10 p-3 mb-3">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <p className="text-2xl font-bold">{totalCases}</p>
            <p className="text-sm text-muted-foreground">Total Cases Reported</p>
          </CardContent>
        </Card>
      </div>

      <OverviewCharts casesOverTime={casesOverTime} symptomChartData={symptomChartData} />

      {/* Recent submissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your Recent Submissions</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-submissions">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentObs.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No submissions yet. Start reporting to make an impact!</p>
              <Button className="mt-4" asChild>
                <Link to="/submit">Submit Your First Observation</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentObs.map((obs) => (
                <div
                  key={obs.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{obs.city}, {obs.region}</span>
                    </div>
                    <Badge className={getRiskBadgeClasses(obs.rule_risk_level)} >
                      {obs.rule_risk_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusDot status={obs.status} />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(obs.created_at), "MMM dd")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500",
    validated: "bg-emerald-500",
    rejected: "bg-red-500",
  };
  return (
    <span className="flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${colors[status] || "bg-muted"}`} />
      {status}
    </span>
  );
}

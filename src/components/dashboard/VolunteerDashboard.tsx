import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewCharts } from "./OverviewCharts";
import { ScreeningResults } from "@/components/screening/ScreeningResults";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText,
  ClipboardList,
  TrendingUp,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HeartPulse,
  Users,
  Shield,
  Sparkles,
  FlaskConical,
  Dna,
  Activity,
  Brain,
  Eye,
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
  const rejectedCount = observations.filter((o) => o.status === "rejected").length;
  const uniqueRegions = new Set(observations.map((o) => o.region)).size;

  const recentObs = observations.slice(0, 5);

  // Impact score — gamification element
  const impactScore = validatedCount * 10 + totalReports * 3 + totalCases;

  return (
    <div className="space-y-6">
      {/* Hero welcome banner */}
      <div className="rounded-2xl gradient-primary p-6 sm:p-8 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90 uppercase tracking-wider">Community Health Reporter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">
              Welcome back, {displayName || "Volunteer"} 👋
            </h1>
            <p className="mt-1 opacity-80 text-sm sm:text-base">
              Your reports help protect communities across Africa. Every observation counts.
            </p>
          </div>
          <Button variant="secondary" size="lg" asChild className="shrink-0">
            <Link to="/submit">
              <FileText className="mr-2 h-4 w-4" />
              Submit Observation
            </Link>
          </Button>
        </div>
      </div>

      {/* Impact + Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="col-span-2 lg:col-span-1 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="rounded-full gradient-primary p-3 mb-3">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-3xl font-bold text-primary">{impactScore}</p>
            <p className="text-xs text-muted-foreground font-medium">Impact Score</p>
          </CardContent>
        </Card>
        <StatMini icon={FileText} label="Reports" value={totalReports} />
        <StatMini icon={AlertTriangle} label="High Risk" value={highRiskCount} highlight={highRiskCount > 0} />
        <StatMini icon={TrendingUp} label="Total Cases" value={totalCases} />
        <StatMini icon={MapPin} label="Regions" value={uniqueRegions} />
      </div>

      {/* Submission pipeline */}
      <div className="grid sm:grid-cols-3 gap-4">
        <PipelineCard icon={Clock} label="Pending Review" count={pendingCount} color="text-amber-600" bgColor="bg-amber-500/10" />
        <PipelineCard icon={CheckCircle2} label="Validated" count={validatedCount} color="text-emerald-600" bgColor="bg-emerald-500/10" />
        <PipelineCard icon={Shield} label="Rejected" count={rejectedCount} color="text-red-500" bgColor="bg-red-500/10" />
      </div>

      {/* Charts */}
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
                    <Badge className={getRiskBadgeClasses(obs.rule_risk_level)}>
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

      {/* Quick tips */}
      <Card className="border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2 shrink-0">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">How to increase your impact</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Report observations consistently from your area</li>
                <li>• Include as many symptoms and accurate case counts as possible</li>
                <li>• Add weather data (temperature, rainfall) when available</li>
                <li>• Your validated reports contribute directly to outbreak prevention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)]" : ""}>
      <CardContent className="pt-5 pb-4 flex flex-col items-center text-center">
        <Icon className={`h-5 w-5 mb-1.5 ${highlight ? "text-[hsl(var(--risk-high))]" : "text-primary"}`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function PipelineCard({ icon: Icon, label, count, color, bgColor }: { icon: any; label: string; count: number; color: string; bgColor: string }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`rounded-full p-3 ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
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

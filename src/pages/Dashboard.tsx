import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { ObservationsTable } from "@/components/dashboard/ObservationsTable";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

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

export default function Dashboard() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setObservations(data as Observation[]);
    }
    setLoading(false);
  };

  // Stats
  const totalReports = observations.length;
  const highRiskCount = observations.filter(
    (o) => o.rule_risk_level === "High"
  ).length;
  const activeAlerts = observations.filter((o) => o.outbreak_alert).length;
  const totalCases = observations.reduce((sum, o) => sum + o.case_count, 0);

  // Chart data — cases over time
  const casesOverTime = observations
    .reduce((acc: { date: string; cases: number }[], obs) => {
      const date = format(new Date(obs.created_at), "MMM dd");
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.cases += obs.case_count;
      } else {
        acc.push({ date, cases: obs.case_count });
      }
      return acc;
    }, [])
    .reverse()
    .slice(-14);

  // Symptom frequency
  const symptomFrequency = observations
    .flatMap((o) => o.symptoms)
    .reduce((acc: Record<string, number>, symptom) => {
      acc[symptom] = (acc[symptom] || 0) + 1;
      return acc;
    }, {});

  const symptomChartData = Object.entries(symptomFrequency)
    .map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time disease surveillance overview
          </p>
        </div>

        <StatsCards
          totalReports={totalReports}
          highRiskCount={highRiskCount}
          activeAlerts={activeAlerts}
          totalCases={totalCases}
        />

        <OverviewCharts
          casesOverTime={casesOverTime}
          symptomChartData={symptomChartData}
        />

        <ObservationsTable
          observations={observations}
          title="Recent Observations"
          showStatusFilter
        />
      </div>
    </AppLayout>
  );
}

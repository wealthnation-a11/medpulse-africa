import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { VolunteerDashboard } from "@/components/dashboard/VolunteerDashboard";
import { DoctorDashboard } from "@/components/dashboard/DoctorDashboard";
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
  const { hasRole, displayName } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObservations();

    const channel = supabase
      .channel("observations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "observations" },
        () => {
          fetchObservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Shared chart data
  const casesOverTime = observations
    .reduce((acc: { date: string; cases: number }[], obs) => {
      const date = format(new Date(obs.created_at), "MMM dd");
      const existing = acc.find((d) => d.date === date);
      if (existing) existing.cases += obs.case_count;
      else acc.push({ date, cases: obs.case_count });
      return acc;
    }, [])
    .reverse()
    .slice(-14);

  const symptomFrequency = observations
    .flatMap((o) => o.symptoms)
    .reduce((acc: Record<string, number>, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

  const symptomChartData = Object.entries(symptomFrequency)
    .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
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

  const isDoctor = hasRole("doctor");

  return (
    <AppLayout>
      {isDoctor ? (
        <DoctorDashboard
          observations={observations}
          displayName={displayName}
          casesOverTime={casesOverTime}
          symptomChartData={symptomChartData}
        />
      ) : (
        <VolunteerDashboard
          observations={observations}
          displayName={displayName}
          casesOverTime={casesOverTime}
          symptomChartData={symptomChartData}
        />
      )}
    </AppLayout>
  );
}

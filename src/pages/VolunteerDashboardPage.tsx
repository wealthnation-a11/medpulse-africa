import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { VolunteerDashboard } from "@/components/dashboard/VolunteerDashboard";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function VolunteerDashboardPage() {
  const { displayName } = useAuth();
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObs = async () => {
      const { data } = await supabase.from("observations").select("*").order("created_at", { ascending: false });
      if (data) setObservations(data);
      setLoading(false);
    };
    fetchObs();
    const channel = supabase
      .channel("vol-obs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "observations" }, fetchObs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const casesOverTime = observations
    .reduce((acc: { date: string; cases: number }[], o) => {
      const date = format(new Date(o.created_at), "MMM dd");
      const e = acc.find((d) => d.date === date);
      if (e) e.cases += o.case_count; else acc.push({ date, cases: o.case_count });
      return acc;
    }, []).reverse().slice(-14);
  const freq = observations.flatMap((o: any) => o.symptoms).reduce((a: Record<string, number>, s: string) => { a[s] = (a[s] || 0) + 1; return a; }, {});
  const symptomChartData = Object.entries(freq).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count: count as number })).sort((a, b) => b.count - a.count);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }
  return (
    <AppLayout>
      <VolunteerDashboard observations={observations} displayName={displayName} casesOverTime={casesOverTime} symptomChartData={symptomChartData} />
    </AppLayout>
  );
}
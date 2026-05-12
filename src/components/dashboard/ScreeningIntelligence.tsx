import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScreeningResults } from "@/components/screening/ScreeningResults";
import {
  Brain, FlaskConical, Dna, Activity, AlertTriangle, Clock,
  CheckCircle2, TrendingUp, Users, Loader2, Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Screening {
  id: string;
  submitted_by: string;
  patient_age: number;
  patient_sex: string;
  family_history: string[];
  screening_type: string;
  test_results: Record<string, any>;
  clinical_notes: string;
  status: string;
  ai_analysis_complete: boolean;
  created_at: string;
  patient_identifier?: string;
  patient_name?: string;
}

interface RiskAssessment {
  id: string;
  screening_id: string;
  disease_name: string;
  risk_percentage: number;
  confidence: number;
  time_horizon: string;
  recommended_actions: string[];
}

export function ScreeningIntelligence() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("screening-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "health_screenings" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const [sRes, rRes] = await Promise.all([
      supabase.from("health_screenings").select("*").order("created_at", { ascending: false }),
      supabase.from("disease_risk_assessments").select("*"),
    ]);
    if (sRes.data) setScreenings(sRes.data as any[]);
    if (rRes.data) setRiskAssessments(rRes.data as any[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalScreenings = screenings.length;
  const analyzed = screenings.filter((s) => s.ai_analysis_complete).length;
  const pending = totalScreenings - analyzed;
  const highRiskCount = riskAssessments.filter((r) => r.risk_percentage >= 60).length;

  const typeCount = (t: string) => screenings.filter((s) => s.screening_type === t).length;

  // Top diseases across all assessments
  const diseaseMap: Record<string, { total: number; count: number }> = {};
  riskAssessments.forEach((r) => {
    if (!diseaseMap[r.disease_name]) diseaseMap[r.disease_name] = { total: 0, count: 0 };
    diseaseMap[r.disease_name].total += r.risk_percentage;
    diseaseMap[r.disease_name].count += 1;
  });
  const topDiseases = Object.entries(diseaseMap)
    .map(([name, d]) => ({ name, avgRisk: Math.round(d.total / d.count), count: d.count }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 6);

  const selectedScreening = selectedId ? screenings.find((s) => s.id === selectedId) : null;
  const selectedRisks = selectedId ? riskAssessments.filter((r) => r.screening_id === selectedId) : [];

  if (selectedScreening) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>← Back to Overview</Button>
        <ScreeningResults screening={selectedScreening as any} riskAssessments={selectedRisks as any[]} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={FlaskConical} label="Total Screenings" value={totalScreenings} />
        <MiniStat icon={CheckCircle2} label="Analyzed" value={analyzed} />
        <MiniStat icon={Clock} label="Pending" value={pending} />
        <MiniStat icon={AlertTriangle} label="High Risk Flags" value={highRiskCount} highlight={highRiskCount > 0} />
      </div>

      {/* Screening types */}
      <div className="grid sm:grid-cols-4 gap-4">
        <TypeCard icon={FlaskConical} label="Blood Tests" count={typeCount("blood_test")} />
        <TypeCard icon={Dna} label="Genetic Screenings" count={typeCount("genetic")} />
        <TypeCard icon={Activity} label="Biomarker Panels" count={typeCount("biomarker")} />
        <TypeCard icon={Eye} label="Medical Imaging" count={typeCount("imaging")} />
      </div>

      {/* Top Diseases */}
      {topDiseases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />Top Detected Disease Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDiseases.map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{d.name}</span>
                  <span className="text-muted-foreground">{d.avgRisk}% avg risk • {d.count} screenings</span>
                </div>
                <Progress value={d.avgRisk} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Screenings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Screenings</CardTitle>
          <CardDescription>{totalScreenings} total screenings submitted</CardDescription>
        </CardHeader>
        <CardContent>
          {screenings.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No screenings submitted yet</p>
              <Button asChild size="sm">
                <Link to="/submit-screening">Submit a screening</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {screenings.slice(0, 10).map((s) => {
                const risks = riskAssessments.filter((r) => r.screening_id === s.id);
                const topRisk = risks.length > 0 ? Math.max(...risks.map((r) => r.risk_percentage)) : null;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="font-medium capitalize">{s.screening_type.replace("_", " ")}</span>
                        <span className="text-muted-foreground"> • {s.patient_age}yrs {s.patient_sex}</span>
                      </div>
                      {s.ai_analysis_complete ? (
                        <Badge variant="secondary" className="text-xs">Analyzed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                      {topRisk !== null && topRisk >= 60 && (
                        <Badge className="bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] border-[hsl(var(--risk-high)/0.3)] text-xs">
                          {topRisk}% risk
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM dd")}</span>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
              {screenings.some((s) => s.patient_identifier) && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Tip: open a patient's full timeline from the <Link to="/dashboard" className="underline">Patients</Link> tab.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)]" : ""}>
      <CardContent className="pt-5 pb-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${highlight ? "text-[hsl(var(--risk-high))]" : "text-primary"}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeCard({ icon: Icon, label, count }: { icon: any; label: string; count: number }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
        <div>
          <p className="text-xl font-bold">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

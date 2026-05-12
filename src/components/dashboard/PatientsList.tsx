import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PatientRow {
  identifier: string;
  name: string;
  age: number;
  sex: string;
  lastScreening: string;
  screeningCount: number;
  topRiskPct: number;
  topRiskDisease: string;
}

export function PatientsList() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [sRes, rRes] = await Promise.all([
        supabase.from("health_screenings").select("id, patient_identifier, patient_name, patient_age, patient_sex, created_at").order("created_at", { ascending: false }),
        supabase.from("disease_risk_assessments").select("*"),
      ]);
      const screenings = sRes.data || [];
      const risks = rRes.data || [];
      const byPatient: Record<string, PatientRow> = {};
      for (const s of screenings) {
        const id = s.patient_identifier || "(unassigned)";
        if (!byPatient[id]) {
          byPatient[id] = {
            identifier: id,
            name: s.patient_name || "",
            age: s.patient_age,
            sex: s.patient_sex,
            lastScreening: s.created_at,
            screeningCount: 0,
            topRiskPct: 0,
            topRiskDisease: "",
          };
        }
        byPatient[id].screeningCount += 1;
        const sRisks = risks.filter((r: any) => r.screening_id === s.id);
        for (const r of sRisks) {
          if (r.risk_percentage > byPatient[id].topRiskPct) {
            byPatient[id].topRiskPct = r.risk_percentage;
            byPatient[id].topRiskDisease = r.disease_name;
          }
        }
      }
      setRows(Object.values(byPatient).sort((a, b) => b.topRiskPct - a.topRiskPct));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      r.identifier.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.topRiskDisease.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Patients ({rows.length})
        </CardTitle>
        <CardDescription>All patients with screenings on file. Sorted by highest risk.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, MRN, or disease..."
            className="pl-9"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No matching patients.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => {
              const color = p.topRiskPct >= 60 ? "risk-high" : p.topRiskPct >= 30 ? "risk-medium" : "risk-low";
              return (
                <Link
                  key={p.identifier}
                  to={`/patient/${encodeURIComponent(p.identifier)}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name || "Anonymous"} <span className="font-normal text-muted-foreground">• {p.identifier}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {p.age} yrs • {p.sex} • {p.screeningCount} screening{p.screeningCount > 1 ? "s" : ""} • last {format(new Date(p.lastScreening), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.topRiskPct > 0 && (
                      <Badge className={`bg-[hsl(var(--${color})/0.15)] text-[hsl(var(--${color}))]`}>
                        {Math.round(p.topRiskPct)}% {p.topRiskDisease}
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
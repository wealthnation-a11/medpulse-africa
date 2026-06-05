import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, ArrowRight, Loader2, GitCompare } from "lucide-react";
import { format } from "date-fns";

interface QueueItem {
  screening_id: string;
  patient_identifier: string;
  patient_name: string;
  screening_type: string;
  created_at: string;
  topRisk: number;
  topDisease: string;
  disagreement: boolean;
}

export function SignOffQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [sRes, rRes, vRes] = await Promise.all([
      supabase.from("health_screenings").select("id, patient_identifier, patient_name, screening_type, created_at").order("created_at", { ascending: false }),
      supabase.from("disease_risk_assessments").select("*"),
      supabase.from("screening_validations").select("screening_id, signed_off_at"),
    ]);
    const screenings = sRes.data || [];
    const risks = rRes.data || [];
    const signed = new Set((vRes.data || []).filter((v: any) => v.signed_off_at).map((v: any) => v.screening_id));
    const list: QueueItem[] = [];
    for (const s of screenings) {
      if (signed.has(s.id)) continue;
      const sRisks = risks.filter((r: any) => r.screening_id === s.id);
      if (sRisks.length === 0) continue;
      const top = sRisks.sort((a: any, b: any) => b.risk_percentage - a.risk_percentage)[0];
      const hasDisagreement = sRisks.some((r: any) => r.disagreement === true);
      if (top.risk_percentage < 30 && !hasDisagreement) continue;
      list.push({
        screening_id: s.id,
        patient_identifier: s.patient_identifier || "(unassigned)",
        patient_name: s.patient_name || "",
        screening_type: s.screening_type,
        created_at: s.created_at,
        topRisk: top.risk_percentage,
        topDisease: top.disease_name,
        disagreement: hasDisagreement,
      });
    }
    // Sort: disagreement first, then high → low risk
    list.sort((a, b) => {
      if (a.disagreement !== b.disagreement) return a.disagreement ? -1 : 1;
      return b.topRisk - a.topRisk;
    });
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel("signoff-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "screening_validations" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "disease_risk_assessments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const high = items.filter((i) => i.topRisk >= 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Doctor Sign-Off Queue
        </CardTitle>
        <CardDescription>{items.length} screenings awaiting clinical review ({high.length} high-risk)</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">All AI-flagged screenings have been signed off. ✓</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 20).map((item) => (
              <Link
                key={item.screening_id}
                to={`/patient/${encodeURIComponent(item.patient_identifier)}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.topRisk >= 60 && <AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-high))] shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {item.patient_name || item.patient_identifier} <span className="font-normal text-muted-foreground capitalize">• {item.screening_type.replace("_", " ")}</span>
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{item.topDisease} — {Math.round(item.topRisk)}% risk</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.disagreement && (
                    <Badge variant="outline" className="border-[hsl(var(--risk-medium))] text-[hsl(var(--risk-medium))] gap-1">
                      <GitCompare className="h-3 w-3" />
                      Disagree
                    </Badge>
                  )}
                  <Badge className={item.topRisk >= 60 ? "bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))]" : "bg-[hsl(var(--risk-medium)/0.15)] text-[hsl(var(--risk-medium))]"}>
                    {Math.round(item.topRisk)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{format(new Date(item.created_at), "MMM dd")}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
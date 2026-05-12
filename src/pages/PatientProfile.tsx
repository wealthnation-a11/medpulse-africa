import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FlaskConical, ShieldCheck, Activity } from "lucide-react";
import { format } from "date-fns";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { TrendInsightsPanel } from "@/components/patient/TrendInsightsPanel";
import { ImagingGallery } from "@/components/patient/ImagingGallery";
import { SignOffPanel, type ScreeningValidation } from "@/components/patient/SignOffPanel";
import { ScreeningResults } from "@/components/screening/ScreeningResults";
import { generatePatientPdfReport, downloadPdf } from "@/lib/pdfReport";
import { toast } from "sonner";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id || "");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [screenings, setScreenings] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [biomarkers, setBiomarkers] = useState<any[]>([]);
  const [validations, setValidations] = useState<ScreeningValidation[]>([]);

  const load = async () => {
    const sRes = await supabase
      .from("health_screenings")
      .select("*")
      .eq("patient_identifier", decodedId)
      .order("created_at", { ascending: false });
    const list = sRes.data || [];
    setScreenings(list);
    const ids = list.map((s: any) => s.id);
    if (ids.length > 0) {
      const [rRes, bRes, vRes] = await Promise.all([
        supabase.from("disease_risk_assessments").select("*").in("screening_id", ids),
        supabase.from("biomarker_profiles").select("*").in("screening_id", ids).order("created_at", { ascending: true }),
        supabase.from("screening_validations").select("*").in("screening_id", ids),
      ]);
      setRisks(rRes.data || []);
      setBiomarkers(bRes.data || []);
      setValidations((vRes.data || []) as ScreeningValidation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!decodedId) return;
    load();
  }, [decodedId]);

  const patient = useMemo(() => {
    if (screenings.length === 0) return null;
    const latest = screenings[0];
    return {
      identifier: latest.patient_identifier || decodedId,
      name: latest.patient_name || "",
      age: latest.patient_age,
      sex: latest.patient_sex,
    };
  }, [screenings, decodedId]);

  const topRisk = useMemo(() => {
    if (risks.length === 0) return null;
    const top = [...risks].sort((a, b) => b.risk_percentage - a.risk_percentage)[0];
    return { disease: top.disease_name, pct: top.risk_percentage };
  }, [risks]);

  const imagingScreenings = screenings.filter((s) => s.screening_type === "imaging");

  const handleGenerateReport = async () => {
    if (!patient) return;
    setGenerating(true);
    try {
      const blob = await generatePatientPdfReport({
        patient,
        screenings,
        risks,
        biomarkers,
        validations,
      });
      const safe = (patient.identifier || "patient").replace(/[^a-z0-9-]/gi, "_");
      downloadPdf(blob, `MedPulse_${safe}_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF report downloaded");
    } catch (e: any) {
      toast.error("Failed to generate PDF", { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No screenings found for patient ID "{decodedId}".</p>
            <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back to dashboard</Link>
        </Button>

        <PatientHeader
          identifier={patient.identifier}
          name={patient.name}
          age={patient.age}
          sex={patient.sex}
          screeningCount={screenings.length}
          latestScreeningAt={screenings[0]?.created_at}
          topRisk={topRisk}
          onGenerateReport={handleGenerateReport}
          generating={generating}
        />

        {/* Risk overview cards */}
        {risks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Disease Risk Overview</CardTitle>
              <CardDescription>Latest AI-predicted disease risks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...risks].sort((a, b) => b.risk_percentage - a.risk_percentage).slice(0, 6).map((r) => {
                  const pct = r.risk_percentage;
                  const color = pct >= 60 ? "risk-high" : pct >= 30 ? "risk-medium" : "risk-low";
                  return (
                    <div key={r.id} className={`rounded-lg border p-3 border-[hsl(var(--${color})/0.3)]`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold capitalize">{r.disease_name}</p>
                        <span className={`text-lg font-bold text-[hsl(var(--${color}))]`}>{Math.round(pct)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Confidence {Math.round(r.confidence * 100)}% • {r.time_horizon || "—"}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend insights */}
        <TrendInsightsPanel readings={biomarkers} />

        {/* Imaging gallery */}
        {imagingScreenings.length > 0 && <ImagingGallery screenings={imagingScreenings} />}

        {/* Screenings + sign-offs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" />Screening History</CardTitle>
            <CardDescription>{screenings.length} screenings on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {screenings.map((s) => {
              const sRisks = risks.filter((r) => r.screening_id === s.id);
              const validation = validations.find((v) => v.screening_id === s.id);
              const topPct = sRisks.length > 0 ? Math.max(...sRisks.map((r) => r.risk_percentage)) : 0;
              return (
                <div key={s.id} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize">{s.screening_type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), "PPP")}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {topPct >= 60 && <Badge className="bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))]">{Math.round(topPct)}% risk</Badge>}
                      <Badge variant="outline">{s.status}</Badge>
                      {validation?.signed_off_at && <ShieldCheck className="h-4 w-4 text-[hsl(var(--risk-low))]" />}
                    </div>
                  </div>
                  <ScreeningResults screening={s} riskAssessments={sRisks} />
                  <SignOffPanel screeningId={s.id} existing={validation} onComplete={load} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
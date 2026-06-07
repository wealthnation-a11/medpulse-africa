import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScreeningResults } from "@/components/screening/ScreeningResults";
import { PatientHealthTimeline } from "./PatientHealthTimeline";
import { FollowUpsCard } from "./FollowUpsCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generatePatientPdfReport, downloadPdf } from "@/lib/pdfReport";
import { toast } from "sonner";
import {
  HeartPulse, FlaskConical, Activity, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Image as ImageIcon, Bell, Sparkles, Eye, FileText, Download, CalendarPlus, Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  displayName: string;
}

export function PatientDashboard({ displayName }: Props) {
  const { user } = useAuth();
  const [screenings, setScreenings] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedScreeningId, setSelectedScreeningId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(prof);

      // Fetch screenings linked by submitted_by OR matching patient_identifier
      let q = supabase.from("health_screenings").select("*").order("created_at", { ascending: false });
      if (prof?.patient_identifier) {
        q = q.or(`submitted_by.eq.${user.id},patient_identifier.eq.${prof.patient_identifier}`);
      } else {
        q = q.eq("submitted_by", user.id);
      }
      const [sRes, rRes, nRes] = await Promise.all([
        q,
        supabase.from("disease_risk_assessments").select("*"),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (sRes.data) setScreenings(sRes.data);
      if (rRes.data) setRisks(rRes.data);
      if (nRes.data) setNotifications(nRes.data);
    };
    load();
  }, [user]);

  const myScreeningIds = new Set(screenings.map((s) => s.id));
  const myRisks = risks.filter((r) => myScreeningIds.has(r.screening_id));
  const topRisk = myRisks.sort((a, b) => b.risk_percentage - a.risk_percentage)[0];
  const highRiskCount = myRisks.filter((r) => r.risk_percentage >= 60).length;
  const lastScreening = screenings[0];
  const imagingScreenings = screenings.filter((s) => s.imaging_findings && s.imaging_findings.length > 0);

  const selected = selectedScreeningId ? screenings.find((s) => s.id === selectedScreeningId) : null;
  const selectedRisks = selectedScreeningId ? risks.filter((r) => r.screening_id === selectedScreeningId) : [];

  const handleDownloadPdf = async () => {
    if (!user) return;
    setGeneratingPdf(true);
    try {
      const screeningIds = screenings.map((s) => s.id);
      const [bRes, vRes] = await Promise.all([
        screeningIds.length
          ? supabase.from("biomarker_profiles").select("*").in("screening_id", screeningIds)
          : Promise.resolve({ data: [] as any[] }),
        screeningIds.length
          ? supabase.from("screening_validations").select("*").in("screening_id", screeningIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const last = screenings[0];
      const blob = await generatePatientPdfReport({
        patient: {
          identifier: profile?.patient_identifier || "",
          name: displayName || last?.patient_name || "Patient",
          age: last?.patient_age || 0,
          sex: last?.patient_sex || "unknown",
        },
        screenings: screenings as any,
        risks: myRisks as any,
        biomarkers: (bRes.data as any[]) || [],
        validations: ((vRes.data as any[]) || []).map((v) => ({
          screening_id: v.screening_id,
          validation_status: v.validation_status,
          corrected_risk_level: v.corrected_risk_level,
          doctor_notes: v.doctor_notes,
          signed_off_at: v.signed_off_at,
        })),
        generatedBy: displayName,
      });
      downloadPdf(blob, `my-health-report-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error("Could not generate report", { description: e.message });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleRequestScreening = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      // Find all doctors
      const { data: doctorRoles, error: drErr } = await supabase
        .from("user_roles").select("user_id").eq("role", "doctor");
      if (drErr) throw drErr;
      if (!doctorRoles || doctorRoles.length === 0) {
        toast.error("No clinicians available right now");
        return;
      }
      const patientLabel = displayName || profile?.patient_identifier || "A patient";
      const rows = doctorRoles.map((d) => ({
        user_id: d.user_id,
        title: "New screening request",
        message: `${patientLabel} requested a screening: ${requestReason || "(no details provided)"}`,
        type: "info",
        severity: "low",
        category: "screening_request",
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success("Request sent to your care team");
      setRequestOpen(false);
      setRequestReason("");
    } catch (e: any) {
      toast.error("Could not send request", { description: e.message });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calm wellness hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(180_45%_45%)] via-[hsl(170_40%_50%)] to-[hsl(45_85%_60%)] p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-90">My Health Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Hello, {displayName || "there"} 💚</h1>
            <p className="opacity-90 mt-1 text-sm">
              Your personal health record. Track screenings, follow biomarker trends, and stay ahead of your wellness.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {profile?.patient_identifier ? (
              <Badge className="bg-white/20 hover:bg-white/20 text-white border-none">MRN: {profile.patient_identifier}</Badge>
            ) : (
              <Link to="/profile">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none cursor-pointer">Link your MRN →</Badge>
              </Link>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleDownloadPdf} disabled={generatingPdf || screenings.length === 0}>
                {generatingPdf ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                Download report
              </Button>
              <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white text-[hsl(180_45%_25%)] hover:bg-white/90">
                    <CalendarPlus className="h-4 w-4 mr-1.5" />
                    Request screening
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request a screening</DialogTitle>
                    <DialogDescription>Your care team will be notified and will reach out to arrange it.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={4}
                    placeholder="Reason, symptoms, preferred date, or anything you'd like the clinician to know..."
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={requesting}>Cancel</Button>
                    <Button onClick={handleRequestScreening} disabled={requesting}>
                      {requesting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-1.5" />}
                      Send request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FlaskConical} label="My Screenings" value={screenings.length} />
        <StatCard icon={Clock} label="Last Checkup" value={lastScreening ? format(new Date(lastScreening.created_at), "MMM dd") : "—"} />
        <StatCard icon={AlertTriangle} label="High-Risk Findings" value={highRiskCount} highlight={highRiskCount > 0} />
        <StatCard icon={Sparkles} label="Top Risk" value={topRisk ? `${Math.round(topRisk.risk_percentage)}%` : "—"} subtitle={topRisk?.disease_name} />
      </div>

      <Tabs defaultValue="screenings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="screenings" className="flex items-center gap-1.5"><FlaskConical className="h-4 w-4" />Screenings</TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-1.5"><Activity className="h-4 w-4" />Risk Insights</TabsTrigger>
          <TabsTrigger value="imaging" className="flex items-center gap-1.5"><ImageIcon className="h-4 w-4" />Imaging</TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1.5"><Bell className="h-4 w-4" />Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="screenings">
          {selected ? (
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedScreeningId(null)}>← Back</Button>
              <ScreeningResults screening={selected} riskAssessments={selectedRisks} />
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">My Screening History</CardTitle></CardHeader>
              <CardContent>
                {screenings.length === 0 ? (
                  <div className="text-center py-10">
                    <FlaskConical className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No screenings yet. Ask your clinician to add one or link your MRN in your profile.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {screenings.map((s) => {
                      const sr = risks.filter((r) => r.screening_id === s.id);
                      const top = sr.length > 0 ? Math.max(...sr.map((r) => r.risk_percentage)) : null;
                      return (
                        <button key={s.id} onClick={() => setSelectedScreeningId(s.id)}
                          className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 text-left transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium capitalize">{s.screening_type.replace("_", " ")}</span>
                            {s.ai_analysis_complete
                              ? <Badge variant="secondary" className="text-xs">Analyzed</Badge>
                              : <Badge variant="outline" className="text-xs">Pending</Badge>}
                            {top !== null && top >= 60 && (
                              <Badge className="bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] text-xs">{Math.round(top)}% risk</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM dd, yyyy")}</span>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <div className="space-y-4">
            <FollowUpsCard />
            <PatientHealthTimeline />
          </div>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader><CardTitle className="text-base">My Risk Insights</CardTitle></CardHeader>
            <CardContent>
              {myRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No risk assessments yet.</p>
              ) : (
                <div className="space-y-3">
                  {myRisks.sort((a, b) => b.risk_percentage - a.risk_percentage).map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{r.disease_name}</div>
                        <Badge className={
                          r.risk_percentage >= 60 ? "bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))]"
                          : r.risk_percentage >= 30 ? "bg-[hsl(var(--risk-medium)/0.15)] text-[hsl(var(--risk-medium))]"
                          : "bg-[hsl(var(--risk-low)/0.15)] text-[hsl(var(--risk-low))]"
                        }>{Math.round(r.risk_percentage)}% risk</Badge>
                      </div>
                      {r.time_horizon && <p className="text-xs text-muted-foreground">Time horizon: {r.time_horizon}</p>}
                      <div className="w-full bg-muted rounded-full h-2 mt-3">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${r.risk_percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imaging">
          <Card>
            <CardHeader><CardTitle className="text-base">My Imaging Studies</CardTitle></CardHeader>
            <CardContent>
              {imagingScreenings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No imaging on file.</p>
              ) : (
                <div className="space-y-3">
                  {imagingScreenings.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{s.screening_type.replace("_", " ")}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(s.created_at), "MMM dd, yyyy")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{s.imaging_findings}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle className="text-base">Notifications from Your Care Team</CardTitle></CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No alerts. You're all caught up.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM dd")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight, subtitle }: any) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)]" : ""}>
      <CardContent className="pt-5 pb-4 flex flex-col items-center text-center">
        <Icon className={`h-5 w-5 mb-1.5 ${highlight ? "text-[hsl(var(--risk-high))]" : "text-primary"}`} />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-full">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
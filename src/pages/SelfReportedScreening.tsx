import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HomeIcon } from "lucide-react";

const FIELDS = [
  { key: "glucose", label: "Glucose (mg/dL)" },
  { key: "systolic_bp", label: "Systolic BP (mmHg)" },
  { key: "diastolic_bp", label: "Diastolic BP (mmHg)" },
  { key: "pulse", label: "Pulse (bpm)" },
  { key: "spo2", label: "SpO2 (%)" },
  { key: "weight_kg", label: "Weight (kg)" },
  { key: "temperature_c", label: "Temperature (°C)" },
  { key: "hba1c", label: "HbA1c (% — home kit)" },
];

export default function SelfReportedScreening() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientSex, setPatientSex] = useState<"male" | "female" | "other">("male");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const tr: Record<string, number> = {};
      Object.entries(vals).forEach(([k, v]) => {
        const n = parseFloat(v);
        if (!isNaN(n)) tr[k] = n;
      });
      if (Object.keys(tr).length === 0) {
        toast({ title: "Enter at least one reading", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const ageNum = parseInt(patientAge) || (patientDob ? Math.max(0, Math.floor((Date.now() - new Date(patientDob).getTime()) / (365.25 * 24 * 3600 * 1000))) : 0);
      const { data, error } = await supabase.from("health_screenings").insert({
        submitted_by: user.id,
        patient_age: ageNum,
        patient_sex: patientSex,
        patient_name: patientName.trim(),
        patient_identifier: patientIdentifier.trim(),
        patient_dob: patientDob || null,
        family_history: [],
        screening_type: "biomarker",
        test_results: tr,
        clinical_notes: notes,
        status: "pending",
        source: "self_reported",
      }).select().single();
      if (error) throw error;
      supabase.functions.invoke("analyze-screening", { body: { screening_id: data.id } }).catch(console.error);
      toast({ title: "Reading recorded", description: "Added to longitudinal trajectory." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HomeIcon className="h-5 w-5" /> Self-Reported Reading</CardTitle>
            <CardDescription>Home device readings (glucose meter, BP cuff, pulse oximeter, scale). Treated as advisory and feeds the patient's trajectory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient ID (optional — auto-matched if blank)</Label>
                <Input value={patientIdentifier} onChange={(e) => setPatientIdentifier(e.target.value)} placeholder="e.g. PT-AB12CD34" />
              </div>
              <div className="space-y-2">
                <Label>Patient Name</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Age (if DOB unknown)</Label>
                <Input type="number" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={patientSex} onChange={(e) => setPatientSex(e.target.value as any)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input type="number" step="0.01" value={vals[f.key] || ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Self-Reported Reading
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
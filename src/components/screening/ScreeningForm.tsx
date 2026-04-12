import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft, FlaskConical, Dna, Activity, CheckCircle2, ImageIcon, Upload, X } from "lucide-react";
import { calculateScreeningRisk } from "@/lib/riskCalculation";

const FAMILY_HISTORY_OPTIONS = [
  "Cancer", "Heart Disease", "Diabetes", "Hypertension", "Stroke",
  "Alzheimer's", "Kidney Disease", "Autoimmune Disorders",
];

const BLOOD_TEST_FIELDS = [
  { key: "hemoglobin", label: "Hemoglobin (g/dL)", ref: "12-17.5" },
  { key: "wbc", label: "WBC (×10³/µL)", ref: "4.5-11" },
  { key: "platelets", label: "Platelets (×10³/µL)", ref: "150-400" },
  { key: "glucose", label: "Fasting Glucose (mg/dL)", ref: "70-100" },
  { key: "cholesterol_total", label: "Total Cholesterol (mg/dL)", ref: "<200" },
  { key: "ldl", label: "LDL Cholesterol (mg/dL)", ref: "<100" },
  { key: "hdl", label: "HDL Cholesterol (mg/dL)", ref: ">40" },
  { key: "triglycerides", label: "Triglycerides (mg/dL)", ref: "<150" },
  { key: "hba1c", label: "HbA1c (%)", ref: "<5.7" },
  { key: "creatinine", label: "Creatinine (mg/dL)", ref: "0.6-1.2" },
  { key: "alt", label: "ALT (U/L)", ref: "7-56" },
  { key: "ast", label: "AST (U/L)", ref: "10-40" },
  { key: "psa", label: "PSA (ng/mL)", ref: "<4.0" },
  { key: "cea", label: "CEA (ng/mL)", ref: "<3.0" },
  { key: "ca125", label: "CA-125 (U/mL)", ref: "<35" },
];

const GENETIC_FIELDS = [
  { key: "brca1", label: "BRCA1 Mutation", type: "select", options: ["Not tested", "Negative", "Positive"] },
  { key: "brca2", label: "BRCA2 Mutation", type: "select", options: ["Not tested", "Negative", "Positive"] },
  { key: "apoe4", label: "APOE4 Variant", type: "select", options: ["Not tested", "Negative", "Heterozygous", "Homozygous"] },
  { key: "lynch_syndrome", label: "Lynch Syndrome Markers", type: "select", options: ["Not tested", "Negative", "Positive"] },
  { key: "factor_v_leiden", label: "Factor V Leiden", type: "select", options: ["Not tested", "Negative", "Heterozygous", "Homozygous"] },
  { key: "hfe_gene", label: "HFE Gene (Hemochromatosis)", type: "select", options: ["Not tested", "Negative", "Carrier", "Positive"] },
];

const BIOMARKER_FIELDS = [
  { key: "troponin", label: "Troponin I (ng/mL)", ref: "<0.04" },
  { key: "bnp", label: "BNP (pg/mL)", ref: "<100" },
  { key: "crp", label: "CRP (mg/L)", ref: "<3.0" },
  { key: "d_dimer", label: "D-Dimer (ng/mL)", ref: "<500" },
  { key: "ferritin", label: "Ferritin (ng/mL)", ref: "12-300" },
  { key: "vitamin_d", label: "Vitamin D (ng/mL)", ref: "30-100" },
  { key: "tsh", label: "TSH (mIU/L)", ref: "0.4-4.0" },
  { key: "insulin", label: "Fasting Insulin (µU/mL)", ref: "2-25" },
  { key: "homocysteine", label: "Homocysteine (µmol/L)", ref: "5-15" },
  { key: "afp", label: "AFP (ng/mL)", ref: "<10" },
];

const IMAGING_TYPES = [
  { value: "xray", label: "X-Ray" },
  { value: "mri", label: "MRI" },
  { value: "ct_scan", label: "CT Scan" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "mammogram", label: "Mammogram" },
];

type Step = 1 | 2 | 3 | 4;

export function ScreeningForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Patient Info
  const [patientAge, setPatientAge] = useState("");
  const [patientSex, setPatientSex] = useState("male");
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);

  // Step 2: Screening Type
  const [screeningType, setScreeningType] = useState("blood_test");

  // Step 3: Test Results
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  // Imaging
  const [imagingType, setImagingType] = useState("xray");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [bodyRegion, setBodyRegion] = useState("");

  // Step 4: Notes
  const [clinicalNotes, setClinicalNotes] = useState("");

  const toggleFamilyHistory = (item: string) => {
    setFamilyHistory((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const updateResult = (key: string, value: string) => {
    setTestResults((prev) => ({ ...prev, [key]: value }));
  };

  const getFields = () => {
    if (screeningType === "blood_test") return BLOOD_TEST_FIELDS;
    if (screeningType === "genetic") return GENETIC_FIELDS;
    return BIOMARKER_FIELDS;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Filter out empty values
      const filteredResults: Record<string, string | number> = {};
      Object.entries(testResults).forEach(([k, v]) => {
        if (v && v.trim()) {
          const num = parseFloat(v);
          filteredResults[k] = isNaN(num) ? v : num;
        }
      });

      const preliminaryRisk = calculateScreeningRisk(
        parseInt(patientAge) || 0,
        patientSex,
        familyHistory,
        filteredResults,
        screeningType
      );

      const { data, error } = await supabase.from("health_screenings").insert({
        submitted_by: user.id,
        patient_age: parseInt(patientAge) || 0,
        patient_sex: patientSex,
        family_history: familyHistory,
        screening_type: screeningType,
        test_results: { ...filteredResults, preliminary_risk: preliminaryRisk },
        clinical_notes: clinicalNotes,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Trigger AI analysis
      supabase.functions.invoke("analyze-screening", {
        body: { screening_id: data.id },
      }).catch(console.error);

      toast({ title: "Screening submitted!", description: "AI analysis is running in the background." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit screening", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const stepIcons = {
    1: <Activity className="h-5 w-5" />,
    2: <FlaskConical className="h-5 w-5" />,
    3: <Dna className="h-5 w-5" />,
    4: <CheckCircle2 className="h-5 w-5" />,
  };

  const stepLabels = ["Patient Info", "Screening Type", "Test Results", "Review & Submit"];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              step > i + 1 ? "bg-primary text-primary-foreground" :
              step === i + 1 ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < 3 && <div className="hidden sm:block w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Patient Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{stepIcons[1]} Patient Information</CardTitle>
            <CardDescription>Enter patient demographics and medical history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" min="0" max="150" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="e.g. 45" />
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select value={patientSex} onValueChange={setPatientSex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Family History</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FAMILY_HISTORY_OPTIONS.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={familyHistory.includes(item)} onCheckedChange={() => toggleFamilyHistory(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!patientAge}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Screening Type */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{stepIcons[2]} Screening Type</CardTitle>
            <CardDescription>Select the type of diagnostic screening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { value: "blood_test", icon: FlaskConical, label: "Blood Test", desc: "CBC, lipids, tumor markers, metabolic panel" },
                { value: "genetic", icon: Dna, label: "Genetic Screening", desc: "BRCA, APOE4, Lynch syndrome, genetic variants" },
                { value: "biomarker", icon: Activity, label: "Biomarker Panel", desc: "Troponin, CRP, TSH, hormones, vitamins" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setScreeningType(t.value); setTestResults({}); }}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    screeningType === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <t.icon className={`h-6 w-6 mb-2 ${screeningType === t.value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Test Results */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{stepIcons[3]} Test Results</CardTitle>
            <CardDescription>Enter available test values. Leave blank for unavailable tests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {getFields().map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  {"options" in field ? (
                    <Select value={testResults[field.key] || "Not tested"} onValueChange={(v) => updateResult(field.key, v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={testResults[field.key] || ""}
                        onChange={(e) => updateResult(field.key, e.target.value)}
                        placeholder={`Ref: ${field.ref}`}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{stepIcons[4]} Review & Submit</CardTitle>
            <CardDescription>Review your submission before sending for AI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Patient</p>
                <p className="font-semibold">{patientAge} yrs, {patientSex}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Screening</p>
                <p className="font-semibold capitalize">{screeningType.replace("_", " ")}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground text-xs mb-1">Tests Entered</p>
                <p className="font-semibold">{Object.values(testResults).filter(Boolean).length} values</p>
              </div>
            </div>
            {familyHistory.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Family History</p>
                <div className="flex flex-wrap gap-1">
                  {familyHistory.map((h) => <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Clinical Notes (optional)</Label>
              <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Additional observations or context..." rows={3} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Submit for AI Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

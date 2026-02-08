import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateRiskLevel, getRiskBadgeClasses } from "@/lib/riskCalculation";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, MapPin, Thermometer, Droplets, Users } from "lucide-react";

const SYMPTOMS = [
  { id: "fever", label: "Fever" },
  { id: "cough", label: "Cough" },
  { id: "diarrhea", label: "Diarrhea" },
  { id: "headache", label: "Headache" },
  { id: "rash", label: "Rash" },
];

export default function SubmitObservation() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [caseCount, setCaseCount] = useState(1);
  const [temperature, setTemperature] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ riskLevel: string } | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (symptoms.length === 0) {
      toast({ title: "Select at least one symptom", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const riskLevel = calculateRiskLevel(symptoms, caseCount);

    const { error } = await supabase.from("observations").insert({
      volunteer_id: user.id,
      country,
      region,
      city,
      symptoms,
      case_count: caseCount,
      temperature: temperature ? parseFloat(temperature) : null,
      rainfall: rainfall ? parseFloat(rainfall) : null,
      notes,
      rule_risk_level: riskLevel,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      setResult({ riskLevel });
      toast({ title: "Observation submitted successfully!" });
    }
  };

  const resetForm = () => {
    setCountry("");
    setRegion("");
    setCity("");
    setSymptoms([]);
    setCaseCount(1);
    setTemperature("");
    setRainfall("");
    setNotes("");
    setResult(null);
  };

  if (result) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Observation Submitted</h2>
          <p className="text-muted-foreground mb-6">
            Your health observation has been recorded and assessed.
          </p>
          <div className="flex justify-center mb-8">
            <Badge className={`text-lg px-4 py-2 ${getRiskBadgeClasses(result.riskLevel)}`}>
              Risk Level: {result.riskLevel}
            </Badge>
          </div>
          <Button onClick={resetForm}>Submit Another Observation</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Submit Health Observation</h1>
          <p className="text-muted-foreground mt-2">
            Report health symptoms observed in your community to help detect potential outbreaks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location
              </CardTitle>
              <CardDescription>Where did you observe these symptoms?</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" placeholder="e.g. Nigeria" value={country} onChange={(e) => setCountry(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region / State</Label>
                <Input id="region" placeholder="e.g. Lagos State" value={region} onChange={(e) => setRegion(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="e.g. Ikeja" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Symptoms */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Symptoms Observed</CardTitle>
              <CardDescription>Select all symptoms reported in the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SYMPTOMS.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
                      symptoms.includes(s.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={symptoms.includes(s.id)}
                      onCheckedChange={() => toggleSymptom(s.id)}
                    />
                    <span className="text-sm font-medium">{s.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cases & Environment */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Cases & Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cases">Number of Cases</Label>
                <Input
                  id="cases"
                  type="number"
                  min={1}
                  value={caseCount}
                  onChange={(e) => setCaseCount(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp" className="flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5" /> Temperature (°C)
                </Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 32"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rain" className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" /> Rainfall (mm)
                </Label>
                <Input
                  id="rain"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 15"
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any additional context about the observation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Risk preview */}
          {symptoms.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <span className="text-sm text-muted-foreground">Estimated risk level:</span>
              <Badge className={getRiskBadgeClasses(calculateRiskLevel(symptoms, caseCount))}>
                {calculateRiskLevel(symptoms, caseCount)}
              </Badge>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Observation
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}

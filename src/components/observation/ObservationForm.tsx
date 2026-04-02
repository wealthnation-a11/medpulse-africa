import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateRiskLevel, getRiskBadgeClasses } from "@/lib/riskCalculation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MapPin,
  Thermometer,
  Droplets,
  Users,
  Stethoscope,
  HeartPulse,
} from "lucide-react";

const SYMPTOMS = [
  { id: "fever", label: "Fever", icon: "🌡️" },
  { id: "cough", label: "Cough", icon: "😷" },
  { id: "diarrhea", label: "Diarrhea", icon: "💧" },
  { id: "headache", label: "Headache", icon: "🤕" },
  { id: "rash", label: "Rash", icon: "🔴" },
  { id: "fatigue", label: "Fatigue", icon: "😴" },
  { id: "vomiting", label: "Vomiting", icon: "🤢" },
  { id: "muscle_pain", label: "Muscle Pain", icon: "💪" },
  { id: "sore_throat", label: "Sore Throat", icon: "🗣️" },
  { id: "breathing_difficulty", label: "Breathing Difficulty", icon: "🫁" },
];

interface ObservationFormProps {
  onSuccess?: () => void;
}

export function ObservationForm({ onSuccess }: ObservationFormProps) {
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

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (symptoms.length === 0) {
      toast({
        title: "No symptoms selected",
        description: "Please select at least one symptom to submit your observation.",
        variant: "destructive",
      });
      return;
    }

    if (!country.trim() || !region.trim() || !city.trim()) {
      toast({
        title: "Location required",
        description: "Please fill in all location fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const riskLevel = calculateRiskLevel(symptoms, caseCount);

    const { data: obsData, error } = await supabase.from("observations").insert({
      volunteer_id: user.id,
      country: country.trim(),
      region: region.trim(),
      city: city.trim(),
      symptoms,
      case_count: caseCount,
      temperature: temperature ? parseFloat(temperature) : null,
      rainfall: rainfall ? parseFloat(rainfall) : null,
      notes: notes.trim(),
      rule_risk_level: riskLevel,
    }).select("id").single();

    setSubmitting(false);

    if (error) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Notify doctors if high risk
      if (riskLevel === "High" && obsData) {
        notifyDoctors(obsData.id, city.trim(), region.trim(), symptoms);
      }

      toast({
        title: "Observation submitted",
        description: `Risk level assessed as ${riskLevel}. Your report has been recorded.`,
      });
      resetForm();
      onSuccess?.();
    }
  };

  const currentRisk = symptoms.length > 0 ? calculateRiskLevel(symptoms, caseCount) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Location Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Details
          </CardTitle>
          <CardDescription>
            Specify the geographic area where symptoms were observed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Input
              id="country"
              placeholder="e.g. Nigeria"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">
              Region / State <span className="text-destructive">*</span>
            </Label>
            <Input
              id="region"
              placeholder="e.g. Lagos State"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">
              City / Town <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              placeholder="e.g. Ikeja"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Symptoms Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Clinical Symptoms
          </CardTitle>
          <CardDescription>
            Select all symptoms observed in the affected population. Choose at least one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SYMPTOMS.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 cursor-pointer transition-all select-none ${
                  symptoms.includes(s.id)
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={symptoms.includes(s.id)}
                  onCheckedChange={() => toggleSymptom(s.id)}
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-sm font-medium truncate">{s.label}</span>
                </div>
              </label>
            ))}
          </div>
          {symptoms.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <HeartPulse className="h-4 w-4 text-primary" />
              <span>
                {symptoms.length} symptom{symptoms.length > 1 ? "s" : ""} selected
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cases & Environment Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Case Count & Environmental Data
          </CardTitle>
          <CardDescription>
            Provide the number of observed cases and optional environmental context.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cases">
              Number of Cases <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cases"
              type="number"
              min={1}
              max={10000}
              value={caseCount}
              onChange={(e) =>
                setCaseCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Total individuals presenting symptoms
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temp" className="flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              Temperature (°C)
            </Label>
            <Input
              id="temp"
              type="number"
              step="0.1"
              min={-20}
              max={60}
              placeholder="e.g. 32"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ambient temperature</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rain" className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              Rainfall (mm)
            </Label>
            <Input
              id="rain"
              type="number"
              step="0.1"
              min={0}
              max={1000}
              placeholder="e.g. 15"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Recent precipitation</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Additional Notes</CardTitle>
          <CardDescription>
            Provide any relevant context, patient demographics, or environmental observations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Describe any additional observations, patterns, or context that may help with analysis..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {notes.length}/2000
          </p>
        </CardContent>
      </Card>

      {/* Risk Assessment Preview */}
      {currentRisk && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Preliminary Risk Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Based on symptoms and case count
                  </p>
                </div>
              </div>
              <Badge className={`text-sm px-3 py-1 ${getRiskBadgeClasses(currentRisk)}`}>
                {currentRisk} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-semibold"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <HeartPulse className="h-5 w-5" />
            Submit Health Observation
          </>
        )}
      </Button>
    </form>
  );
}

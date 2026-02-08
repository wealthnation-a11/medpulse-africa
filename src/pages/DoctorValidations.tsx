import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getRiskBadgeClasses } from "@/lib/riskCalculation";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface Observation {
  id: string;
  country: string;
  region: string;
  city: string;
  symptoms: string[];
  case_count: number;
  temperature: number | null;
  rainfall: number | null;
  notes: string;
  rule_risk_level: string;
  status: string;
  created_at: string;
}

export default function DoctorValidations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Observation | null>(null);

  // Validation form state
  const [validationStatus, setValidationStatus] = useState("confirmed");
  const [correctedDisease, setCorrectedDisease] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [submittingValidation, setSubmittingValidation] = useState(false);

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    // Fetch observations, prioritizing high-risk and pending
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Sort: pending first, then by risk level
      const riskOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const statusOrder: Record<string, number> = { pending: 0, validated: 1, rejected: 2 };
      const sorted = (data as Observation[]).sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return (riskOrder[a.rule_risk_level] ?? 3) - (riskOrder[b.rule_risk_level] ?? 3);
      });
      setObservations(sorted);
    }
    setLoading(false);
  };

  const openValidation = (obs: Observation) => {
    setSelected(obs);
    setValidationStatus("confirmed");
    setCorrectedDisease("");
    setDoctorNotes("");
  };

  const handleValidation = async () => {
    if (!selected || !user) return;
    setSubmittingValidation(true);

    // Insert validation
    const { error: valError } = await supabase.from("doctor_validations").insert({
      observation_id: selected.id,
      doctor_id: user.id,
      validation_status: validationStatus,
      corrected_disease: correctedDisease || null,
      doctor_notes: doctorNotes,
    });

    if (valError) {
      toast({ title: "Validation failed", description: valError.message, variant: "destructive" });
      setSubmittingValidation(false);
      return;
    }

    // Update observation status
    const newStatus = validationStatus === "false_positive" ? "rejected" : "validated";
    await supabase
      .from("observations")
      .update({ status: newStatus })
      .eq("id", selected.id);

    toast({ title: "Validation submitted successfully!" });
    setSelected(null);
    setSubmittingValidation(false);
    fetchObservations();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Doctor Validation Portal</h1>
          <p className="text-muted-foreground mt-1">
            Review and validate health observations submitted by volunteers.
          </p>
        </div>

        {observations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No observations to review yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {observations.map((obs) => (
              <Card
                key={obs.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  obs.rule_risk_level === "High" ? "border-[hsl(var(--risk-high)/0.3)]" : ""
                }`}
                onClick={() => openValidation(obs)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <MapPin className="h-4 w-4 text-primary" />
                          {obs.city}, {obs.region}, {obs.country}
                        </div>
                        <Badge className={getRiskBadgeClasses(obs.rule_risk_level)}>
                          {obs.rule_risk_level}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {obs.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {obs.symptoms.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {obs.case_count} cases
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(obs.created_at), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openValidation(obs); }}>
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Validation dialog */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Validate Observation</DialogTitle>
              <DialogDescription>
                Review the details and provide your medical assessment.
              </DialogDescription>
            </DialogHeader>

            {selected && (
              <div className="space-y-4">
                {/* Observation summary */}
                <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {selected.city}, {selected.region}, {selected.country}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.symptoms.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{selected.case_count} cases</span>
                    {selected.temperature && <span>{selected.temperature}°C</span>}
                    {selected.rainfall && <span>{selected.rainfall}mm rain</span>}
                  </div>
                  {selected.notes && (
                    <p className="text-sm text-muted-foreground italic">{selected.notes}</p>
                  )}
                  <Badge className={getRiskBadgeClasses(selected.rule_risk_level)}>
                    Rule-based: {selected.rule_risk_level}
                  </Badge>
                </div>

                {/* Validation form */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Validation Decision</Label>
                    <Select value={validationStatus} onValueChange={setValidationStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">✅ Confirm – Report is accurate</SelectItem>
                        <SelectItem value="corrected">🔄 Correct – Needs correction</SelectItem>
                        <SelectItem value="false_positive">❌ False Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {validationStatus === "corrected" && (
                    <div className="space-y-2">
                      <Label htmlFor="disease">Corrected Disease Name</Label>
                      <Input
                        id="disease"
                        placeholder="e.g. Cholera, Malaria..."
                        value={correctedDisease}
                        onChange={(e) => setCorrectedDisease(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="docNotes">Doctor Notes</Label>
                    <Textarea
                      id="docNotes"
                      placeholder="Your medical assessment and recommendations..."
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleValidation}
                    disabled={submittingValidation}
                    className="w-full"
                  >
                    {submittingValidation && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Validation
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

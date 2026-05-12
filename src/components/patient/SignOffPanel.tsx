import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Edit3, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export interface ScreeningValidation {
  id: string;
  screening_id: string;
  doctor_id: string;
  validation_status: string;
  corrected_risk_level: string | null;
  doctor_notes: string;
  signed_off_at: string | null;
  created_at: string;
}

interface Props {
  screeningId: string;
  existing?: ScreeningValidation;
  onComplete?: () => void;
}

export function SignOffPanel({ screeningId, existing, onComplete }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState(existing?.validation_status || "confirmed");
  const [riskOverride, setRiskOverride] = useState(existing?.corrected_risk_level || "none");
  const [notes, setNotes] = useState(existing?.doctor_notes || "");
  const [saving, setSaving] = useState(false);

  if (existing?.signed_off_at) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[hsl(var(--risk-low))]" />
            Signed Off
          </CardTitle>
          <CardDescription>{format(new Date(existing.signed_off_at), "PPpp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Status: {existing.validation_status}</Badge>
            {existing.corrected_risk_level && existing.corrected_risk_level !== "none" && (
              <Badge variant="outline">Override: {existing.corrected_risk_level}</Badge>
            )}
          </div>
          {existing.doctor_notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{existing.doctor_notes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      screening_id: screeningId,
      doctor_id: user.id,
      validation_status: status,
      corrected_risk_level: riskOverride === "none" ? null : riskOverride,
      doctor_notes: notes,
      signed_off_at: new Date().toISOString(),
    };
    const { error } = existing
      ? await supabase.from("screening_validations").update(payload).eq("id", existing.id)
      : await supabase.from("screening_validations").insert(payload);

    if (error) {
      toast.error("Failed to save sign-off", { description: error.message });
      setSaving(false);
      return;
    }
    // Flip screening status to validated
    await supabase.from("health_screenings").update({ status: "validated" }).eq("id", screeningId);
    toast.success("Sign-off recorded");
    setSaving(false);
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-primary" />
          Doctor Sign-Off
        </CardTitle>
        <CardDescription>Confirm, revise, or dismiss the AI assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold mb-1 block">Decision</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirm AI assessment</SelectItem>
                <SelectItem value="revised">Revise risk level</SelectItem>
                <SelectItem value="dismissed">Dismiss as false positive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Risk override</label>
            <Select value={riskOverride} onValueChange={setRiskOverride}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No override</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Clinical notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Differential considerations, recommended follow-up..."
            rows={3}
          />
        </div>
        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Sign off
        </Button>
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setDisplayName(data.display_name || "");
        setPatientIdentifier(data.patient_identifier || "");
        setDefaultLocation(data.default_location || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      patient_identifier: patientIdentifier,
      default_location: defaultLocation,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile", { description: error.message });
      return;
    }
    toast.success("Profile updated");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">Update your display name, MRN link, and default location.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
            <CardDescription>Patients: linking your Medical Record Number (MRN) unlocks your clinical records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Display name</Label>
                  <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mrn">Medical Record Number (MRN)</Label>
                  <Input id="mrn" value={patientIdentifier} onChange={(e) => setPatientIdentifier(e.target.value)} placeholder="e.g. MPA-00123" />
                  <p className="text-xs text-muted-foreground">Links existing clinical screenings to your account. Ask your clinician for this code.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Default location</Label>
                  <Input id="location" value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria" />
                </div>
                <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save changes
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
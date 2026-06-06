import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Shield, Bell, AlertTriangle, Save, Loader2, RotateCcw,
  Gauge, Users, Activity, Zap,
} from "lucide-react";
import { FhirIngestionPanel } from "@/components/admin/FhirIngestionPanel";

interface PlatformSettings {
  id: string;
  high_risk_threshold: number;
  medium_risk_threshold: number;
  outbreak_alert_threshold: number;
  notify_doctors_high_risk: boolean;
  notify_doctors_outbreak: boolean;
  notify_admins_new_users: boolean;
  auto_flag_high_risk: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    if (!error && data) {
      setSettings(data as PlatformSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from("platform_settings")
      .update({
        high_risk_threshold: settings.high_risk_threshold,
        medium_risk_threshold: settings.medium_risk_threshold,
        outbreak_alert_threshold: settings.outbreak_alert_threshold,
        notify_doctors_high_risk: settings.notify_doctors_high_risk,
        notify_doctors_outbreak: settings.notify_doctors_outbreak,
        notify_admins_new_users: settings.notify_admins_new_users,
        auto_flag_high_risk: settings.auto_flag_high_risk,
      })
      .eq("id", settings.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } else {
      toast({ title: "Settings saved", description: "Platform settings updated successfully" });
    }
    setSaving(false);
  };

  const handleReset = () => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            high_risk_threshold: 10,
            medium_risk_threshold: 5,
            outbreak_alert_threshold: 20,
            notify_doctors_high_risk: true,
            notify_doctors_outbreak: true,
            notify_admins_new_users: true,
            auto_flag_high_risk: true,
          }
        : prev
    );
  };

  if (loading || !settings) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Platform Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure alert thresholds, notifications, and system preferences
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Alert Thresholds
            </CardTitle>
            <CardDescription>
              Define case count thresholds for risk level classification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="medium" className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--risk-medium))]" />
                  Medium Risk Threshold
                </Label>
                <Input
                  id="medium"
                  type="number"
                  min={1}
                  value={settings.medium_risk_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, medium_risk_threshold: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Cases ≥ this value = Medium risk</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="high" className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--risk-high))]" />
                  High Risk Threshold
                </Label>
                <Input
                  id="high"
                  type="number"
                  min={1}
                  value={settings.high_risk_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, high_risk_threshold: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Cases ≥ this value = High risk</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outbreak" className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--risk-high))]" />
                  Outbreak Alert Threshold
                </Label>
                <Input
                  id="outbreak"
                  type="number"
                  min={1}
                  value={settings.outbreak_alert_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, outbreak_alert_threshold: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Cases ≥ this value triggers outbreak alert</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which events trigger notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[hsl(var(--risk-high)/0.1)] p-2">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-high))]" />
                </div>
                <div>
                  <p className="font-medium text-sm">High-Risk Observation Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify all doctors when a high-risk observation is submitted</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_doctors_high_risk}
                onCheckedChange={(v) => setSettings({ ...settings, notify_doctors_high_risk: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Outbreak Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify doctors when an outbreak alert is triggered</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_doctors_outbreak}
                onCheckedChange={(v) => setSettings({ ...settings, notify_doctors_outbreak: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">New User Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify admins when a new user registers on the platform</p>
                </div>
              </div>
              <Switch
                checked={settings.notify_admins_new_users}
                onCheckedChange={(v) => setSettings({ ...settings, notify_admins_new_users: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Auto-Flag High Risk</p>
                  <p className="text-xs text-muted-foreground">Automatically flag observations exceeding the high-risk threshold</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_flag_high_risk}
                onCheckedChange={(v) => setSettings({ ...settings, auto_flag_high_risk: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Setup Info */}
        <Card className="border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/10 p-2 shrink-0">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Email notifications are available once an email domain is configured.
                  Currently, doctors receive in-app notifications for high-risk observations and outbreak alerts in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <FhirIngestionPanel />
      </div>
    </AppLayout>
  );
}

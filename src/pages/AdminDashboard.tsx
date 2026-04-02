import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { ObservationHeatmap } from "@/components/dashboard/ObservationHeatmap";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, Activity, FileText, Globe, TrendingUp, AlertTriangle,
  Search, UserCog, Crown, Loader2, BarChart3, Microscope, HeartPulse,
  Settings, Eye, Brain, MapPin, Zap,
} from "lucide-react";
import { format } from "date-fns";

interface UserWithRole {
  user_id: string;
  display_name: string;
  created_at: string;
  roles: string[];
}

interface Observation {
  id: string;
  country: string;
  region: string;
  city: string;
  symptoms: string[];
  case_count: number;
  rule_risk_level: string;
  ai_risk_level: string | null;
  predicted_diseases: string[] | null;
  confidence_scores: number[] | null;
  outbreak_alert: boolean;
  status: string;
  created_at: string;
  volunteer_id: string;
}

interface AIAnalysis {
  loading: boolean;
  result: any | null;
}

export default function AdminDashboard() {
  const { displayName } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis>({ loading: false, result: null });

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "observations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const [obsRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("observations").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (obsRes.data) setObservations(obsRes.data as Observation[]);

    if (profilesRes.data && rolesRes.data) {
      const roleMap: Record<string, string[]> = {};
      rolesRes.data.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const merged: UserWithRole[] = profilesRes.data.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || "Unknown",
        created_at: p.created_at,
        roles: roleMap[p.user_id] || [],
      }));
      setUsers(merged);
    }

    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Remove existing non-admin roles
      const user = users.find((u) => u.user_id === userId);
      if (!user) return;

      const currentNonAdmin = user.roles.filter((r) => r !== "admin");
      for (const role of currentNonAdmin) {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      }

      // Add new role
      if (newRole !== "none") {
        await supabase.from("user_roles").insert({ user_id: userId, role: newRole as "volunteer" | "doctor" | "admin" });
      }

      toast({ title: "Role updated", description: `User role changed to ${newRole}` });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    }
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      if (isAdmin) {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        toast({ title: "Admin removed" });
      } else {
        await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
        toast({ title: "Admin granted" });
      }
      fetchData();
    } catch {
      toast({ title: "Error", description: "Failed to toggle admin", variant: "destructive" });
    }
  };

  const runSystemAnalysis = async () => {
    setAiAnalysis({ loading: true, result: null });
    try {
      const { data, error } = await supabase.functions.invoke("predict-outbreak", {
        body: { observations: observations.slice(0, 100) },
      });
      if (error) throw error;
      setAiAnalysis({ loading: false, result: data });
    } catch (err) {
      toast({ title: "Analysis failed", description: "Could not run AI analysis", variant: "destructive" });
      setAiAnalysis({ loading: false, result: null });
    }
  };

  // Computed stats
  const totalUsers = users.length;
  const doctorCount = users.filter((u) => u.roles.includes("doctor")).length;
  const volunteerCount = users.filter((u) => u.roles.includes("volunteer")).length;
  const adminCount = users.filter((u) => u.roles.includes("admin")).length;

  const totalObs = observations.length;
  const totalCases = observations.reduce((s, o) => s + o.case_count, 0);
  const highRisk = observations.filter((o) => o.rule_risk_level === "High").length;
  const alerts = observations.filter((o) => o.outbreak_alert).length;
  const pending = observations.filter((o) => o.status === "pending").length;
  const validated = observations.filter((o) => o.status === "validated").length;
  const countries = new Set(observations.map((o) => o.country)).size;
  const regions = new Set(observations.map((o) => o.region)).size;

  const casesOverTime = observations
    .reduce((acc: { date: string; cases: number }[], o) => {
      const d = format(new Date(o.created_at), "MMM dd");
      const e = acc.find((x) => x.date === d);
      if (e) e.cases += o.case_count; else acc.push({ date: d, cases: o.case_count });
      return acc;
    }, []).reverse().slice(-14);

  const symptomFreq = observations.flatMap((o) => o.symptoms).reduce((a: Record<string, number>, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
  const symptomChartData = Object.entries(symptomFreq).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })).sort((a, b) => b.count - a.count);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch = u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.user_id.includes(searchTerm);
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

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
        {/* Admin header */}
        <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--foreground))] to-[hsl(280_30%_20%)] p-6 sm:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 opacity-80" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">System Administrator</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">{displayName || "Admin"}</h1>
              <p className="opacity-70 mt-1 text-sm">Platform management • User control • System analytics • AI Intelligence</p>
            </div>
            <Button variant="secondary" onClick={runSystemAnalysis} disabled={aiAnalysis.loading}>
              {aiAnalysis.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Run System AI Analysis
            </Button>
          </div>
        </div>

        {/* Platform metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Users} label="Total Users" value={totalUsers} accent="primary" />
          <MetricCard icon={FileText} label="Total Reports" value={totalObs} accent="primary" />
          <MetricCard icon={AlertTriangle} label="High Risk" value={highRisk} accent="destructive" highlight={highRisk > 0} />
          <MetricCard icon={Activity} label="Outbreak Alerts" value={alerts} accent="accent" highlight={alerts > 0} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={HeartPulse} label="Doctors" value={doctorCount} accent="primary" />
          <MetricCard icon={Users} label="Volunteers" value={volunteerCount} accent="primary" />
          <MetricCard icon={Globe} label="Countries" value={countries} accent="primary" />
          <MetricCard icon={TrendingUp} label="Total Cases" value={totalCases} accent="primary" />
        </div>

        {/* AI Analysis Results */}
        {aiAnalysis.result && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                AI System Analysis Results
              </CardTitle>
              <CardDescription>AI-powered outbreak prediction and trend analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${
                  aiAnalysis.result.overall_risk_score > 70 ? "text-[hsl(var(--risk-high))]" :
                  aiAnalysis.result.overall_risk_score > 40 ? "text-[hsl(var(--risk-medium))]" :
                  "text-[hsl(var(--risk-low))]"
                }`}>
                  {aiAnalysis.result.overall_risk_score}/100
                </div>
                <div>
                  <Badge className={
                    aiAnalysis.result.risk_label === "Critical" || aiAnalysis.result.risk_label === "High" ? "bg-[hsl(var(--risk-high))] text-white" :
                    aiAnalysis.result.risk_label === "Medium" ? "bg-[hsl(var(--risk-medium))] text-white" :
                    "bg-[hsl(var(--risk-low))] text-white"
                  }>
                    {aiAnalysis.result.risk_label}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{aiAnalysis.result.summary}</p>
                </div>
              </div>

              {aiAnalysis.result.hotspots?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Hotspots</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {aiAnalysis.result.hotspots.map((h: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{h.region}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.predicted_disease} • {h.trend} • {Math.round(h.confidence * 100)}% confidence</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.result.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.result.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Zap className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>{totalUsers} registered users</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Filter role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="volunteer">Volunteers</SelectItem>
                    <SelectItem value="doctor">Doctors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.roles.includes("admin");
                  const primaryRole = user.roles.find((r) => r !== "admin") || "none";
                  return (
                    <div key={user.user_id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${isAdmin ? "bg-primary/10" : "bg-muted"}`}>
                          {isAdmin ? <Crown className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{user.display_name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.roles.map((r) => (
                              <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                                {r}
                              </Badge>
                            ))}
                            {user.roles.length === 0 && (
                              <span className="text-xs text-muted-foreground">No role</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select value={primaryRole} onValueChange={(val) => handleRoleChange(user.user_id, val)}>
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant={isAdmin ? "destructive" : "outline"}
                          className="h-8 text-xs"
                          onClick={() => toggleAdmin(user.user_id, isAdmin)}
                        >
                          {isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Analytics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />Validation Pipeline
              </h3>
              <div className="space-y-3">
                <PipelineRow label="Pending" count={pending} color="text-amber-600" />
                <PipelineRow label="Validated" count={validated} color="text-emerald-600" />
                <PipelineRow label="Rejected" count={totalObs - pending - validated} color="text-red-500" />
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Validation Rate</span>
                  <span className="font-medium">{totalObs > 0 ? Math.round((validated / totalObs) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${totalObs > 0 ? (validated / totalObs) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />Coverage
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Globe className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-2xl font-bold">{countries}</p><p className="text-xs text-muted-foreground">Countries</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5"><MapPin className="h-5 w-5 text-accent" /></div>
                  <div><p className="text-2xl font-bold">{regions}</p><p className="text-xs text-muted-foreground">Regions</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />User Distribution
              </h3>
              <div className="space-y-3">
                <RoleBar label="Volunteers" count={volunteerCount} total={totalUsers} color="bg-primary" />
                <RoleBar label="Doctors" count={doctorCount} total={totalUsers} color="bg-accent" />
                <RoleBar label="Admins" count={adminCount} total={totalUsers} color="bg-[hsl(var(--risk-high))]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap */}
        <ObservationHeatmap observations={observations} />

        {/* Charts */}
        <OverviewCharts casesOverTime={casesOverTime} symptomChartData={symptomChartData} />
      </div>
    </AppLayout>
  );
}

function MetricCard({ icon: Icon, label, value, accent, highlight }: { icon: any; label: string; value: number; accent: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)] shadow-sm" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${accent === "destructive" ? "bg-[hsl(var(--risk-high)/0.1)]" : accent === "accent" ? "bg-accent/10" : "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${accent === "destructive" ? "text-[hsl(var(--risk-high))]" : accent === "accent" ? "text-accent" : "text-primary"}`} />
          </div>
          <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${color}`}>{label}</span>
      <span className="font-semibold text-sm">{count}</span>
    </div>
  );
}

function RoleBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="font-medium">{label}</span><span className="text-muted-foreground">{count}</span></div>
      <div className="w-full bg-muted rounded-full h-2"><div className={`${color} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRiskBadgeClasses } from "@/lib/riskCalculation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  Activity,
  FileText,
  TrendingUp,
  Search,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

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
}

export default function Dashboard() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setObservations(data as Observation[]);
    }
    setLoading(false);
  };

  // Stats
  const totalReports = observations.length;
  const highRiskCount = observations.filter((o) => o.rule_risk_level === "High").length;
  const activeAlerts = observations.filter((o) => o.outbreak_alert).length;
  const totalCases = observations.reduce((sum, o) => sum + o.case_count, 0);

  // Chart data — cases over time (last 30 days grouped by date)
  const casesOverTime = observations
    .reduce((acc: { date: string; cases: number }[], obs) => {
      const date = format(new Date(obs.created_at), "MMM dd");
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.cases += obs.case_count;
      } else {
        acc.push({ date, cases: obs.case_count });
      }
      return acc;
    }, [])
    .reverse()
    .slice(-14);

  // Symptom frequency
  const symptomFrequency = observations
    .flatMap((o) => o.symptoms)
    .reduce((acc: Record<string, number>, symptom) => {
      acc[symptom] = (acc[symptom] || 0) + 1;
      return acc;
    }, {});

  const symptomChartData = Object.entries(symptomFrequency)
    .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
    .sort((a, b) => b.count - a.count);

  // Filtered observations
  const filtered = observations.filter((o) => {
    const matchesSearch =
      searchTerm === "" ||
      o.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "all" || o.rule_risk_level === riskFilter;
    return matchesSearch && matchesRisk;
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
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time disease surveillance overview</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalReports}</p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[hsl(var(--risk-high)/0.1)] p-2.5">
                  <AlertTriangle className="h-5 w-5 text-[hsl(var(--risk-high))]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{highRiskCount}</p>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2.5">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeAlerts}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCases}</p>
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cases Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {casesOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={casesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-12 text-center">
                  No data yet. Submit observations to see trends.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Symptom Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              {symptomChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={symptomChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-12 text-center">
                  No data yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Observations table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <CardTitle className="text-base">Recent Observations</CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search location..."
                    className="pl-9 w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Symptoms</TableHead>
                    <TableHead>Cases</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No observations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.slice(0, 50).map((obs) => (
                      <TableRow key={obs.id} className={obs.outbreak_alert ? "bg-[hsl(var(--risk-high)/0.03)]" : ""}>
                        <TableCell className="font-medium">
                          {obs.city}, {obs.region}
                          <div className="text-xs text-muted-foreground">{obs.country}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {obs.symptoms.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{obs.case_count}</TableCell>
                        <TableCell>
                          <Badge className={getRiskBadgeClasses(obs.rule_risk_level)}>
                            {obs.rule_risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {obs.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(obs.created_at), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

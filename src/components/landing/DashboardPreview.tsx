import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileText, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";

const casesData = [
  { month: "Jan", cases: 120 },
  { month: "Feb", cases: 180 },
  { month: "Mar", cases: 250 },
  { month: "Apr", cases: 310 },
  { month: "May", cases: 280 },
  { month: "Jun", cases: 420 },
];

const symptomData = [
  { symptom: "Fever", count: 340 },
  { symptom: "Cough", count: 280 },
  { symptom: "Diarrhea", count: 220 },
  { symptom: "Headache", count: 190 },
  { symptom: "Rash", count: 95 },
];

const predictions = [
  { disease: "Malaria", risk: "High", confidence: 87, region: "Lagos, Nigeria" },
  { disease: "Typhoid", risk: "Medium", confidence: 72, region: "Nairobi, Kenya" },
  { disease: "Cholera", risk: "High", confidence: 91, region: "Kinshasa, DRC" },
];

const riskBadge = (risk: string) => {
  const styles: Record<string, string> = {
    High: "bg-risk-high/10 text-risk-high border-risk-high/20",
    Medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
    Low: "bg-risk-low/10 text-risk-low border-risk-low/20",
  };
  return styles[risk] || "";
};

export const DashboardPreview = () => {
  return (
    <section id="dashboard" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Live Dashboard
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Real-Time Disease Monitoring
          </h2>
          <p className="text-muted-foreground">
            Visualize outbreak patterns, track predicted diseases, and monitor confidence scores across Africa.
          </p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl shadow-primary/5"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 border-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">1,247</p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-risk-high/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-risk-high/10">
                  <AlertTriangle className="h-5 w-5 text-risk-high" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">38</p>
                  <p className="text-xs text-muted-foreground">High-Risk Reports</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-accent/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">12</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Cases Over Time</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={casesData}>
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cases"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    activeDot={{ r: 5, fill: "hsl(var(--accent))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Symptom Frequency</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={symptomData}>
                  <XAxis dataKey="symptom" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--emerald-glow))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Predictions table */}
          <Card className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Predicted Disease Risks</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium">Disease</th>
                    <th className="pb-2 font-medium">Region</th>
                    <th className="pb-2 font-medium">Risk Level</th>
                    <th className="pb-2 font-medium text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.disease} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{p.disease}</td>
                      <td className="py-2.5 text-muted-foreground">{p.region}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className={riskBadge(p.risk)}>
                          {p.risk}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-medium text-foreground">{p.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button size="lg" variant="outline" className="font-semibold" asChild>
            <Link to="/dashboard">Explore Full Dashboard</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

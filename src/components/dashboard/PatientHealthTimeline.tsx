import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface BiomarkerRecord {
  id: string;
  screening_id: string;
  biomarker_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  is_abnormal: boolean;
  created_at: string;
}

const BIOMARKER_LABELS: Record<string, string> = {
  hemoglobin: "Hemoglobin",
  wbc: "WBC",
  glucose: "Fasting Glucose",
  cholesterol_total: "Total Cholesterol",
  ldl: "LDL",
  hdl: "HDL",
  hba1c: "HbA1c",
  creatinine: "Creatinine",
  psa: "PSA",
  troponin: "Troponin I",
  crp: "CRP",
  tsh: "TSH",
  ferritin: "Ferritin",
  vitamin_d: "Vitamin D",
};

export function PatientHealthTimeline() {
  const [biomarkers, setBiomarkers] = useState<BiomarkerRecord[]>([]);
  const [screenings, setScreenings] = useState<Array<{ id: string; patient_identifier: string; patient_name: string; source?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string>("all");
  const [selectedPatient, setSelectedPatient] = useState<string>("all");

  useEffect(() => {
    const fetch = async () => {
      const [bio, scr] = await Promise.all([
        supabase.from("biomarker_profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("health_screenings").select("id, patient_identifier, patient_name, source"),
      ]);
      if (bio.data) setBiomarkers(bio.data as any);
      if (scr.data) setScreenings(scr.data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (biomarkers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No biomarker data yet. Submit screenings to track health trends.</p>
        </CardContent>
      </Card>
    );
  }

  // Map screening_id -> patient identifier
  const screeningToPatient: Record<string, string> = {};
  const patientLabels: Record<string, string> = {};
  const screeningSource: Record<string, string> = {};
  screenings.forEach((s) => {
    const pid = s.patient_identifier || "(unassigned)";
    screeningToPatient[s.id] = pid;
    patientLabels[pid] = s.patient_name ? `${pid} — ${s.patient_name}` : pid;
    if (s.source) screeningSource[s.id] = s.source;
  });
  const patientOptions = Object.keys(patientLabels).sort();

  // Filter by selected patient
  const filteredBiomarkers = selectedPatient === "all"
    ? biomarkers
    : biomarkers.filter((b) => screeningToPatient[b.screening_id] === selectedPatient);

  if (filteredBiomarkers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No biomarker data for this patient yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by biomarker name
  const grouped: Record<string, BiomarkerRecord[]> = {};
  filteredBiomarkers.forEach((b) => {
    if (!grouped[b.biomarker_name]) grouped[b.biomarker_name] = [];
    grouped[b.biomarker_name].push(b);
  });

  const biomarkerNames = Object.keys(grouped).sort();
  const displayBiomarkers = selectedBiomarker === "all" ? biomarkerNames : [selectedBiomarker];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Patient Health Timeline
          </h3>
          <p className="text-sm text-muted-foreground">Track biomarker trends across multiple screenings</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter patient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Patients</SelectItem>
            {patientOptions.map((p) => (
              <SelectItem key={p} value={p}>{patientLabels[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedBiomarker} onValueChange={setSelectedBiomarker}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter biomarker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Biomarkers</SelectItem>
            {biomarkerNames.map((name) => (
              <SelectItem key={name} value={name}>
                {BIOMARKER_LABELS[name] || name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Biomarkers Tracked" value={biomarkerNames.length} />
        <SummaryCard label="Total Readings" value={filteredBiomarkers.length} />
        <SummaryCard
          label="Abnormal Values"
          value={filteredBiomarkers.filter((b) => b.is_abnormal).length}
          highlight={filteredBiomarkers.some((b) => b.is_abnormal)}
        />
        <SummaryCard label="Screenings" value={new Set(filteredBiomarkers.map((b) => b.screening_id)).size} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {displayBiomarkers.map((name) => {
          const records = grouped[name];
          const label = BIOMARKER_LABELS[name] || name;
          const unit = records[0]?.unit || "";
          const refLow = records[0]?.reference_range_low ?? undefined;
          const refHigh = records[0]?.reference_range_high ?? undefined;

          const chartData = records.map((r) => ({
            date: format(new Date(r.created_at), "MMM dd"),
            value: r.value,
            abnormal: r.is_abnormal,
          }));

          // Trend
          const trend = records.length >= 2
            ? records[records.length - 1].value - records[records.length - 2].value
            : 0;

          const latestAbnormal = records[records.length - 1]?.is_abnormal;

          return (
            <Card key={name} className={latestAbnormal ? "border-[hsl(var(--risk-high)/0.3)]" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {label} ({unit})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const src = screeningSource[records[records.length - 1].screening_id];
                      if (src === "self_reported") return <Badge variant="outline" className="text-[10px]">Home</Badge>;
                      if (src === "fhir") return <Badge variant="outline" className="text-[10px]">Lab (FHIR)</Badge>;
                      return null;
                    })()}
                    {latestAbnormal && (
                      <Badge className="bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))] text-xs">
                        Abnormal
                      </Badge>
                    )}
                    <TrendIndicator value={trend} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`gradient-${name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    {refLow !== undefined && (
                      <ReferenceLine
                        y={refLow}
                        stroke="hsl(var(--risk-medium))"
                        strokeDasharray="5 5"
                        label={{ value: "Low", fontSize: 10 }}
                      />
                    )}
                    {refHigh !== undefined && (
                      <ReferenceLine
                        y={refHigh}
                        stroke="hsl(var(--risk-medium))"
                        strokeDasharray="5 5"
                        label={{ value: "High", fontSize: 10 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#gradient-${name})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    Latest: <span className="font-medium text-foreground">{records[records.length - 1].value} {unit}</span>
                  </span>
                  {refLow !== undefined && refHigh !== undefined && (
                    <span>Ref: {refLow}–{refHigh} {unit}</span>
                  )}
                  {refLow === undefined && refHigh !== undefined && (
                    <span>Ref: &lt;{refHigh} {unit}</span>
                  )}
                  {refLow !== undefined && refHigh === undefined && (
                    <span>Ref: &gt;{refLow} {unit}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-[hsl(var(--risk-high)/0.3)]" : ""}>
      <CardContent className="pt-5 pb-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (value > 0) {
    return <TrendingUp className="h-4 w-4 text-[hsl(var(--risk-medium))]" />;
  }
  return <TrendingDown className="h-4 w-4 text-[hsl(var(--risk-low))]" />;
}

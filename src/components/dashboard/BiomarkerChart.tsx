import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity } from "lucide-react";

interface BiomarkerDataPoint {
  date: string;
  value: number;
  refLow?: number;
  refHigh?: number;
}

interface BiomarkerChartProps {
  title: string;
  data: BiomarkerDataPoint[];
  unit: string;
  refLow?: number;
  refHigh?: number;
}

export function BiomarkerChart({ title, data, unit, refLow, refHigh }: BiomarkerChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {title} ({unit})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            {refLow !== undefined && (
              <ReferenceLine y={refLow} stroke="hsl(var(--risk-medium))" strokeDasharray="5 5" label={{ value: "Low", fontSize: 10 }} />
            )}
            {refHigh !== undefined && (
              <ReferenceLine y={refHigh} stroke="hsl(var(--risk-medium))" strokeDasharray="5 5" label={{ value: "High", fontSize: 10 }} />
            )}
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User, FileText, FlaskConical, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Props {
  identifier: string;
  name: string;
  age: number;
  sex: string;
  screeningCount: number;
  latestScreeningAt?: string;
  topRisk?: { disease: string; pct: number } | null;
  onGenerateReport: () => void;
  generating: boolean;
}

export function PatientHeader({
  identifier, name, age, sex, screeningCount, latestScreeningAt, topRisk,
  onGenerateReport, generating,
}: Props) {
  const riskBadge = (pct: number) =>
    pct >= 60 ? "bg-[hsl(var(--risk-high)/0.15)] text-[hsl(var(--risk-high))]"
    : pct >= 30 ? "bg-[hsl(var(--risk-medium)/0.15)] text-[hsl(var(--risk-medium))]"
    : "bg-[hsl(var(--risk-low)/0.15)] text-[hsl(var(--risk-low))]";

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-primary to-[hsl(160_25%_25%)] text-primary-foreground p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-white/15 flex items-center justify-center">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">{name || "Anonymous patient"}</h1>
              <p className="text-sm opacity-80 mt-1">
                MRN: {identifier || "—"} • {age} yrs • {sex}
              </p>
              {topRisk && (
                <div className="mt-2">
                  <Badge className={riskBadge(topRisk.pct) + " border-none"}>
                    Top risk: {topRisk.disease} ({Math.round(topRisk.pct)}%)
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" asChild>
              <Link to="/submit-screening"><FlaskConical className="h-4 w-4 mr-2" />New Screening</Link>
            </Button>
            <Button onClick={onGenerateReport} disabled={generating} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileText className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Download PDF Report"}
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
        <Stat icon={FlaskConical} label="Screenings" value={String(screeningCount)} />
        <Stat icon={Calendar} label="Latest" value={latestScreeningAt ? format(new Date(latestScreeningAt), "MMM dd, yyyy") : "—"} />
        <Stat icon={User} label="Identifier" value={identifier || "—"} />
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-4 w-4 text-primary" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
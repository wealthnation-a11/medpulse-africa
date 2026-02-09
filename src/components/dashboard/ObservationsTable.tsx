import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRiskBadgeClasses } from "@/lib/riskCalculation";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface Observation {
  id: string;
  country: string;
  region: string;
  city: string;
  symptoms: string[];
  case_count: number;
  rule_risk_level: string;
  outbreak_alert: boolean;
  status: string;
  created_at: string;
}

interface ObservationsTableProps {
  observations: Observation[];
  title?: string;
  showStatusFilter?: boolean;
}

export function ObservationsTable({
  observations,
  title = "Recent Observations",
  showStatusFilter = false,
}: ObservationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = observations.filter((o) => {
    const matchesSearch =
      searchTerm === "" ||
      o.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "all" || o.rule_risk_level === riskFilter;
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-wrap gap-3">
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
            {showStatusFilter && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
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
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No observations found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.slice(0, 50).map((obs) => (
                  <TableRow
                    key={obs.id}
                    className={
                      obs.outbreak_alert
                        ? "bg-[hsl(var(--risk-high)/0.03)]"
                        : ""
                    }
                  >
                    <TableCell className="font-medium">
                      {obs.city}, {obs.region}
                      <div className="text-xs text-muted-foreground">
                        {obs.country}
                      </div>
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
                      <Badge
                        className={getRiskBadgeClasses(obs.rule_risk_level)}
                      >
                        {obs.rule_risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={obs.status} />
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
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    validated: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rejected: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Badge
      variant="outline"
      className={`capitalize ${variants[status] || ""}`}
    >
      {status === "pending" && "⏳ "}
      {status === "validated" && "✅ "}
      {status === "rejected" && "❌ "}
      {status}
    </Badge>
  );
}

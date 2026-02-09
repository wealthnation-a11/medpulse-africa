import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Activity,
  FileText,
  TrendingUp,
} from "lucide-react";

interface StatsCardsProps {
  totalReports: number;
  highRiskCount: number;
  activeAlerts: number;
  totalCases: number;
}

export function StatsCards({
  totalReports,
  highRiskCount,
  activeAlerts,
  totalCases,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Total Reports",
      value: totalReports,
      icon: FileText,
      color: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "High Risk",
      value: highRiskCount,
      icon: AlertTriangle,
      color: "bg-[hsl(var(--risk-high)/0.1)]",
      iconColor: "text-[hsl(var(--risk-high))]",
    },
    {
      label: "Active Alerts",
      value: activeAlerts,
      icon: Activity,
      color: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      label: "Total Cases",
      value: totalCases,
      icon: TrendingUp,
      color: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.color} p-2.5`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

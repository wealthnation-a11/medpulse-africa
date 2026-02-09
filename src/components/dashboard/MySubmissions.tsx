import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ObservationsTable } from "./ObservationsTable";
import { Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

export function MySubmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMyObservations();
  }, [user]);

  const fetchMyObservations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("observations")
      .select("*")
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setObservations(data as Observation[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            You haven't submitted any health observations. Start by reporting symptoms observed in your community.
          </p>
          <Button onClick={() => navigate("/submit")}>
            Submit Your First Observation
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const pending = observations.filter((o) => o.status === "pending").length;
  const validated = observations.filter((o) => o.status === "validated").length;
  const rejected = observations.filter((o) => o.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground mt-1">⏳ Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-emerald-600">{validated}</p>
            <p className="text-xs text-muted-foreground mt-1">✅ Validated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-600">{rejected}</p>
            <p className="text-xs text-muted-foreground mt-1">❌ Rejected</p>
          </CardContent>
        </Card>
      </div>

      <ObservationsTable
        observations={observations}
        title="My Submissions"
        showStatusFilter
      />
    </div>
  );
}

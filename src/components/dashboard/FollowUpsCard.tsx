import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";

interface FollowUp {
  id: string;
  patient_identifier: string;
  biomarker_name: string;
  projected_value: number | null;
  threshold_value: number | null;
  due_at: string;
  reason: string;
  status: string;
}

export function FollowUpsCard() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("screening_follow_ups")
      .select("*")
      .in("status", ["pending", "notified"])
      .order("due_at", { ascending: true })
      .limit(25);
    setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    await supabase.from("screening_follow_ups").update({ status }).eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Upcoming Follow-ups</CardTitle>
        <CardDescription>Auto-scheduled when biomarkers trend toward abnormal ranges.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : items.length === 0 ? <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
          : (
            <ul className="space-y-2">
              {items.map((f) => {
                const overdue = new Date(f.due_at) < new Date();
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{f.patient_identifier}</span>
                        <Badge variant="outline" className="text-xs">{f.biomarker_name}</Badge>
                        {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{f.reason}</p>
                      <p className="text-xs text-muted-foreground">Due {format(new Date(f.due_at), "PP")}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => update(f.id, "completed")}><CheckCircle2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => update(f.id, "dismissed")}><X className="h-3 w-3" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}
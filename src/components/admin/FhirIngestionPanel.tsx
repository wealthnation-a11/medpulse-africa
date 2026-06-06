import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Network } from "lucide-react";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
const ENDPOINT = `${PROJECT_URL}/functions/v1/fhir-ingest`;

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function FhirIngestionPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  const load = async () => {
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from("fhir_ingest_tokens").select("*").order("created_at", { ascending: false }),
      supabase.from("fhir_ingest_logs").select("*").order("received_at", { ascending: false }).limit(15),
    ]);
    setTokens(t || []);
    setLogs(l || []);
  };
  useEffect(() => { load(); }, []);

  const mint = async () => {
    if (!user || !label.trim()) return;
    const raw = "fhir_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const hash = await sha256(raw);
    const { error } = await supabase.from("fhir_ingest_tokens").insert({ label: label.trim(), token_hash: hash, created_by: user.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewToken(raw);
    setLabel("");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("fhir_ingest_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast({ title: "Copied" }); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-primary" /> FHIR Ingestion</CardTitle>
        <CardDescription>Accepts FHIR R4 Bundle/Observation/DiagnosticReport posts from external lab systems. HL7 v2 and DICOMweb are out of scope for this version.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Endpoint URL</Label>
          <div className="flex gap-2">
            <Input readOnly value={ENDPOINT} />
            <Button variant="outline" size="icon" onClick={() => copy(ENDPOINT)}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Header: <code>X-FHIR-Ingest-Token: &lt;token&gt;</code></p>
        </div>

        <div className="space-y-2">
          <Label>Mint a new token</Label>
          <div className="flex gap-2">
            <Input placeholder="Label (e.g. Lab A nightly)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button onClick={mint}><Plus className="h-4 w-4 mr-1" />Create</Button>
          </div>
          {newToken && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium mb-1">Copy this token now — it will not be shown again:</p>
              <div className="flex gap-2">
                <Input readOnly value={newToken} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => copy(newToken)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>Active tokens</Label>
          <ul className="mt-2 space-y-2">
            {tokens.length === 0 && <li className="text-sm text-muted-foreground">No tokens yet.</li>}
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <span className="font-medium">{t.label}</span>
                  {t.revoked_at && <Badge variant="destructive" className="ml-2 text-xs">revoked</Badge>}
                  <p className="text-xs text-muted-foreground">last used: {t.last_used_at ?? "—"}</p>
                </div>
                {!t.revoked_at && <Button size="sm" variant="ghost" onClick={() => revoke(t.id)}>Revoke</Button>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Label>Recent ingest activity</Label>
          <ul className="mt-2 space-y-1 text-sm">
            {logs.length === 0 && <li className="text-muted-foreground">No ingestions yet.</li>}
            {logs.map((l) => (
              <li key={l.id} className="rounded border p-2 text-xs">
                <span className="font-medium">{new Date(l.received_at).toLocaleString()}</span> — {l.source_system || "unknown"} — created {l.created_count}/{l.resource_count} resources
                {l.skipped?.length > 0 && <span className="text-muted-foreground"> · skipped {l.skipped.length}</span>}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ImageOff } from "lucide-react";
import { format } from "date-fns";

interface ImagingScreening {
  id: string;
  created_at: string;
  imaging_findings?: string;
  test_results: Record<string, any>;
}

interface Props {
  screenings: ImagingScreening[];
}

export function ImagingGallery({ screenings }: Props) {
  const [urlsByScreening, setUrlsByScreening] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      const result: Record<string, string[]> = {};
      for (const s of screenings) {
        const paths: string[] = Array.isArray(s.test_results?.image_paths) ? s.test_results.image_paths : [];
        const urls: string[] = [];
        for (const p of paths) {
          const { data } = await supabase.storage.from("medical-images").createSignedUrl(p, 600);
          if (data?.signedUrl) urls.push(data.signedUrl);
        }
        if (urls.length > 0) result[s.id] = urls;
      }
      setUrlsByScreening(result);
    })();
  }, [screenings]);

  if (screenings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Medical Imaging</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-sm text-muted-foreground">
          <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No imaging studies on file.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Medical Imaging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {screenings.map((s) => {
          const urls = urlsByScreening[s.id] || [];
          return (
            <div key={s.id} className="space-y-2 pb-3 border-b border-border last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">
                  {(s.test_results?.imaging_type ?? "Image").toString().toUpperCase()}
                  {s.test_results?.body_region ? ` • ${s.test_results.body_region}` : ""}
                </span>
                <span className="text-muted-foreground">{format(new Date(s.created_at), "MMM dd, yyyy")}</span>
              </div>
              {s.imaging_findings && (
                <p className="text-xs text-muted-foreground italic">{s.imaging_findings}</p>
              )}
              {urls.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded overflow-hidden border border-border">
                      <img src={u} alt="Medical scan" className="w-full h-24 object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading images...</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
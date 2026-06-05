import { useState } from "react";

export interface ImagingRegion {
  label: string;
  severity: "low" | "medium" | "high" | string;
  bbox_pct: number[]; // [x, y, w, h] in 0..1
}

interface Props {
  src: string;
  regions?: ImagingRegion[];
  alt?: string;
  className?: string;
}

const severityColor = (s: string) => {
  if (s === "high") return "hsl(var(--risk-high))";
  if (s === "medium") return "hsl(var(--risk-medium))";
  return "hsl(var(--risk-low))";
};

export function ImagingOverlay({ src, regions = [], alt = "Medical image", className }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const valid = regions.filter(
    (r) => Array.isArray(r.bbox_pct) && r.bbox_pct.length === 4 && r.bbox_pct.every((n) => typeof n === "number"),
  );

  return (
    <div className={`relative inline-block w-full ${className || ""}`}>
      <img src={src} alt={alt} className="w-full h-auto rounded-lg border border-border block" />
      {valid.map((r, i) => {
        const [x, y, w, h] = r.bbox_pct;
        const color = severityColor(String(r.severity).toLowerCase());
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="absolute border-2 rounded-sm transition-opacity"
            style={{
              left: `${Math.max(0, Math.min(1, x)) * 100}%`,
              top: `${Math.max(0, Math.min(1, y)) * 100}%`,
              width: `${Math.max(0, Math.min(1, w)) * 100}%`,
              height: `${Math.max(0, Math.min(1, h)) * 100}%`,
              borderColor: color,
              backgroundColor: `${color.replace("hsl(", "hsla(").replace(")", " / 0.15)")}`,
              boxShadow: active === i ? `0 0 0 2px ${color}` : "none",
            }}
            aria-label={r.label}
          >
            <span
              className="absolute -top-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: color, color: "white" }}
            >
              {r.label}
            </span>
          </button>
        );
      })}
      {valid.length > 0 && (
        <p className="absolute bottom-1 right-1 text-[10px] bg-background/80 backdrop-blur px-1.5 py-0.5 rounded text-muted-foreground">
          AI-suggested regions — advisory, not pixel-accurate
        </p>
      )}
    </div>
  );
}
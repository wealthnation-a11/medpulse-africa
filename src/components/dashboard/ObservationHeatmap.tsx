import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Observation {
  country: string;
  region: string;
  city: string;
  case_count: number;
  rule_risk_level: string;
  outbreak_alert: boolean;
}

interface ObservationHeatmapProps {
  observations: Observation[];
}

// Known African city approximate positions on SVG (expandable)
const cityPositions: Record<string, { x: number; y: number }> = {
  cairo: { x: 285, y: 52 },
  alexandria: { x: 275, y: 42 },
  lagos: { x: 145, y: 215 },
  abuja: { x: 160, y: 200 },
  nairobi: { x: 322, y: 245 },
  mombasa: { x: 335, y: 260 },
  kinshasa: { x: 240, y: 262 },
  "cape town": { x: 268, y: 395 },
  johannesburg: { x: 282, y: 370 },
  durban: { x: 298, y: 380 },
  "addis ababa": { x: 312, y: 188 },
  khartoum: { x: 300, y: 140 },
  accra: { x: 135, y: 218 },
  dakar: { x: 82, y: 175 },
  kampala: { x: 305, y: 238 },
  "dar es salaam": { x: 330, y: 275 },
  luanda: { x: 215, y: 295 },
  casablanca: { x: 125, y: 50 },
  tunis: { x: 205, y: 30 },
  algiers: { x: 175, y: 28 },
  maputo: { x: 310, y: 365 },
  harare: { x: 295, y: 340 },
  lusaka: { x: 278, y: 320 },
  bamako: { x: 115, y: 175 },
  douala: { x: 195, y: 232 },
  yaoundé: { x: 200, y: 228 },
  antananarivo: { x: 375, y: 335 },
  mogadishu: { x: 355, y: 210 },
  freetown: { x: 95, y: 200 },
  conakry: { x: 90, y: 195 },
  niamey: { x: 160, y: 170 },
  ouagadougou: { x: 138, y: 180 },
  libreville: { x: 200, y: 250 },
  brazzaville: { x: 238, y: 265 },
  lome: { x: 140, y: 215 },
  cotonou: { x: 145, y: 218 },
};

function getRiskColor(risk: string) {
  switch (risk) {
    case "High": return "hsl(var(--risk-high))";
    case "Medium": return "hsl(var(--risk-medium))";
    default: return "hsl(var(--risk-low))";
  }
}

export function ObservationHeatmap({ observations }: ObservationHeatmapProps) {
  // Aggregate observations by city
  const cityAgg = observations.reduce<Record<string, { cases: number; count: number; risk: string; outbreak: boolean }>>((acc, obs) => {
    const key = obs.city.toLowerCase().trim();
    if (!acc[key]) {
      acc[key] = { cases: 0, count: 0, risk: obs.rule_risk_level, outbreak: false };
    }
    acc[key].cases += obs.case_count;
    acc[key].count += 1;
    if (obs.rule_risk_level === "High") acc[key].risk = "High";
    else if (obs.rule_risk_level === "Medium" && acc[key].risk !== "High") acc[key].risk = "Medium";
    if (obs.outbreak_alert) acc[key].outbreak = true;
    return acc;
  }, {});

  // Match aggregated cities to known positions
  const hotspots = Object.entries(cityAgg)
    .filter(([city]) => cityPositions[city])
    .map(([city, data]) => ({
      ...cityPositions[city],
      label: city.charAt(0).toUpperCase() + city.slice(1),
      ...data,
      radius: Math.min(Math.max(data.cases, 4), 18),
    }));

  // Top regions by case count
  const regionAgg = observations.reduce<Record<string, number>>((acc, obs) => {
    acc[obs.region] = (acc[obs.region] || 0) + obs.case_count;
    return acc;
  }, {});
  const topRegions = Object.entries(regionAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Geographic Observation Density</CardTitle>
        <CardDescription>Real-time distribution of reported cases across Africa</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Map */}
          <div className="lg:col-span-3 flex justify-center">
            <svg viewBox="0 0 440 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md">
              <defs>
                <linearGradient id="heatmapFill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id="heatmapStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {/* Africa outline */}
              <path
                d="M185,28 C210,18 250,14 285,18 C310,22 328,38 340,55 C348,68 350,82 345,100 C352,125 360,152 358,178 C354,205 345,232 332,260 C320,288 305,315 290,340 C278,362 262,384 248,402 C238,415 225,428 215,435 C205,440 195,434 185,420 C172,400 158,375 145,348 C132,320 118,290 108,262 C95,238 85,218 80,200 C74,182 78,165 88,150 C100,135 115,128 122,112 C128,98 120,78 118,62 C116,48 126,38 145,30 C158,25 172,24 185,28 Z"
                fill="url(#heatmapFill)"
                stroke="url(#heatmapStroke)"
                strokeWidth="1.5"
              />

              {/* Grid lines */}
              {[100, 180, 260, 340].map((y) => (
                <line key={`h-${y}`} x1="60" y1={y} x2="380" y2={y} stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.5" strokeDasharray="4 4" />
              ))}
              {[120, 200, 280, 360].map((x) => (
                <line key={`v-${x}`} x1={x} y1="10" x2={x} y2="450" stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.5" strokeDasharray="4 4" />
              ))}

              {/* Data-driven hotspots */}
              {hotspots.map((spot, i) => (
                <g key={spot.label}>
                  {/* Pulse ring */}
                  <motion.circle
                    cx={spot.x} cy={spot.y} r={spot.radius + 6}
                    fill={getRiskColor(spot.risk)} opacity="0.12"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.12, 0, 0.12] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                  />
                  {/* Main dot scaled by cases */}
                  <motion.circle
                    cx={spot.x} cy={spot.y} r={spot.radius}
                    fill={getRiskColor(spot.risk)} opacity="0.6"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  />
                  {/* Center dot */}
                  <circle cx={spot.x} cy={spot.y} r="2.5" fill="white" opacity="0.9" />
                  {/* Label */}
                  <text x={spot.x + spot.radius + 4} y={spot.y + 3} fontSize="8" fontFamily="inherit" fill="hsl(var(--muted-foreground))">
                    {spot.label} ({spot.cases})
                  </text>
                  {/* Outbreak indicator */}
                  {spot.outbreak && (
                    <motion.circle
                      cx={spot.x} cy={spot.y} r={spot.radius + 12}
                      fill="none" stroke={getRiskColor("High")} strokeWidth="1"
                      strokeDasharray="3 3" opacity="0.5"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      style={{ transformOrigin: `${spot.x}px ${spot.y}px` }}
                    />
                  )}
                </g>
              ))}

              {hotspots.length === 0 && (
                <text x="220" y="240" textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))">
                  No geo-matched observations yet
                </text>
              )}
            </svg>
          </div>

          {/* Region breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Regions by Cases</h4>
              {topRegions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topRegions.map(([region, cases]) => {
                    const maxCases = topRegions[0][1] as number;
                    return (
                      <div key={region}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{region}</span>
                          <span className="text-muted-foreground">{cases} cases</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all"
                            style={{ width: `${(cases as number / maxCases) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-border">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Risk Legend</h4>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "High", color: "hsl(var(--risk-high))" },
                  { label: "Medium", color: "hsl(var(--risk-medium))" },
                  { label: "Low", color: "hsl(var(--risk-low))" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[hsl(var(--risk-high))]" />
                <span className="text-xs">Outbreak Alert</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

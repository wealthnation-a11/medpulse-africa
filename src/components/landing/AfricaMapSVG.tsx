import { motion } from "framer-motion";

interface Hotspot {
  x: number;
  y: number;
  label: string;
  risk: "high" | "medium" | "low";
}

const hotspots: Hotspot[] = [
  { x: 285, y: 52, label: "Cairo", risk: "medium" },
  { x: 145, y: 215, label: "Lagos", risk: "high" },
  { x: 322, y: 245, label: "Nairobi", risk: "high" },
  { x: 240, y: 262, label: "Kinshasa", risk: "medium" },
  { x: 268, y: 395, label: "Cape Town", risk: "low" },
  { x: 312, y: 188, label: "Addis Ababa", risk: "high" },
];

const riskColors = {
  high: "hsl(var(--risk-high))",
  medium: "hsl(var(--risk-medium))",
  low: "hsl(var(--risk-low))",
};

export const AfricaMapSVG = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 440 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="africaFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--emerald-glow))" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="africaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--emerald-glow))" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Africa outline */}
      <motion.path
        d="M185,28 C210,18 250,14 285,18 C310,22 328,38 340,55 C348,68 350,82 345,100 
           C352,125 360,152 358,178 C354,205 345,232 332,260 C320,288 305,315 290,340 
           C278,362 262,384 248,402 C238,415 225,428 215,435 C205,440 195,434 185,420 
           C172,400 158,375 145,348 C132,320 118,290 108,262 C95,238 85,218 80,200 
           C74,182 78,165 88,150 C100,135 115,128 122,112 C128,98 120,78 118,62 
           C116,48 126,38 145,30 C158,25 172,24 185,28 Z"
        fill="url(#africaFill)"
        stroke="url(#africaStroke)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* Grid lines for tech feel */}
      {[100, 180, 260, 340].map((y) => (
        <line
          key={`h-${y}`}
          x1="60"
          y1={y}
          x2="380"
          y2={y}
          stroke="hsl(var(--primary))"
          strokeOpacity="0.06"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}
      {[120, 200, 280, 360].map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1="10"
          x2={x}
          y2="450"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.06"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      ))}

      {/* Hotspot dots with pulse */}
      {hotspots.map((spot, i) => (
        <g key={spot.label}>
          <motion.circle
            cx={spot.x}
            cy={spot.y}
            r="12"
            fill={riskColors[spot.risk]}
            opacity="0.15"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 2, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
          />
          <motion.circle
            cx={spot.x}
            cy={spot.y}
            r="5"
            fill={riskColors[spot.risk]}
            opacity="0.8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 1.5 + i * 0.15 }}
          />
          <motion.circle
            cx={spot.x}
            cy={spot.y}
            r="2"
            fill="white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 1.8 + i * 0.15 }}
          />
          <motion.text
            x={spot.x + 10}
            y={spot.y + 4}
            fontSize="9"
            fontFamily="DM Sans, sans-serif"
            fill="hsl(var(--muted-foreground))"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2 + i * 0.1 }}
          >
            {spot.label}
          </motion.text>
        </g>
      ))}
    </svg>
  );
};

import { AlertOctagon, ShieldAlert, Sparkles, CheckCircle } from "lucide-react";

interface RiskMeterProps {
  score: number;
}

export default function RiskMeter({ score }: RiskMeterProps) {
  // Determine color and label based on score value
  let colorClass = "text-emerald-400";
  let strokeColor = "#34d399";
  let bgGradient = "from-emerald-950/20 to-slate-900";
  let borderClass = "border-emerald-500/20";
  let ratingLabel = "Excellent";
  let ratingDesc = "Highly polished, minimal security holes or structural flaws.";
  let RatingIcon = CheckCircle;

  if (score >= 75) {
    colorClass = "text-red-500 animate-pulse";
    strokeColor = "#ef4444";
    bgGradient = "from-red-950/30 to-slate-900";
    borderClass = "border-red-500/30";
    ratingLabel = "Critical Danger";
    ratingDesc = "Severe security vulnerabilities or memory-leaking bugs require immediate refactoring.";
    RatingIcon = AlertOctagon;
  } else if (score >= 45) {
    colorClass = "text-amber-500";
    strokeColor = "#f59e0b";
    bgGradient = "from-amber-950/20 to-slate-900";
    borderClass = "border-amber-500/20";
    ratingLabel = "High Exposure";
    ratingDesc = "Noticeable architectural smells and logical bugs. Ready for testing correction rounds.";
    RatingIcon = ShieldAlert;
  } else if (score >= 20) {
    colorClass = "text-indigo-400";
    strokeColor = "#818cf8";
    bgGradient = "from-indigo-950/20 to-slate-900";
    borderClass = "border-indigo-500/20";
    ratingLabel = "Moderate Smell";
    ratingDesc = "Minor performance issues or clean code smells. Recommend quick refinement.";
    RatingIcon = Sparkles;
  }

  // Circular calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${bgGradient} border ${borderClass} flex flex-col md:flex-row items-center gap-6 shadow-xl`}>
      {/* Gauge and value */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="150" height="150" className="transform -rotate-90">
          {/* Base circle */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="12"
          />
          {/* Dynamic ring */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold font-display leading-none text-white">
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 mt-1">
            RISK INDEX
          </span>
        </div>
      </div>

      {/* Narrative */}
      <div className="flex-1 space-y-2 text-center md:text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase font-mono text-indigo-400 font-semibold">
            SECUREMETRIC STATS
          </span>
          <span className="hidden md:inline text-slate-600">•</span>
          <div className="flex items-center justify-center md:justify-start gap-1">
            <RatingIcon size={14} className={colorClass} />
            <span className={`text-xs uppercase tracking-wider font-mono font-bold ${colorClass}`}>
              {ratingLabel}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-white font-display">Codebase Vulnerability Score</h3>
        <p className="text-sm text-slate-300 leading-relaxed max-w-md">
          {ratingDesc}
        </p>
        <div className="pt-2 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 justify-center md:justify-start">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Critical Area: 75+
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Warn: 45-74
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Secure: 0-19
          </span>
        </div>
      </div>
    </div>
  );
}

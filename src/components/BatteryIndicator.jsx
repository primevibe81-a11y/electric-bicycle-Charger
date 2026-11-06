import React from 'react';
import { BatteryCharging, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react';

export default function BatteryIndicator({
  level,
  isCharging = false,
  size = "md",
  showPercentSign = false
}) {
  const numLevel = Math.max(0, Math.min(100, Number(level) || 0));

  let colorClass = "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
  let barColor = "bg-emerald-500";
  let icon = <BatteryFull className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;

  if (numLevel < 20) {
    colorClass = "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 animate-pulse";
    barColor = "bg-rose-500";
    icon = <BatteryLow className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
  } else if (numLevel <= 60) {
    colorClass = "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30";
    barColor = "bg-amber-500";
    icon = <BatteryMedium className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
  }

  if (isCharging) {
    icon = <BatteryCharging className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-bounce" />;
    colorClass = "text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30";
    barColor = "bg-sky-500";
  }

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border tabular-nums shadow-2xs ${colorClass}`}
        title={`Baterai: ${numLevel}%`}
        aria-label={`Baterai ${numLevel} persen`}
      >
        {icon}
        <span>{numLevel}{showPercentSign ? '%' : ''}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2" title={`Baterai: ${numLevel}%`}>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border shadow-xs ${colorClass}`}>
        {icon}
        <span>{numLevel}{showPercentSign ? '%' : ''}</span>
      </div>
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={`h-full battery-fill-anim transition-all duration-300 ${barColor}`}
          style={{ width: `${numLevel}%` }}
        />
      </div>
    </div>
  );
}

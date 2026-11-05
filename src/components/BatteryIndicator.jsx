import React from 'react';
import { BatteryCharging, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react';

export default function BatteryIndicator({
  level,
  isCharging = false,
  size = "md",
  showPercentSign = false
}) {
  const numLevel = Math.max(0, Math.min(100, Number(level) || 0));

  let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
  let barColor = "bg-emerald-500";
  let icon = <BatteryFull className="w-3.5 h-3.5 text-emerald-600" />;

  if (numLevel < 20) {
    colorClass = "text-rose-700 bg-rose-50 border-rose-200 animate-pulse";
    barColor = "bg-rose-500";
    icon = <BatteryLow className="w-3.5 h-3.5 text-rose-600" />;
  } else if (numLevel <= 60) {
    colorClass = "text-amber-700 bg-amber-50 border-amber-200";
    barColor = "bg-amber-500";
    icon = <BatteryMedium className="w-3.5 h-3.5 text-amber-600" />;
  }

  if (isCharging) {
    icon = <BatteryCharging className="w-3.5 h-3.5 text-sky-600 animate-bounce" />;
    colorClass = "text-sky-800 bg-sky-50 border-sky-200";
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
      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={`h-full battery-fill-anim transition-all duration-300 ${barColor}`}
          style={{ width: `${numLevel}%` }}
        />
      </div>
    </div>
  );
}

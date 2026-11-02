import React from 'react';
import { BatteryCharging, BatteryWarning, BatteryFull, BatteryMedium, BatteryLow } from 'lucide-react';

export default function BatteryIndicator({ level, isCharging = false, size = "md" }) {
  const numLevel = Math.max(0, Math.min(100, Number(level) || 0));

  let colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
  let barColor = "bg-emerald-500";
  let icon = <BatteryFull className="w-4 h-4 text-emerald-600" />;

  if (numLevel < 20) {
    colorClass = "text-rose-600 bg-rose-50 border-rose-200 animate-pulse";
    barColor = "bg-rose-500";
    icon = <BatteryLow className="w-4 h-4 text-rose-600" />;
  } else if (numLevel <= 60) {
    colorClass = "text-amber-600 bg-amber-50 border-amber-200";
    barColor = "bg-amber-500";
    icon = <BatteryMedium className="w-4 h-4 text-amber-600" />;
  }

  if (isCharging) {
    icon = <BatteryCharging className="w-4 h-4 text-sky-600 animate-bounce" />;
    colorClass = "text-sky-700 bg-sky-50 border-sky-200";
    barColor = "bg-sky-500";
  }

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
        {icon}
        <span>{numLevel}%</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${colorClass}`}>
        {icon}
        <span>{numLevel}%</span>
      </div>
      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden max-w-[80px]">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${numLevel}%` }}
        />
      </div>
    </div>
  );
}

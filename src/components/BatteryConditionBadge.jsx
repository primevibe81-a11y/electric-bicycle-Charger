import React from 'react';
import { BATTERY_CONDITIONS } from '../services/chargerQueue';
import { CheckCircle2, AlertTriangle, XCircle, Flame, ShieldAlert } from 'lucide-react';

export default function BatteryConditionBadge({ condition = 'PRIMA', size = 'sm', onClick = null }) {
  const conf = BATTERY_CONDITIONS[condition] || BATTERY_CONDITIONS.PRIMA;

  let icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
  if (condition === 'DROP_RINGAN') icon = <AlertTriangle className="w-3 h-3 text-amber-600" />;
  if (condition === 'SOAK_PARAH') icon = <AlertTriangle className="w-3 h-3 text-orange-600" />;
  if (condition === 'RUSAK_TOTAL') icon = <XCircle className="w-3 h-3 text-rose-600" />;
  if (condition === 'KEMBUNG_BAHAYA') icon = <Flame className="w-3 h-3 text-purple-600" />;

  const isInteractive = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold rounded-full border shadow-xs transition-all ${
        conf.badgeClass
      } ${
        size === 'xs' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5'
      } ${
        isInteractive ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
      }`}
      title={`Kondisi Baterai: ${conf.label} - ${conf.desc}`}
    >
      {icon}
      <span>{conf.label}</span>
    </span>
  );
}

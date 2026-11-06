import React from 'react';
import { BATTERY_CONDITIONS } from '../services/chargerQueue';
import { CheckCircle2, AlertTriangle, AlertOctagon, XCircle, Flame } from 'lucide-react';
import Tooltip from './Tooltip';

/**
 * Badge Kondisi Baterai Minimalis & Ramah Buta Warna
 * 
 * Menggunakan bentuk geometris berbeda:
 * - PRIMA: Centang Hijau dalam Lingkaran
 * - DROP_RINGAN / SOAK_PARAH: Segitiga Peringatan Amber
 * - RUSAK_TOTAL: Silang / Oktagon Merah
 * - KEMBUNG_BAHAYA: Api Ungu
 * 
 * Default: Ikon bentuk tanpa teks panjang "Prima (Normal)" untuk menjaga kartu bersih.
 * Label lengkap muncul saat ditahan/hover lewat Tooltip atau saat showLabel={true}.
 */
export default function BatteryConditionBadge({
  condition = 'PRIMA',
  kondisi = null, // Alias jika dikirim dari komponen lama
  size = 'sm',
  showLabel = false,
  onClick = null
}) {
  const activeCondition = kondisi || condition || 'PRIMA';
  const conf = BATTERY_CONDITIONS[activeCondition] || BATTERY_CONDITIONS.PRIMA;

  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
  let shapeClass = "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";

  if (activeCondition === 'DROP_RINGAN') {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    shapeClass = "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30";
  } else if (activeCondition === 'SOAK_PARAH') {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
    shapeClass = "bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30";
  } else if (activeCondition === 'RUSAK_TOTAL') {
    icon = <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    shapeClass = "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30";
  } else if (activeCondition === 'KEMBUNG_BAHAYA') {
    icon = <Flame className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    shapeClass = "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30";
  }

  const isInteractive = Boolean(onClick);
  const tooltipText = `Baterai ${conf.label}`;

  const badgeContent = (
    <span
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      aria-label={tooltipText}
      className={`inline-flex items-center gap-1 font-bold rounded-full border shadow-2xs transition-all ${shapeClass} ${
        showLabel
          ? (size === 'xs' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-0.5')
          : 'w-6 h-6 justify-center'
      } ${
        isInteractive ? 'cursor-pointer hover:opacity-85 active:scale-95' : ''
      }`}
    >
      {icon}
      {showLabel && <span>{conf.label}</span>}
    </span>
  );

  if (showLabel) {
    return badgeContent;
  }

  return (
    <Tooltip content={tooltipText} position="top">
      {badgeContent}
    </Tooltip>
  );
}

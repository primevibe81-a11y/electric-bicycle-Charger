import React from 'react';
import { getChargeAuditInfo } from '../services/chargerQueue';
import { Clock, AlertOctagon, Check } from 'lucide-react';

export default function ChargeAuditBadge({ lastChargedAt, masukAt, showFullAlert = false }) {
  const audit = getChargeAuditInfo(lastChargedAt, masukAt);

  if (showFullAlert && audit.isCritical) {
    return (
      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-start gap-1.5 animate-pulse">
        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="leading-tight">
          <span>{audit.alertMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${audit.badgeClass}`}
      title={audit.alertMessage || `Terakhir di-charge: ${audit.daysAgo} hari yang lalu`}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>{audit.label}</span>
    </span>
  );
}

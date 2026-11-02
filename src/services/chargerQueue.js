export const MAX_QUEUE_LIMIT = 2;
export const DEFAULT_CHARGE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Jam Standar (10.800.000 ms)

export const CHARGE_PRESETS = [
  { label: '1 Jam', ms: 1 * 60 * 60 * 1000, desc: 'Top-Up / Cek Arus' },
  { label: '2 Jam', ms: 2 * 60 * 60 * 1000, desc: 'Perawatan Berkala' },
  { label: '3 Jam', ms: 3 * 60 * 60 * 1000, desc: 'Standar Pengisian' },
  { label: '4 Jam', ms: 4 * 60 * 60 * 1000, desc: 'Kapasitas Besar' },
];

export const BATTERY_CONDITIONS = {
  PRIMA: {
    id: 'PRIMA',
    label: 'Prima (Normal)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    iconColor: 'text-emerald-600',
    desc: 'Sel baterai sehat, daya stabil'
  },
  DROP_RINGAN: {
    id: 'DROP_RINGAN',
    label: 'Drop Ringan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    desc: 'Perlu sering diisi daya'
  },
  SOAK_PARAH: {
    id: 'SOAK_PARAH',
    label: 'Soak Parah',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    desc: 'Cepat habis drastis'
  },
  RUSAK_TOTAL: {
    id: 'RUSAK_TOTAL',
    label: 'Rusak / Mati',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    iconColor: 'text-rose-600',
    desc: 'Arus charger tidak masuk'
  },
  KEMBUNG_BAHAYA: {
    id: 'KEMBUNG_BAHAYA',
    label: 'Kembung Bahaya',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse',
    iconColor: 'text-purple-600',
    desc: 'Fisik baterai menggembung'
  }
};

/**
 * Validasi kode gadai: Mendukung format angka unik maupun format sistem akad gadai (contoh: 26_0037861 atau 2026110045)
 */
export function isValidKodeGadai(code) {
  return typeof code === 'string' && /^[A-Za-z0-9_-]+$/.test(code.trim());
}

/**
 * Mengurutkan antrian dengan prioritas baterai paling rendah di paling atas (#1)
 * Jika persentase baterai sama persis, unit yang didaftarkan lebih dulu (queuedAt lebih awal) ditempatkan di atas.
 */
export function sortWaitingQueue(waitingUnits) {
  return [...waitingUnits].sort((a, b) => {
    const batA = Number(a.batteryLevel ?? 0);
    const batB = Number(b.batteryLevel ?? 0);
    if (batA !== batB) {
      return batA - batB; // Ascending: Baterai terendah di Urutan #1
    }
    return (a.queuedAt || 0) - (b.queuedAt || 0); // Tie-breaker: waktu masuk antrian
  });
}

/**
 * Validasi apakah unit baru boleh masuk ke antrian (Maksimal 2 unit)
 */
export function canEnqueueUnit(waitingUnits) {
  return waitingUnits.length < MAX_QUEUE_LIMIT;
}

/**
 * Menghitung sisa waktu charger dinamis dari timestamp chargeEndAt dan chargeDurationMs
 */
export function getRemainingChargeTime(chargeEndAt, chargeDurationMs = DEFAULT_CHARGE_DURATION_MS) {
  if (!chargeEndAt) {
    return {
      remainingMs: 0,
      isFinished: true,
      formatted: "00:00:00",
      progressPercent: 0
    };
  }

  const duration = Number(chargeDurationMs) || DEFAULT_CHARGE_DURATION_MS;
  const remainingMs = Math.max(0, Number(chargeEndAt) - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((duration - remainingMs) / duration) * 100))
  );

  return {
    remainingMs,
    isFinished: remainingMs === 0,
    formatted: `${hours}:${minutes}:${seconds}`,
    progressPercent
  };
}

/**
 * Analisis Audit Waktu Terakhir Di-Charge (Smart Alert > 14/15 Hari)
 */
export function getChargeAuditInfo(lastChargedAt, masukAt) {
  const refTimestamp = Number(lastChargedAt) || Number(masukAt) || Date.now();
  const diffMs = Math.max(0, Date.now() - refTimestamp);
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysAgo < 7) {
    return {
      daysAgo,
      tier: 'AMAN',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: daysAgo === 0 ? 'Di-charge hari ini' : `${daysAgo} hari lalu`,
      alertMessage: null,
      isCritical: false
    };
  }

  if (daysAgo <= 14) {
    return {
      daysAgo,
      tier: 'PERHATIAN',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      label: `${daysAgo} hari lalu`,
      alertMessage: `Sudah ${daysAgo} hari belum di-charge. Disarankan jadwal charger minggu ini.`,
      isCritical: false
    };
  }

  // > 14 Hari (Kritis, risiko sel baterai drop/rusak total)
  return {
    daysAgo,
    tier: 'KRITIS',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-extrabold',
    label: `⚠️ ${daysAgo} hari lalu!`,
    alertMessage: `⚠️ Terakhir di-charge ${daysAgo} hari yang lalu! Segera periksa kondisi baterai / jadwalkan charger perawatan.`,
    isCritical: true
  };
}

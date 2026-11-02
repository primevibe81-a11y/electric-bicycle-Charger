export const DEFAULT_CHARGE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Jam Standar (10.800.000 ms)
export const DEFAULT_SLOTS_CAPACITY = 2; // Default 2 slot charger aktif (bisa ditambah/dikurangi)
export const MIN_SLOTS_CAPACITY = 1;
export const MAX_SLOTS_CAPACITY = 10;

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
 * Validasi kode gadai: Mendukung format alfanumerik / kode akad (contoh: 26_0037861)
 */
export function isValidKodeGadai(code) {
  return typeof code === 'string' && /^[A-Za-z0-9_-]+$/.test(code.trim());
}

/**
 * Hitung hari sejak terakhir di-charge
 */
export function getDaysSinceLastCharge(lastChargedAt, fallbackTimestamp) {
  const ref = Number(lastChargedAt) || Number(fallbackTimestamp) || Date.now();
  const diff = Math.max(0, Date.now() - ref);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Prioritas Antrian Otomatis:
 * 1. Unit yang sudah >= 15 hari belum di-charge SELALU di atas (#1).
 * 2. Di antara yang >= 15 hari, yang terlama hari (paling darurat) paling atas.
 * 3. Persentase baterai paling rendah.
 * 4. Waktu masuk antrian lebih awal.
 */
export function sortWaitingQueue(waitingUnits) {
  return [...waitingUnits].sort((a, b) => {
    const daysA = getDaysSinceLastCharge(a.lastChargedAt, a.jatuhTempoAt ? a.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    const daysB = getDaysSinceLastCharge(b.lastChargedAt, b.jatuhTempoAt ? b.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);

    const isOverdueA = daysA >= 15;
    const isOverdueB = daysB >= 15;

    // Prioritas 1: Kritis >= 15 hari di paling atas
    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;

    // Jika sama-sama >= 15 hari: yang harinya lebih banyak (terlama belum charge) di atas
    if (isOverdueA && isOverdueB) {
      if (daysA !== daysB) {
        return daysB - daysA; // Descending hari: 30 hari di atas 15 hari
      }
    }

    // Prioritas 2: Baterai paling rendah
    const batA = Number(a.batteryLevel ?? 100);
    const batB = Number(b.batteryLevel ?? 100);
    if (batA !== batB) {
      return batA - batB; // Ascending: baterai 10% di atas 50%
    }

    // Prioritas 3: Hari terlama belum charge (untuk yang < 15 hari)
    if (daysA !== daysB) {
      return daysB - daysA;
    }

    // Tie-breaker: waktu antrian
    return (a.queuedAt || 0) - (b.queuedAt || 0);
  });
}

/**
 * Validasi antrian: Tidak ada batasan jumlah antrian (Unlimited Queue)
 */
export function canEnqueueUnit() {
  return true;
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
 * Analisis Audit Waktu Terakhir Di-Charge (Smart Alert >= 15 Hari)
 */
export function getChargeAuditInfo(lastChargedAt, masukAt) {
  const daysAgo = getDaysSinceLastCharge(lastChargedAt, masukAt);

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

  if (daysAgo < 15) {
    return {
      daysAgo,
      tier: 'PERHATIAN',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      label: `${daysAgo} hari lalu`,
      alertMessage: `Sudah ${daysAgo} hari belum di-charge. Disarankan jadwal charger minggu ini.`,
      isCritical: false
    };
  }

  // >= 15 Hari (Kritis: Risiko BMS drop & baterai mati total)
  return {
    daysAgo,
    tier: 'KRITIS',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-extrabold',
    label: `⚠️ ${daysAgo} hari lalu!`,
    alertMessage: `⚠️ Terakhir di-charge ${daysAgo} hari yang lalu! Segera periksa kondisi baterai / jadwalkan charger perawatan.`,
    isCritical: true
  };
}

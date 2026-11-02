export const MAX_QUEUE_LIMIT = 2;
export const CHARGE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Jam (10.800.000 ms)

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
 * Menghitung sisa waktu charger dari timestamp chargeEndAt
 */
export function getRemainingChargeTime(chargeEndAt) {
  if (!chargeEndAt) {
    return {
      remainingMs: 0,
      isFinished: true,
      formatted: "00:00:00",
      progressPercent: 0
    };
  }

  const remainingMs = Math.max(0, Number(chargeEndAt) - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((CHARGE_DURATION_MS - remainingMs) / CHARGE_DURATION_MS) * 100))
  );

  return {
    remainingMs,
    isFinished: remainingMs === 0,
    formatted: `${hours}:${minutes}:${seconds}`,
    progressPercent
  };
}

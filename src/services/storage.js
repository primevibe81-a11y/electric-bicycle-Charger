import { CHARGE_DURATION_MS, MAX_QUEUE_LIMIT, sortWaitingQueue } from "./chargerQueue";
import { playChimeSound, playGentleBeep, sendNativeNotification } from "./soundNotification";

const STORAGE_KEY = "ebike_gadai_units_v1";
const BROADCAST_CHANNEL_NAME = "ebike_gadai_sync_channel";

// Broadcast Channel untuk sinkronisasi antar-tab iPhone / Safari
const channel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  : null;

/**
 * Data awal (Seed Data) lengkap untuk langsung mendemonstrasikan seluruh fitur:
 * 1 unit CHARGING (dengan timer aktif berjalan)
 * 2 unit WAITING (dengan baterai 12% dan 35% untuk mendemonstrasikan auto-sort)
 * Beberapa unit AKTIF dan LELANG
 */
export const SEED_UNITS = [
  {
    id: "unit-101",
    kodeGadai: "202611001",
    riwayatKodeGadai: [],
    merkSepeda: "U-Winfly D7S",
    namaNasabah: "Budi Santoso",
    batteryLevel: 25,
    statusBarang: "AKTIF", // 'AKTIF' | 'DITEBUS' | 'LELANG' | 'TERJUAL_LELANG'
    statusCharger: "CHARGING", // 'IDLE' | 'WAITING' | 'CHARGING'
    chargeStartAt: Date.now() - 42 * 60 * 1000, // Dimulai 42 menit lalu
    chargeEndAt: Date.now() + (3 * 60 - 42) * 60 * 1000, // Sisa ~2 jam 18 menit
    queuedAt: null,
    lastChargedAt: null,
    jatuhTempoAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    hargaLelang: 0,
    updatedAt: Date.now(),
  },
  {
    id: "unit-102",
    kodeGadai: "202611002",
    riwayatKodeGadai: ["202610889"],
    merkSepeda: "Exotic Cooltech 2.0",
    namaNasabah: "Siti Rahma",
    batteryLevel: 12, // Baterai sangat rendah -> Harus jadi Urutan #1
    statusBarang: "AKTIF",
    statusCharger: "WAITING",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: Date.now() - 15 * 60 * 1000,
    lastChargedAt: null,
    jatuhTempoAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    hargaLelang: 0,
    updatedAt: Date.now(),
  },
  {
    id: "unit-103",
    kodeGadai: "202611003",
    riwayatKodeGadai: [],
    merkSepeda: "Godwin G5 New",
    namaNasabah: "Ahmad Fauzi",
    batteryLevel: 38, // Baterai 38% -> Berada di Urutan #2
    statusBarang: "AKTIF",
    statusCharger: "WAITING",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: Date.now() - 30 * 60 * 1000,
    lastChargedAt: null,
    jatuhTempoAt: Date.now() + 21 * 24 * 60 * 60 * 1000,
    hargaLelang: 0,
    updatedAt: Date.now(),
  },
  {
    id: "unit-104",
    kodeGadai: "202611004",
    riwayatKodeGadai: [],
    merkSepeda: "Selis Butterfly Trike",
    namaNasabah: "Hendra Wijaya",
    batteryLevel: 65,
    statusBarang: "AKTIF",
    statusCharger: "IDLE",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    jatuhTempoAt: Date.now() + 18 * 24 * 60 * 60 * 1000,
    hargaLelang: 0,
    updatedAt: Date.now(),
  },
  {
    id: "unit-105",
    kodeGadai: "202611005",
    riwayatKodeGadai: [],
    merkSepeda: "Pacific Nuri",
    namaNasabah: "Dewi Lestari",
    batteryLevel: 15,
    statusBarang: "LELANG", // Masuk lelang karena lewat jatuh tempo
    statusCharger: "IDLE",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: null,
    jatuhTempoAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    hargaLelang: 2850000,
    updatedAt: Date.now(),
  },
  {
    id: "unit-106",
    kodeGadai: "202611006",
    riwayatKodeGadai: ["202609012"],
    merkSepeda: "Viar Uno 2",
    namaNasabah: "Agus Pratama",
    batteryLevel: 100,
    statusBarang: "DITEBUS",
    statusCharger: "IDLE",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    jatuhTempoAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    hargaLelang: 0,
    redeemedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  }
];

export function getStoredUnits() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
    return SEED_UNITS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
      return SEED_UNITS;
    }
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
    return SEED_UNITS;
  }
}

export function saveStoredUnits(units, notifyBroadcast = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  if (notifyBroadcast && channel) {
    channel.postMessage({ type: "UNITS_UPDATED", timestamp: Date.now() });
  }
}

export function subscribeToStoreUpdates(callback) {
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredUnits());
    }
  };
  const handleMessage = (e) => {
    if (e.data?.type === "UNITS_UPDATED") {
      callback(getStoredUnits());
    }
  };

  window.addEventListener("storage", handleStorage);
  if (channel) {
    channel.addEventListener("message", handleMessage);
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (channel) {
      channel.removeEventListener("message", handleMessage);
    }
  };
}

/**
 * Operasi Data Terpusat
 */

// 1. Tambah unit gadai baru
export function createGadaiUnit(data) {
  const units = getStoredUnits();
  
  // Validasi unik nomor gadai
  const cleanKode = String(data.kodeGadai).trim();
  const existing = units.find(u => u.kodeGadai === cleanKode && u.statusBarang !== 'DITEBUS' && u.statusBarang !== 'TERJUAL_LELANG');
  if (existing) {
    return { success: false, message: `Kode Gadai ${cleanKode} sudah terdaftar pada unit aktif lain!` };
  }

  const newUnit = {
    id: "unit-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    kodeGadai: cleanKode,
    riwayatKodeGadai: [],
    merkSepeda: data.merkSepeda.trim(),
    namaNasabah: data.namaNasabah.trim(),
    batteryLevel: Math.max(0, Math.min(100, Number(data.batteryLevel) || 0)),
    statusBarang: "AKTIF",
    statusCharger: "IDLE",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: null,
    jatuhTempoAt: Number(data.jatuhTempoAt) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
    hargaLelang: 0,
    updatedAt: Date.now(),
  };

  const updated = [newUnit, ...units];
  saveStoredUnits(updated);
  return { success: true, unit: newUnit };
}

// 2. Masukkan unit ke Antrian Charger (Maksimal 2 unit)
export function enqueueUnitForCharging(unitId, batteryLevel) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  if (unit.statusCharger === 'CHARGING') {
    return { success: false, message: "Unit ini sedang dalam pengisian daya." };
  }
  if (unit.statusCharger === 'WAITING') {
    return { success: false, message: "Unit ini sudah ada di dalam antrian." };
  }

  const currentWaiting = units.filter(u => u.statusCharger === 'WAITING');
  if (currentWaiting.length >= MAX_QUEUE_LIMIT) {
    return {
      success: false,
      message: `Antrian penuh (Maksimal ${MAX_QUEUE_LIMIT} unit). Tunggu salah satu unit selesai di-charge.`
    };
  }

  // Update unit status to WAITING
  const updatedUnits = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'WAITING',
        batteryLevel: batteryLevel !== undefined ? Math.max(0, Math.min(100, Number(batteryLevel))) : u.batteryLevel,
        queuedAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    return u;
  });

  saveStoredUnits(updatedUnits);
  playGentleBeep();
  return { success: true, message: `Unit ${unit.kodeGadai} berhasil masuk antrian tunggu.` };
}

// 3. Batalkan antrian unit
export function cancelWaitingQueue(unitId) {
  const units = getStoredUnits();
  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'IDLE',
        queuedAt: null,
        updatedAt: Date.now()
      };
    }
    return u;
  });
  saveStoredUnits(updated);
  return { success: true };
}

// 4. Mulai pengisian daya untuk sebuah unit (Slot tunggal)
export function startChargingUnit(unitId) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const currentCharging = units.find(u => u.statusCharger === 'CHARGING');
  if (currentCharging && currentCharging.id !== unitId) {
    return {
      success: false,
      message: `Charger sedang dipakai oleh unit ${currentCharging.kodeGadai}. Selesaikan sesi sebelumnya terlebih dahulu.`
    };
  }

  const now = Date.now();
  const chargeEndAt = now + CHARGE_DURATION_MS;

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: chargeEndAt,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated);
  playGentleBeep();
  return { success: true, message: `Pengisian daya 3 jam untuk unit ${unit.kodeGadai} dimulai!` };
}

// 5. Selesai / Cabut Charger & Otomatis naikkan Antrian #1
export function finishChargingUnit(unitId) {
  const units = getStoredUnits();
  const finishedUnit = units.find(u => u.id === unitId);
  if (!finishedUnit) return { success: false, message: "Unit tidak ditemukan." };

  // Dapatkan unit berikutnya dari antrian tunggu terurut (baterai terendah di #1)
  const waitingUnits = sortWaitingQueue(units.filter(u => u.statusCharger === 'WAITING' && u.id !== unitId));
  const nextUnitToCharge = waitingUnits.length > 0 ? waitingUnits[0] : null;

  const now = Date.now();
  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'IDLE',
        batteryLevel: 100, // Pengisian daya 3 jam penuh -> 100%
        chargeStartAt: null,
        chargeEndAt: null,
        lastChargedAt: now,
        updatedAt: now
      };
    }
    // Jika ada antrian #1, naikkan langsung ke CHARGING
    if (nextUnitToCharge && u.id === nextUnitToCharge.id) {
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: now + CHARGE_DURATION_MS,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated);
  playChimeSound();

  sendNativeNotification("⚡ Pengisian Selesai!", {
    body: `Sepeda Listrik No. ${finishedUnit.kodeGadai} telah selesai di-charge 100%!`
  });

  if (nextUnitToCharge) {
    return {
      success: true,
      message: `Unit ${finishedUnit.kodeGadai} selesai (Baterai 100%). Unit antrian ${nextUnitToCharge.kodeGadai} (Baterai ${nextUnitToCharge.batteryLevel}%) otomatis naik ke slot charger!`,
      promotedUnit: nextUnitToCharge
    };
  }

  return {
    success: true,
    message: `Unit ${finishedUnit.kodeGadai} selesai di-charge (Baterai 100%). Slot charger kini kosong.`
  };
}

// 6. Perpanjang Gadai (Mutasi Kode Gadai Baru & Sinkronisasi Real-Time)
export function extendGadaiUnit(unitId, newKodeGadai, newJatuhTempoAt) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const cleanNewCode = String(newKodeGadai).trim();

  // Validasi kode baru harus deretan angka
  if (!/^\d+$/.test(cleanNewCode)) {
    return { success: false, message: "Nomor gadai baru wajib berupa deretan angka unik (contoh: 2026110999)." };
  }

  // Cek apakah kode baru sudah dipakai di unit aktif lain
  const conflict = units.find(u => u.kodeGadai === cleanNewCode && u.id !== unitId && u.statusBarang !== 'DITEBUS' && u.statusBarang !== 'TERJUAL_LELANG');
  if (conflict) {
    return { success: false, message: `Nomor gadai ${cleanNewCode} sudah terdaftar pada unit lain!` };
  }

  const oldCode = unit.kodeGadai;
  const oldHistory = Array.isArray(unit.riwayatKodeGadai) ? unit.riwayatKodeGadai : [];

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        kodeGadai: cleanNewCode,
        riwayatKodeGadai: [oldCode, ...oldHistory],
        jatuhTempoAt: Number(newJatuhTempoAt) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
        statusBarang: 'AKTIF',
        updatedAt: Date.now()
        // PENTING: Jika sedang CHARGING atau WAITING, sisa timer dan posisi antrian tetap utuh!
      };
    }
    return u;
  });

  saveStoredUnits(updated);
  playGentleBeep();

  let queueNote = "";
  if (unit.statusCharger === 'CHARGING') {
    queueNote = " (Nomor pada kartu Charger Aktif langsung ter-update secara real-time)";
  } else if (unit.statusCharger === 'WAITING') {
    queueNote = " (Nomor pada kartu Antrian Tunggu langsung ter-update secara real-time)";
  }

  return {
    success: true,
    message: `Berhasil perpanjang! Kode ${oldCode} diperbarui menjadi ${cleanNewCode}.${queueNote}`
  };
}

// 7. Tebus Unit (Otomatis cabut dari charger/antrian)
export function redeemGadaiUnit(unitId, notes = "") {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const wasCharging = unit.statusCharger === 'CHARGING';
  const waitingUnits = sortWaitingQueue(units.filter(u => u.statusCharger === 'WAITING' && u.id !== unitId));
  const nextUnitToCharge = wasCharging && waitingUnits.length > 0 ? waitingUnits[0] : null;

  const now = Date.now();
  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusBarang: 'DITEBUS',
        statusCharger: 'IDLE',
        chargeStartAt: null,
        chargeEndAt: null,
        queuedAt: null,
        redeemedAt: now,
        notes: notes || "Ditebus lunas oleh nasabah",
        updatedAt: now
      };
    }
    // Jika unit yang ditebus tadi sedang di-charge, naikkan antrian #1 otomatis
    if (nextUnitToCharge && u.id === nextUnitToCharge.id) {
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: now + CHARGE_DURATION_MS,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated);
  playGentleBeep();

  let extraMsg = "";
  if (wasCharging) {
    if (nextUnitToCharge) {
      extraMsg = ` Unit dikeluarkan dari slot charger. Antrian ${nextUnitToCharge.kodeGadai} otomatis dinaikkan ke slot charger!`;
    } else {
      extraMsg = " Unit dikeluarkan dari slot charger (slot charger kini kosong).";
    }
  }

  return {
    success: true,
    message: `Unit ${unit.kodeGadai} berhasil ditebus & status diperbarui menjadi DITEBUS.${extraMsg}`
  };
}

// 8. Pindahkan unit ke status LELANG
export function moveToLelang(unitId, estimatedPrice = 0) {
  const units = getStoredUnits();
  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusBarang: 'LELANG',
        hargaLelang: Number(estimatedPrice) || 2500000,
        updatedAt: Date.now()
      };
    }
    return u;
  });
  saveStoredUnits(updated);
  return { success: true, message: "Unit berhasil dipindahkan ke daftar Lelang." };
}

// 9. Laku Lelang / Terjual Lelang
export function markLelangSold(unitId, soldPrice, buyerInfo) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const wasCharging = unit.statusCharger === 'CHARGING';
  const waitingUnits = sortWaitingQueue(units.filter(u => u.statusCharger === 'WAITING' && u.id !== unitId));
  const nextUnitToCharge = wasCharging && waitingUnits.length > 0 ? waitingUnits[0] : null;

  const now = Date.now();
  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusBarang: 'TERJUAL_LELANG',
        statusCharger: 'IDLE',
        chargeStartAt: null,
        chargeEndAt: null,
        queuedAt: null,
        soldPrice: Number(soldPrice) || unit.hargaLelang || 0,
        buyerInfo: buyerInfo || "Pembeli lelang",
        soldAt: now,
        updatedAt: now
      };
    }
    if (nextUnitToCharge && u.id === nextUnitToCharge.id) {
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: now + CHARGE_DURATION_MS,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated);
  playGentleBeep();
  return { success: true, message: `Unit lelang ${unit.kodeGadai} tercatat TERJUAL!` };
}

// 10. Reset data ke Seed Data (bantuan debugging & demo)
export function resetToSeedData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
  if (channel) {
    channel.postMessage({ type: "UNITS_UPDATED", timestamp: Date.now() });
  }
}

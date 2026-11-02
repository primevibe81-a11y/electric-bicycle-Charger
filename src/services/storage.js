import { CHARGE_DURATION_MS, MAX_QUEUE_LIMIT, sortWaitingQueue } from "./chargerQueue";
import { playChimeSound, playGentleBeep, sendNativeNotification } from "./soundNotification";
import { supabase, isSupabaseConfigured } from "./supabase";
import { REAL_EXCEL_UNITS } from "../data/realUnits";

const STORAGE_KEY = "ebike_gadai_units_real_v2";
const BROADCAST_CHANNEL_NAME = "ebike_gadai_sync_channel";

// Helper konversi CamelCase <-> Snake_Case untuk skema Supabase
export function modelToDb(unit) {
  return {
    id: unit.id,
    kode_gadai: unit.kodeGadai,
    riwayat_kode_gadai: unit.riwayatKodeGadai || [],
    merk_sepeda: unit.merkSepeda,
    nama_nasabah: unit.namaNasabah,
    battery_level: Number(unit.batteryLevel) || 100,
    status_barang: unit.statusBarang || 'AKTIF',
    status_charger: unit.statusCharger || 'IDLE',
    charge_start_at: unit.chargeStartAt || null,
    charge_end_at: unit.chargeEndAt || null,
    queued_at: unit.queuedAt || null,
    last_charged_at: unit.lastChargedAt || null,
    jatuh_tempo_at: unit.jatuhTempoAt || null,
    harga_lelang: unit.hargaLelang || 0,
    updated_at: unit.updatedAt || Date.now()
  };
}

export function dbToModel(row) {
  return {
    id: row.id,
    kodeGadai: row.kode_gadai,
    riwayatKodeGadai: Array.isArray(row.riwayat_kode_gadai) ? row.riwayat_kode_gadai : [],
    merkSepeda: row.merk_sepeda,
    namaNasabah: row.nama_nasabah,
    batteryLevel: Number(row.battery_level) ?? 100,
    statusBarang: row.status_barang,
    statusCharger: row.status_charger,
    chargeStartAt: row.charge_start_at ? Number(row.charge_start_at) : null,
    chargeEndAt: row.charge_end_at ? Number(row.charge_end_at) : null,
    queuedAt: row.queued_at ? Number(row.queued_at) : null,
    lastChargedAt: row.last_charged_at ? Number(row.last_charged_at) : null,
    jatuhTempoAt: row.jatuh_tempo_at ? Number(row.jatuh_tempo_at) : null,
    hargaLelang: Number(row.harga_lelang) || 0,
    updatedAt: Number(row.updated_at) || Date.now()
  };
}

// Broadcast Channel untuk sinkronisasi antar-tab iPhone / Safari
const channel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  : null;

/**
 * Data awal: 100% Data Real dari file Excel Transaksi (65 unit, baterai 100%)
 */
export const SEED_UNITS = REAL_EXCEL_UNITS;

export function getStoredUnits() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
    return SEED_UNITS;
  }
  try {
    const parsed = JSON.parse(raw);
    // Jika data lama masih mengandung dummy unit-101, perbarui langsung ke data real
    const hasDummy = Array.isArray(parsed) && parsed.some(u => u.id === 'unit-101' || u.kodeGadai === '202611001');
    if (!Array.isArray(parsed) || parsed.length === 0 || hasDummy) {
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

  // Sinkronisasi otomatis ke Supabase jika environment variable diisi
  if (isSupabaseConfigured && supabase) {
    const dbPayload = units.map(modelToDb);
    supabase.from('gadai_units').upsert(dbPayload).then(({ error }) => {
      if (error) console.warn("Supabase upsert warning:", error);
    });
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

  // Sinkronisasi Realtime Supabase WebSockets jika Vercel Env diisi
  let supabaseChannel = null;
  if (isSupabaseConfigured && supabase) {
    supabase.from('gadai_units').select('*').then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(dbToModel);
        saveStoredUnits(mapped, false);
        callback(mapped);
      }
    });

    supabaseChannel = supabase
      .channel('public:gadai_units')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gadai_units' }, () => {
        supabase.from('gadai_units').select('*').then(({ data }) => {
          if (data && Array.isArray(data)) {
            const mapped = data.map(dbToModel);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            callback(mapped);
          }
        });
      })
      .subscribe();
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (channel) {
      channel.removeEventListener("message", handleMessage);
    }
    if (supabaseChannel) {
      supabase.removeChannel(supabaseChannel);
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

  // Validasi kode baru (angka atau kode akad unik misal 26_0037861)
  if (!/^[A-Za-z0-9_-]+$/.test(cleanNewCode)) {
    return { success: false, message: "Nomor gadai baru wajib berupa karakter alfanumerik / kode akad (contoh: 26_0037861)." };
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

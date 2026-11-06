import {
  DEFAULT_CHARGE_DURATION_MS,
  DEFAULT_SLOTS_CAPACITY,
  MIN_SLOTS_CAPACITY,
  MAX_SLOTS_CAPACITY,
  sortWaitingQueue,
  getDaysSinceLastCharge,
  BATTERY_CONDITIONS,
  BATTERY_CONDITIONS_LIST,
  getBatteryConditionLabel
} from "./chargerQueue";

// Re-export untuk kompatibilitas impor menyeluruh
export { BATTERY_CONDITIONS, BATTERY_CONDITIONS_LIST, getBatteryConditionLabel };
import { playChimeSound, playGentleBeep, sendNativeNotification } from "./soundNotification";
import { supabase, isSupabaseConfigured } from "./supabase";
import { REAL_EXCEL_UNITS } from "../data/realUnits";
import {
  enqueueMutation,
  removePendingMutations,
  getPendingMutations,
  drainOutboxQueue,
  setLastSyncTime
} from "./offlineQueue";

const STORAGE_KEY = "ebike_gadai_units_real_v4";
const SLOTS_CAPACITY_KEY = "ebike_charger_slots_capacity";
const BROADCAST_CHANNEL_NAME = "ebike_gadai_sync_channel";

/**
 * Pengaturan Kapasitas Slot Charger Dinamis (Bisa ditambah/dikurangi sesuai colokan)
 */
export function getChargerSlotsCapacity() {
  const raw = localStorage.getItem(SLOTS_CAPACITY_KEY);
  if (!raw) return DEFAULT_SLOTS_CAPACITY;
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < MIN_SLOTS_CAPACITY) return DEFAULT_SLOTS_CAPACITY;
  return Math.min(MAX_SLOTS_CAPACITY, Math.max(MIN_SLOTS_CAPACITY, num));
}

export function setChargerSlotsCapacity(count) {
  const valid = Math.min(MAX_SLOTS_CAPACITY, Math.max(MIN_SLOTS_CAPACITY, Number(count) || DEFAULT_SLOTS_CAPACITY));
  localStorage.setItem(SLOTS_CAPACITY_KEY, String(valid));
  if (channel) {
    channel.postMessage({ type: "SLOTS_CAPACITY_CHANGED", capacity: valid });
  }
  return valid;
}

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
    charge_duration_ms: unit.chargeDurationMs || DEFAULT_CHARGE_DURATION_MS,
    kondisi_baterai: unit.kondisiBaterai || 'PRIMA',
    catatan_baterai: unit.catatanBaterai || '',
    lokasi: unit.lokasi || null,
    lokasi_updated_at: unit.lokasiUpdatedAt || null,
    lokasi_updated_by: unit.lokasiUpdatedBy || null,
    riwayat_lokasi: Array.isArray(unit.riwayatLokasi) ? unit.riwayatLokasi : [],
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
    chargeDurationMs: row.charge_duration_ms ? Number(row.charge_duration_ms) : DEFAULT_CHARGE_DURATION_MS,
    kondisiBaterai: row.kondisi_baterai || 'PRIMA',
    catatanBaterai: row.catatan_baterai || '',
    lokasi: row.lokasi || '',
    lokasiUpdatedAt: row.lokasi_updated_at ? Number(row.lokasi_updated_at) : null,
    lokasiUpdatedBy: row.lokasi_updated_by || '',
    riwayatLokasi: Array.isArray(row.riwayat_lokasi) ? row.riwayat_lokasi : [],
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

    // Sanitasi: Pisahkan catatan mutasi dari catatan baterai jika data sebelumnya tercampur
    let needsResave = false;
    const sanitized = parsed.map(u => {
      const batNote = String(u.catatanBaterai || '').trim();
      const isMutationInBattery = /perpanjangan\s+(otomatis|dari)|diperpanjang\s+dari\s+#/i.test(batNote);
      if (isMutationInBattery) {
        needsResave = true;
        return {
          ...u,
          catatanMutasi: u.catatanMutasi || batNote,
          catatanBaterai: ''
        };
      }
      return u;
    });

    if (needsResave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (e) {}
    }

    return sanitized;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_UNITS));
    return SEED_UNITS;
  }
}

/**
 * Helper deteksi apakah unit benar-benar memiliki kerusakan fisik atau aki drop nyata
 * (bukan catatan mutasi perpanjangan atau kata "otomatis")
 */
export function isRealBatteryOrPhysicalDefect(unit) {
  if (!unit) return false;
  if (unit.isRusak === true) return true;
  if (unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA') return true;
  const note = String(unit.catatanBaterai || '').toLowerCase();
  if (!note || /perpanjang|mutasi|otomatis/i.test(note)) return false;
  return /\b(rusak|drop|mati total|bocor|kendur|patah|cacat|sobek|terkelupas)\b/i.test(note);
}

/**
 * Rekonsiliasi Last-Write-Wins (LWW) Berbasis updatedAt:
 * Menjamin mutasi lokal yang dibuat di gudang saat offline TIDAK tertimpa oleh remote Supabase
 */
export function reconcileUnits(localUnits, remoteUnits) {
  if (!Array.isArray(localUnits)) return remoteUnits || [];
  if (!Array.isArray(remoteUnits)) return localUnits || [];

  const pendingTickets = getPendingMutations();
  const pendingUnitIds = new Set(
    pendingTickets.map(m => m.unitId).filter(Boolean)
  );

  const localMap = new Map();
  localUnits.forEach(u => localMap.set(u.id, u));

  const merged = [];
  const processedLocalIds = new Set();

  remoteUnits.forEach(remote => {
    const local = localMap.get(remote.id);
    if (!local) {
      merged.push(remote);
      return;
    }

    processedLocalIds.add(local.id);

    // Jika unit ini memiliki tiket mutasi yang belum terkirim di Outbox,
    // MAKA data lokal MUTLAK dipertahankan (jangan biarkan remote menimpa!)
    if (pendingUnitIds.has(local.id)) {
      merged.push(local);
      return;
    }

    // Bandingkan timestamp updatedAt
    const localTime = Number(local.updatedAt) || 0;
    const remoteTime = Number(remote.updatedAt) || 0;

    if (localTime >= remoteTime) {
      merged.push(local);
    } else {
      merged.push(remote);
    }
  });

  // Tambahkan unit lokal yang baru dibuat saat offline yang belum ada di remote
  localUnits.forEach(local => {
    if (!processedLocalIds.has(local.id)) {
      merged.push(local);
    }
  });

  return merged;
}

export function saveStoredUnits(units, notifyBroadcast = true, mutationMeta = null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  if (notifyBroadcast && channel) {
    channel.postMessage({ type: "UNITS_UPDATED", timestamp: Date.now() });
  }

  // Catat tiket mutasi ke Outbox Queue untuk perlindungan offline
  let ticket = null;
  if (mutationMeta) {
    ticket = enqueueMutation(
      mutationMeta.action,
      mutationMeta.unitId || null,
      mutationMeta.payload || units
    );
  }

  // Sinkronisasi otomatis ke Supabase jika environment variable diisi
  if (isSupabaseConfigured && supabase) {
    const dbPayload = units.map(modelToDb);
    supabase.from('gadai_units').upsert(dbPayload).then(({ error }) => {
      if (error) {
        // Jika kolom baru belum ada di Supabase, fallback aman dengan menghapus kolom baru sementara
        if (error.code === '42703' || String(error.message).includes('column')) {
          const stripped = dbPayload.map(({ charge_duration_ms, kondisi_baterai, catatan_baterai, lokasi, lokasi_updated_at, lokasi_updated_by, riwayat_lokasi, ...rest }) => rest);
          supabase.from('gadai_units').upsert(stripped).then(({ error: retryErr }) => {
            if (!retryErr) {
              setLastSyncTime();
              if (ticket) removePendingMutations([ticket.id]);
            }
          });
        } else {
          console.warn("Supabase upsert warning (data tetap aman di lokal & outbox):", error);
        }
      } else {
        // Upsert cloud berhasil
        setLastSyncTime();
        if (ticket) {
          removePendingMutations([ticket.id]);
        }
      }
    }).catch(networkErr => {
      console.warn("Koneksi offline saat upsert, tiket mutasi tersimpan di outbox:", networkErr);
    });
  }
}

/**
 * Sinkronisasi Manual saat pengguna mengetuk tombol "Sinkronkan Sekarang"
 */
export async function triggerManualSync() {
  if (isSupabaseConfigured && supabase) {
    const drainResult = await drainOutboxQueue(supabase, modelToDb);

    try {
      const { data, error } = await supabase.from('gadai_units').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(dbToModel);
        const currentLocal = getStoredUnits();
        const reconciled = reconcileUnits(currentLocal, mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
        if (channel) {
          channel.postMessage({ type: "UNITS_UPDATED", timestamp: Date.now() });
        }
        return { success: true, count: reconciled.length, drained: drainResult.drained };
      }
    } catch (e) {
      console.warn("Manual sync fetch warning:", e);
    }
    return drainResult;
  }
  return { success: false, message: "Supabase belum terkonfigurasi." };
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
        const currentLocal = getStoredUnits();
        const reconciled = reconcileUnits(currentLocal, mapped);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
        callback(reconciled);
      }
    }).catch(err => {
      console.warn("Initial supabase fetch offline fallback:", err);
    });

    supabaseChannel = supabase
      .channel('public:gadai_units')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gadai_units' }, () => {
        supabase.from('gadai_units').select('*').then(({ data }) => {
          if (data && Array.isArray(data)) {
            const mapped = data.map(dbToModel);
            const currentLocal = getStoredUnits();
            const reconciled = reconcileUnits(currentLocal, mapped);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
            callback(reconciled);
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

  const cleanLokasi = data.lokasi ? String(data.lokasi).trim().replace(/\s+/g, ' ').slice(0, 60) : '';

  const newUnit = {
    id: "unit-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    kodeGadai: cleanKode,
    riwayatKodeGadai: [],
    merkSepeda: data.merkSepeda.trim(),
    namaNasabah: data.namaNasabah.trim(),
    batteryLevel: Math.max(0, Math.min(100, Number(data.batteryLevel) || 100)),
    kondisiBaterai: data.kondisiBaterai || 'PRIMA',
    catatanBaterai: data.catatanBaterai || '',
    lokasi: cleanLokasi,
    lokasiUpdatedAt: cleanLokasi ? Date.now() : null,
    lokasiUpdatedBy: cleanLokasi ? (data.petugas || 'Admin') : '',
    riwayatLokasi: cleanLokasi ? [{
      lokasiLama: '',
      lokasiBaru: cleanLokasi,
      timestamp: Date.now(),
      petugas: data.petugas || 'Admin'
    }] : [],
    chargeDurationMs: DEFAULT_CHARGE_DURATION_MS,
    statusBarang: "AKTIF",
    statusCharger: "IDLE",
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: Date.now(),
    jatuhTempoAt: Number(data.jatuhTempoAt) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
    hargaLelang: 0,
    updatedAt: Date.now(),
  };

  const updated = [newUnit, ...units];
  saveStoredUnits(updated, true, { action: 'CREATE_UNIT', unitId: newUnit.id, payload: newUnit });
  return { success: true, unit: newUnit };
}

// 2. Masukkan unit ke Antrian Charger (Tanpa batasan jumlah / Unlimited Queue)
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

  // Update unit status to WAITING (antrian tidak dibatasi)
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

  saveStoredUnits(updatedUnits, true, { action: 'ENQUEUE_CHARGE', unitId, payload: { unitId, batteryLevel } });
  playGentleBeep();
  return { success: true, message: `Unit #${unit.kodeGadai} berhasil masuk antrian prioritas.` };
}

// 2b. Otomatis Masukkan Seluruh Unit >= 15 Hari Belum Di-charge ke Antrian
export function autoEnqueueOverdueUnits() {
  const units = getStoredUnits();
  let newlyEnqueued = 0;

  const updated = units.map(u => {
    if ((u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG') && u.statusCharger === 'IDLE') {
      const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
      if (days >= 15) {
        newlyEnqueued++;
        return {
          ...u,
          statusCharger: 'WAITING',
          queuedAt: u.queuedAt || Date.now(),
          updatedAt: Date.now()
        };
      }
    }
    return u;
  });

  if (newlyEnqueued > 0) {
    saveStoredUnits(updated, true, { action: 'AUTO_ENQUEUE_OVERDUE', payload: updated });
  }

  return { newlyEnqueued, units: newlyEnqueued > 0 ? updated : units };
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
  saveStoredUnits(updated, true, { action: 'CANCEL_QUEUE', unitId });
  return { success: true };
}

// 4. Mulai pengisian daya untuk sebuah unit (Slot Dinamis: Multi-slot charger)
export function startChargingUnit(unitId, durationMs = DEFAULT_CHARGE_DURATION_MS) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const capacity = getChargerSlotsCapacity();
  const currentChargingUnits = units.filter(u => u.statusCharger === 'CHARGING');
  
  if (currentChargingUnits.length >= capacity && !currentChargingUnits.some(u => u.id === unitId)) {
    return {
      success: false,
      message: `Seluruh ${capacity} slot charger sedang terisi. Selesaikan salah satu unit atau tambah jumlah slot charger.`
    };
  }

  const duration = Number(durationMs) || DEFAULT_CHARGE_DURATION_MS;
  const now = Date.now();
  const chargeEndAt = now + duration;
  const hours = Math.round((duration / (1000 * 60 * 60)) * 10) / 10;

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: chargeEndAt,
        chargeDurationMs: duration,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, { action: 'START_CHARGING', unitId, payload: { unitId, durationMs: duration } });
  playGentleBeep();
  return { success: true, message: `Unit #${unit.kodeGadai} mulai di-charge (Durasi: ${hours} jam)!` };
}

// 5. Selesai / Cabut Charger & Otomatis naikkan Antrian #1
export function finishChargingUnit(unitId) {
  const units = getStoredUnits();
  const finishedUnit = units.find(u => u.id === unitId);
  if (!finishedUnit) return { success: false, message: "Unit tidak ditemukan." };

  // Dapatkan antrian tunggu terurut (Prioritas >= 15 hari di paling atas)
  const waitingUnits = sortWaitingQueue(units.filter(u => u.statusCharger === 'WAITING' && u.id !== unitId));
  const nextUnitToCharge = waitingUnits.length > 0 ? waitingUnits[0] : null;

  const now = Date.now();
  const defaultDuration = DEFAULT_CHARGE_DURATION_MS;

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: 'IDLE',
        batteryLevel: 100, // Pengisian daya selesai penuh -> 100%
        chargeStartAt: null,
        chargeEndAt: null,
        lastChargedAt: now,
        updatedAt: now
      };
    }
    // Jika ada antrian #1, naikkan langsung ke slot yang baru kosong
    if (nextUnitToCharge && u.id === nextUnitToCharge.id) {
      const duration = nextUnitToCharge.chargeDurationMs || defaultDuration;
      return {
        ...u,
        statusCharger: 'CHARGING',
        chargeStartAt: now,
        chargeEndAt: now + duration,
        chargeDurationMs: duration,
        queuedAt: null,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, { action: 'FINISH_CHARGING', unitId });
  playChimeSound();

  sendNativeNotification("⚡ Pengisian Selesai!", {
    body: `Sepeda Listrik No. ${finishedUnit.kodeGadai} telah selesai di-charge 100%!`
  });

  if (nextUnitToCharge) {
    const days = getDaysSinceLastCharge(nextUnitToCharge.lastChargedAt);
    return {
      success: true,
      message: `Unit #${finishedUnit.kodeGadai} selesai (Baterai 100%). Antrian #${nextUnitToCharge.kodeGadai} (${days >= 15 ? 'Prioritas ' + days + ' hari' : 'Baterai ' + nextUnitToCharge.batteryLevel + '%'}) otomatis naik ke slot charger!`,
      promotedUnit: nextUnitToCharge
    };
  }

  return {
    success: true,
    message: `Unit #${finishedUnit.kodeGadai} selesai di-charge (Baterai 100%). 1 slot charger kini kosong.`
  };
}

// 5c. Batalkan Proses Charger Aktif (Antisipasi salah input unit/slot)
export function cancelChargingUnit(unitId, returnToQueue = true) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        statusCharger: returnToQueue ? 'WAITING' : 'IDLE',
        chargeStartAt: null,
        chargeEndAt: null,
        chargeDurationMs: null,
        queuedAt: returnToQueue ? (u.queuedAt || Date.now()) : null,
        updatedAt: Date.now()
        // PENTING: Baterai TIDAK dinaikkan ke 100% karena proses dibatalkan!
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, { action: 'CANCEL_CHARGING', unitId, payload: { returnToQueue } });
  playGentleBeep();
  return {
    success: true,
    message: `Proses charger unit #${unit.kodeGadai} dibatalkan${returnToQueue ? ' (kembali ke antrian)' : ' (status IDLE)'}. Slot charger kini kosong.`
  };
}

// 5b. Update Kondisi Kesehatan Baterai & Catatan Audit Lapangan
export function updateBatteryAudit(unitId, kondisiBaterai, catatanBaterai) {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const updated = units.map(u => {
    if (u.id === unitId) {
      const finalKondisi = kondisiBaterai || u.kondisiBaterai || 'PRIMA';
      return {
        ...u,
        kondisiBaterai: finalKondisi,
        isRusak: finalKondisi !== 'PRIMA',
        catatanBaterai: catatanBaterai !== undefined ? catatanBaterai : (u.catatanBaterai || ''),
        updatedAt: Date.now()
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, { action: 'UPDATE_BATTERY_AUDIT', unitId, payload: { kondisiBaterai, catatanBaterai } });
  playGentleBeep();
  return {
    success: true,
    message: `Audit baterai unit #${unit.kodeGadai} berhasil diperbarui.`
  };
}

// 5c. Perbarui Letak Unit di Gudang & Rekam Riwayat Perubahan
export function updateUnitLocation(unitId, newLocation, petugas = 'Admin') {
  const units = getStoredUnits();
  const unit = units.find(u => u.id === unitId);
  if (!unit) return { success: false, message: "Unit tidak ditemukan." };

  const cleanLoc = String(newLocation || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const currentLoc = (unit.lokasi || '').trim();

  if (cleanLoc === currentLoc) {
    return { success: true, message: "Letak unit tidak berubah.", unit };
  }

  const now = Date.now();
  const historyEntry = {
    lokasiLama: currentLoc,
    lokasiBaru: cleanLoc,
    timestamp: now,
    petugas: petugas || 'Admin'
  };

  const oldHistory = Array.isArray(unit.riwayatLokasi) ? unit.riwayatLokasi : [];
  const newHistory = [historyEntry, ...oldHistory].slice(0, 5);

  const updated = units.map(u => {
    if (u.id === unitId) {
      return {
        ...u,
        lokasi: cleanLoc,
        lokasiUpdatedAt: now,
        lokasiUpdatedBy: petugas || 'Admin',
        riwayatLokasi: newHistory,
        updatedAt: now
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, {
    action: 'UPDATE_LOCATION',
    unitId,
    payload: { lokasi: cleanLoc, petugas }
  });

  playGentleBeep();
  return {
    success: true,
    message: "Letak unit diperbarui",
    unit: updated.find(u => u.id === unitId)
  };
}

// Helper: Ambil 5 saran lokasi yang paling sering digunakan
export function getPopularLocations(units, limit = 5) {
  if (!Array.isArray(units)) return [];
  const countMap = new Map();
  const displayMap = new Map();

  units.forEach(u => {
    const loc = (u.lokasi || '').trim();
    if (!loc) return;
    const key = loc.toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
    if (!displayMap.has(key)) {
      displayMap.set(key, loc);
    }
  });

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => displayMap.get(key));
}

/**
 * Helper standarisasi item riwayat perpanjangan (objek maupun legacy string)
 */
export function normalizeHistoryEntry(entry, defaultKodeLama = '') {
  if (typeof entry === 'string') {
    return {
      kodeGadaiLama: entry,
      tglPerpanjang: null,
      catatanLama: 'Tidak ada catatan khusus di akad sebelumnya.',
      kondisiBateraiLama: 'PRIMA',
      catatanPerpanjangan: ''
    };
  }
  return {
    kodeGadaiLama: entry?.kodeGadaiLama || defaultKodeLama || '-',
    tglPerpanjang: entry?.tglPerpanjang || null,
    catatanLama: entry?.catatanLama || 'Kondisi normal pada akad sebelumnya.',
    kondisiBateraiLama: entry?.kondisiBateraiLama || 'PRIMA',
    catatanPerpanjangan: entry?.catatanPerpanjangan || ''
  };
}

// 6. Perpanjang Gadai (Mutasi Kode Gadai Baru & Sinkronisasi Real-Time)
export function extendGadaiUnit(unitId, newKodeGadai, newJatuhTempoAt, catatanPerpanjangan = '') {
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

  // Rekam riwayat perpanjangan berstruktur lengkap (kondisi fisik, baterai, & catatan)
  const historyEntry = {
    kodeGadaiLama: oldCode,
    tglPerpanjang: Date.now(),
    catatanLama: unit.catatanBaterai || 'Kondisi awal normal/prima saat masuk.',
    kondisiBateraiLama: unit.kondisiBaterai || 'PRIMA',
    catatanPerpanjangan: catatanPerpanjangan ? String(catatanPerpanjangan).trim() : ''
  };

  const updated = units.map(u => {
    if (u.id === unitId) {
      const mutasiNote = catatanPerpanjangan ? String(catatanPerpanjangan).trim() : `Perpanjangan dari nomor lama #${oldCode}`;
      return {
        ...u,
        kodeGadai: cleanNewCode,
        riwayatKodeGadai: [historyEntry, ...oldHistory],
        jatuhTempoAt: Number(newJatuhTempoAt) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
        statusBarang: 'AKTIF',
        catatanMutasi: mutasiNote,
        catatanBaterai: unit.catatanBaterai || '',
        updatedAt: Date.now()
        // PENTING: Jika sedang CHARGING atau WAITING, sisa timer dan posisi antrian tetap utuh!
      };
    }
    return u;
  });

  saveStoredUnits(updated, true, {
    action: 'EXTEND_LOAN',
    unitId,
    payload: { unitId, cleanNewCode, newJatuhTempoAt, catatanPerpanjangan }
  });
  playGentleBeep();

  let queueNote = "";
  if (unit.statusCharger === 'CHARGING') {
    queueNote = " (Nomor pada kartu Charger Aktif langsung ter-update secara real-time)";
  } else if (unit.statusCharger === 'WAITING') {
    queueNote = " (Nomor pada kartu Antrian Tunggu langsung ter-update secara real-time)";
  }

  return {
    success: true,
    message: `Berhasil perpanjang! Kode #${oldCode} diperbarui menjadi #${cleanNewCode}.${queueNote}`
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

  saveStoredUnits(updated, true, { action: 'REDEEM_LOAN', unitId, payload: { notes } });
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
  saveStoredUnits(updated, true, { action: 'MOVE_TO_LELANG', unitId, payload: { estimatedPrice } });
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

  saveStoredUnits(updated, true, { action: 'MARK_LELANG_SOLD', unitId, payload: { soldPrice, buyerInfo } });
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

/**
 * Offline Mutation Outbox Queue & Network Reachability Service
 * Antrean Charger Sepeda Listrik & Gadai - Operasional Gudang
 */

const OUTBOX_KEY = 'ebike_pending_sync_queue';
const LAST_SYNC_KEY = 'ebike_last_cloud_sync_ts';

let isOnlineInternal = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSyncingInternal = false;
const listeners = new Set();

/**
 * 1. Manajemen Antrian Outbox (Pending Mutations)
 */
export function getPendingMutations() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading outbox queue:', err);
    return [];
  }
}

export function savePendingMutations(queue) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    notifySubscribers();
  } catch (err) {
    console.error('Error saving outbox queue:', err);
  }
}

export function enqueueMutation(actionType, unitId, payload) {
  const queue = getPendingMutations();
  const ticket = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: actionType,
    unitId: unitId || (payload && payload.id) || null,
    kodeGadai: (payload && payload.kodeGadai) || null,
    payload,
    timestamp: Date.now(),
    retryCount: 0
  };

  queue.push(ticket);
  savePendingMutations(queue);
  return ticket;
}

export function removePendingMutations(ticketIds = []) {
  if (!ticketIds.length) return;
  const idSet = new Set(ticketIds);
  const queue = getPendingMutations().filter(t => !idSet.has(t.id));
  savePendingMutations(queue);
}

export function getPendingCount() {
  return getPendingMutations().length;
}

export function getLastSyncTime() {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  return raw ? Number(raw) : null;
}

export function setLastSyncTime(ts = Date.now()) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
}

/**
 * 2. Deteksi Koneksi Riil (Heartbeat Reachability Check)
 */
export async function checkInternetReachability() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    // Gunakan URL version.json atau favicon lokal dengan query timestamp & timeout pendek
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok || res.status === 304;
  } catch (e) {
    // Jika fetch gagal (karena timeout atau no connection)
    return false;
  }
}

/**
 * 3. Subscription Status Jaringan & Outbox
 */
function notifySubscribers() {
  const state = {
    isOnline: isOnlineInternal,
    isSyncing: isSyncingInternal,
    pendingCount: getPendingCount(),
    lastSyncTime: getLastSyncTime()
  };
  listeners.forEach(fn => {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToNetworkStatus(callback) {
  listeners.add(callback);
  // Panggil callback segera dengan state terkini
  callback({
    isOnline: isOnlineInternal,
    isSyncing: isSyncingInternal,
    pendingCount: getPendingCount(),
    lastSyncTime: getLastSyncTime()
  });

  return () => {
    listeners.delete(callback);
  };
}

/**
 * 4. Mesin Penguras Antrian (Drain Outbox Queue ke Supabase)
 */
export async function drainOutboxQueue(supabaseClient, modelToDbConverter) {
  if (!supabaseClient || isSyncingInternal) {
    return { success: false, drained: 0, remaining: getPendingCount() };
  }

  const queue = getPendingMutations();
  if (queue.length === 0) {
    return { success: true, drained: 0, remaining: 0 };
  }

  isSyncingInternal = true;
  notifySubscribers();

  let drainedCount = 0;
  const processedIds = [];

  try {
    // Kumpulkan payload unit terbaru untuk batch upsert
    // Jika terdapat beberapa mutasi untuk unit yang sama, ambil versi payload paling akhir
    const unitMap = new Map();

    for (const ticket of queue) {
      if (ticket.payload) {
        if (Array.isArray(ticket.payload)) {
          // Kasus BATCH_SYNC_EXCEL (payload berupa array unit)
          ticket.payload.forEach(u => {
            if (u && u.id) unitMap.set(u.id, u);
          });
        } else if (ticket.payload.id) {
          unitMap.set(ticket.payload.id, ticket.payload);
        }
      }
      processedIds.push(ticket.id);
    }

    const unitsToUpsert = Array.from(unitMap.values());
    if (unitsToUpsert.length > 0) {
      const dbPayload = modelToDbConverter
        ? unitsToUpsert.map(modelToDbConverter)
        : unitsToUpsert;

      const { error } = await supabaseClient
        .from('gadai_units')
        .upsert(dbPayload);

      if (error) {
        // Fallback jika ada kolom yang belum ada di database
        if (error.code === '42703' || String(error.message).includes('column')) {
          const stripped = dbPayload.map(({ charge_duration_ms, kondisi_baterai, catatan_baterai, ...rest }) => rest);
          const retryRes = await supabaseClient.from('gadai_units').upsert(stripped);
          if (retryRes.error) {
            throw retryRes.error;
          }
        } else {
          throw error;
        }
      }
    }

    // Berhasil kirim, hapus dari antrian
    removePendingMutations(processedIds);
    drainedCount = processedIds.length;
    setLastSyncTime(Date.now());
    isOnlineInternal = true;
  } catch (err) {
    console.warn('Gagal menguras antrian mutasi offline ke cloud:', err);
    // Sinyal kemungkinan masih lemah
    isOnlineInternal = false;
  } finally {
    isSyncingInternal = false;
    notifySubscribers();
  }

  return {
    success: drainedCount > 0,
    drained: drainedCount,
    remaining: getPendingCount()
  };
}

/**
 * 5. Inisialisasi Listener Koneksi Browser
 */
export function initOfflineSyncEngine(onSyncCompleted) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    const reallyOnline = await checkInternetReachability();
    isOnlineInternal = reallyOnline;
    notifySubscribers();

    if (reallyOnline && getPendingCount() > 0 && typeof onSyncCompleted === 'function') {
      onSyncCompleted();
    }
  };

  const handleOffline = () => {
    isOnlineInternal = false;
    notifySubscribers();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Pemeriksaan periodik setiap 20 detik jika ada antrian tertunda
  const intervalId = setInterval(async () => {
    if (getPendingCount() > 0) {
      const reachable = await checkInternetReachability();
      if (reachable !== isOnlineInternal) {
        isOnlineInternal = reachable;
        notifySubscribers();
      }
      if (reachable && typeof onSyncCompleted === 'function') {
        onSyncCompleted();
      }
    }
  }, 20000);

  // Cek koneksi awal
  checkInternetReachability().then(res => {
    isOnlineInternal = res;
    notifySubscribers();
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(intervalId);
  };
}

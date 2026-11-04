import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { subscribeToNetworkStatus } from '../services/offlineQueue';
import { triggerManualSync } from '../services/storage';

export default function NetworkStatusBadge({ onNotify }) {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null
  });

  useEffect(() => {
    const unsub = subscribeToNetworkStatus((state) => {
      setNetworkState(state);
    });
    return () => unsub();
  }, []);

  const handleManualSyncClick = async () => {
    if (networkState.isSyncing) return;

    if (!networkState.isOnline) {
      if (onNotify) {
        onNotify({
          title: "Mode Offline Gudang 📡",
          message: `${networkState.pendingCount} perubahan aman tersimpan di HP Anda. Data otomatis dikirim begitu mendeteksi sinyal.`,
          type: "info"
        });
      }
      return;
    }

    if (onNotify) {
      onNotify({
        title: "Menyinkronkan...",
        message: "Menghubungi server cloud Supabase...",
        type: "info"
      });
    }

    const res = await triggerManualSync();
    if (res.success) {
      if (onNotify) {
        onNotify({
          title: "Sinkronisasi Berhasil! ☁️",
          message: res.drained > 0
            ? `${res.drained} mutasi gudang berhasil dikirim ke server.`
            : "Data lokal dan server cloud sudah sepenuhnya sinkron.",
          type: "success"
        });
      }
    } else {
      if (onNotify) {
        onNotify({
          title: "Sinkronisasi Tertunda",
          message: res.message || "Gagal menghubungi server. Data tetap aman di penyimpanan lokal.",
          type: "warning"
        });
      }
    }
  };

  const { isOnline, isSyncing, pendingCount } = networkState;

  // 1. Syncing state
  if (isSyncing) {
    return (
      <button
        onClick={handleManualSyncClick}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-full text-[10.5px] font-semibold animate-pulse active:scale-95 transition-all shrink-0"
        title="Sedang mengunggah mutasi ke cloud"
      >
        <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
        <span className="leading-none">Sync ({pendingCount})...</span>
      </button>
    );
  }

  // 2. Offline state (In warehouse without signal)
  if (!isOnline || pendingCount > 0) {
    return (
      <button
        onClick={handleManualSyncClick}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-semibold active:scale-95 transition-all shrink-0 ${
          !isOnline
            ? "bg-amber-50 text-amber-800 border border-amber-200"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        }`}
        title="Klik untuk info sinkronisasi offline"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
        <span className="leading-none">{!isOnline ? `Offline${pendingCount > 0 ? ` (${pendingCount})` : ''}` : `${pendingCount} mutasi`}</span>
      </button>
    );
  }

  // 3. Online & All synced state (Ringkas: titik hijau + teks kecil)
  return (
    <button
      onClick={handleManualSyncClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50/90 text-emerald-800 border border-emerald-200/90 rounded-full text-[10.5px] font-medium hover:bg-emerald-100 transition-all active:scale-95 shrink-0"
      title="Terhubung ke cloud & tersinkron"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span className="leading-none">Cloud OK</span>
    </button>
  );
}

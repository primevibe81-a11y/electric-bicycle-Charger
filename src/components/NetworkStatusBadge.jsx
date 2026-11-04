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
        className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-800 border border-sky-300 rounded-full text-[10.5px] font-bold animate-pulse shadow-xs active:scale-95 transition-all"
        title="Sedang mengunggah data mutasi ke cloud"
      >
        <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
        <span>Sinkronisasi ({pendingCount})...</span>
      </button>
    );
  }

  // 2. Offline state (In warehouse without signal)
  if (!isOnline || pendingCount > 0) {
    return (
      <button
        onClick={handleManualSyncClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold shadow-xs active:scale-95 transition-all ${
          !isOnline
            ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
            : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
        }`}
        title="Klik untuk info sinkronisasi offline"
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3 h-3 text-amber-600" />
            <span>Offline {pendingCount > 0 ? `(${pendingCount} tersimpan)` : 'Gudang'}</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3 text-blue-600" />
            <span>{pendingCount} mutasi siap kirim</span>
          </>
        )}
      </button>
    );
  }

  // 3. Online & All synced state (Quiet, subtle green indicator)
  return (
    <button
      onClick={handleManualSyncClick}
      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-[10px] font-bold shadow-xs hover:bg-emerald-100 transition-all active:scale-95"
      title="Terhubung ke cloud & tersinkron"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span className="text-[10px]">Cloud OK</span>
    </button>
  );
}

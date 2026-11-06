import React, { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { subscribeToNetworkStatus } from '../services/offlineQueue';
import { triggerManualSync } from '../services/storage';
import Tooltip from './Tooltip';

export default function NetworkStatusBadge({ onNotify }) {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null
  });

  const [justSynced, setJustSynced] = useState(false);
  const prevSyncingRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeToNetworkStatus((state) => {
      setNetworkState(state);
    });
    return () => unsub();
  }, []);

  // Denyut sekali saat proses sinkronisasi selesai
  useEffect(() => {
    if (prevSyncingRef.current && !networkState.isSyncing && networkState.isOnline && networkState.pendingCount === 0) {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 800);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = networkState.isSyncing;
  }, [networkState.isSyncing, networkState.isOnline, networkState.pendingCount]);

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

  let tooltipText = "Cloud Terhubung & Sinkron";
  if (isSyncing) tooltipText = `Sedang sinkronisasi (${pendingCount})...`;
  else if (!isOnline) tooltipText = `Mode Offline: ${pendingCount} mutasi tertunda`;
  else if (pendingCount > 0) tooltipText = `${pendingCount} mutasi antri ke cloud`;

  return (
    <Tooltip content={tooltipText} position="bottom">
      <button
        onClick={handleManualSyncClick}
        aria-label={tooltipText}
        className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-all active:scale-95 ${
          isSyncing
            ? 'text-sky-600 bg-sky-50 dark:bg-sky-950/40'
            : !isOnline
              ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        } ${justSynced ? 'animate-cloud-pulse ring-2 ring-emerald-300' : ''}`}
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin text-sky-600 dark:text-sky-400" />
        ) : !isOnline ? (
          <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Cloud className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        )}

        {/* Status Dot Indikator (Hijau = Online, Amber = Offline / Pending) */}
        {!isSyncing && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white dark:border-[#151C28] ${
              !isOnline || pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        )}
      </button>
    </Tooltip>
  );
}

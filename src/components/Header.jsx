import React, { useState, useEffect } from 'react';
import { Zap, Bell, BellOff, LogOut, ShieldCheck, UserCheck, RotateCcw } from 'lucide-react';
import { requestNotificationPermission } from '../services/soundNotification';
import { resetToSeedData } from '../services/storage';
import NetworkStatusBadge from './NetworkStatusBadge';

export default function Header({ user, onLogout, onNotify }) {
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotif = async () => {
    const res = await requestNotificationPermission();
    if (res.status === 'granted') {
      setNotifGranted(true);
      onNotify({ title: "Notifikasi Aktif!", message: "Alarm suara & push notification siap bekerja.", type: "success" });
    } else {
      onNotify({ title: "Izin Ditolak", message: "Aktifkan notifikasi pada pengaturan browser/iOS.", type: "warning" });
    }
  };

  const handleResetData = () => {
    if (window.confirm("Kembalikan data ke status demo awal (Seed Data)?")) {
      resetToSeedData();
      onNotify({ title: "Data Direset", message: "Data contoh telah dikembalikan ke kondisi awal.", type: "info" });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 pt-3 pb-2.5 shadow-xs">
      {/* Top bar: live time and reset action */}
      <div className="flex items-center justify-between text-xs text-sky-800 font-medium mb-1">
        <span className="flex items-center gap-1.5 font-bold tracking-tight text-slate-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          iPhone 13 Mobile • {currentTime} WIB
        </span>
        <button
          onClick={handleResetData}
          title="Reset ke Data Awal Demo"
          className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 text-white flex items-center justify-center shadow-sm shadow-sky-200">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">E-Bike Gadai</h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              {user?.role === 'admin_gudang' ? (
                <ShieldCheck className="w-3 h-3 text-sky-600" />
              ) : (
                <UserCheck className="w-3 h-3 text-emerald-600" />
              )}
              <span>{user?.displayName || "Petugas"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <NetworkStatusBadge onNotify={onNotify} />

          <button
            onClick={handleToggleNotif}
            className={`p-2 rounded-full border transition-all active:scale-95 ${
              notifGranted
                ? "bg-sky-50 border-sky-200 text-sky-600"
                : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
            }`}
            title={notifGranted ? "Notifikasi iPhone Aktif" : "Aktifkan Notifikasi"}
          >
            {notifGranted ? <Bell className="w-4 h-4 fill-sky-500" /> : <BellOff className="w-4 h-4" />}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-full bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 active:scale-95 transition-all"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

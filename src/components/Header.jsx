import React, { useState, useEffect } from 'react';
import {
  Zap,
  Bell,
  BellOff,
  LogOut,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  X,
  User,
  Smartphone,
  Clock
} from 'lucide-react';
import { requestNotificationPermission } from '../services/soundNotification';
import { resetToSeedData } from '../services/storage';
import NetworkStatusBadge from './NetworkStatusBadge';

// Mode demo hanya aktif saat development lokal atau flag environment VITE_ENABLE_DEMO_MODE=true
const IS_DEMO_MODE = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'
);

export default function Header({ user, onLogout, onNotify }) {
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [currentTime, setCurrentTime] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      onNotify({
        title: 'Notifikasi Aktif! 🔔',
        message: 'Alarm suara & push notification siap bekerja.',
        type: 'success'
      });
    } else {
      onNotify({
        title: 'Izin Ditolak',
        message: 'Aktifkan izin notifikasi di pengaturan browser.',
        type: 'warning'
      });
    }
  };

  const handleResetData = () => {
    if (window.confirm('Kembalikan data ke status demo awal (Seed Data)?')) {
      resetToSeedData();
      setIsProfileOpen(false);
      onNotify({
        title: 'Data Direset',
        message: 'Data contoh telah dikembalikan ke kondisi awal.',
        type: 'info'
      });
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Yakin ingin keluar dari akun ini?')) {
      setIsProfileOpen(false);
      onLogout();
    }
  };

  // Inisial nama pengguna
  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'EB';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-sky-100 px-4 py-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Sisi Kiri: Logo + Nama Aplikasi + Peran */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 text-white flex items-center justify-center shadow-xs shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                E-Bike Gadai
              </h1>
              <p className="text-[10.5px] text-slate-500 flex items-center gap-1 leading-none mt-0.5 truncate">
                {user?.role === 'admin_gudang' ? (
                  <ShieldCheck className="w-3 h-3 text-sky-600 shrink-0" />
                ) : (
                  <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                )}
                <span className="truncate">{user?.displayName || 'Petugas'}</span>
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Cloud OK + Notifikasi + Avatar Profil (Logout dipindah ke dalam profil) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badge Ringkas Cloud OK */}
            <NetworkStatusBadge onNotify={onNotify} />

            {/* Tombol Notifikasi (Touch Target 44x44px) */}
            <button
              onClick={handleToggleNotif}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                notifGranted
                  ? 'text-sky-600 hover:bg-sky-50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={notifGranted ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
              aria-label="Toggle Notifikasi"
            >
              {notifGranted ? (
                <Bell className="w-4 h-4 fill-sky-500" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>

            {/* Tombol Avatar Profil (Touch Target 44x44px) */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200 transition-all active:scale-95"
              title="Menu Profil & Pengaturan"
              aria-label="Buka Menu Profil"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* Profile & Settings Bottom Sheet */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 animate-in fade-in duration-150">
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1"></div>

            {/* Profile Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20">
                  {initials}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {user?.displayName || 'Petugas'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <span className="capitalize">{user?.role === 'admin_gudang' ? 'Admin Gudang' : 'Kasir Gadai'}</span>
                    <span>•</span>
                    <span className="text-slate-400">@{user?.username || 'user'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Device & Session Info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Perangkat Aktif
                </span>
                <span className="font-semibold text-slate-800">iPhone 13 Mobile</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Waktu Sistem
                </span>
                <span className="font-semibold text-slate-800">{currentTime} WIB</span>
              </div>
            </div>

            {/* Actions: Reset Demo (Hanya tampil jika mode demo aktif) */}
            {IS_DEMO_MODE && (
              <button
                onClick={handleResetData}
                className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Reset Data Demo (Seed Data)</span>
              </button>
            )}

            {/* Logout Action (Dipindah dari Header utama) */}
            <button
              onClick={handleLogoutClick}
              className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

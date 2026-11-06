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
  Clock,
  HelpCircle,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { requestNotificationPermission } from '../services/soundNotification';
import { resetToSeedData } from '../services/storage';
import { toggleTheme } from '../services/theme';
import { triggerHaptic } from '../services/animationHelpers';
import NetworkStatusBadge from './NetworkStatusBadge';
import IconLegendSheet from './IconLegendSheet';
import OnboardingModal from './OnboardingModal';

// Mode demo hanya aktif saat development lokal atau flag environment VITE_ENABLE_DEMO_MODE=true
const IS_DEMO_MODE = Boolean(
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'
);

export default function Header({ user, onLogout, onNotify, onOpenAiAssistant }) {
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [currentTime, setCurrentTime] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTheme = () => {
    triggerHaptic('light');
    const nextTheme = toggleTheme();
    setIsDark(nextTheme === 'dark');
    onNotify?.({
      title: nextTheme === 'dark' ? 'Mode Gelap Aktif 🌙' : 'Mode Terang Aktif ☀️',
      message: nextTheme === 'dark' ? 'Tampilan kontras OLED diaktifkan.' : 'Tampilan standar diaktifkan.',
      type: 'info'
    });
  };

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
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#151C28]/95 backdrop-blur-md border-b border-sky-100 dark:border-[#232F42] px-4 py-2.5 shadow-xs transition-colors">
        <div className="flex items-center justify-between gap-2">
          {/* Sisi Kiri: Logo + Nama Aplikasi */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 text-white flex items-center justify-center shadow-xs shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              E-Bike Gadai
            </h1>
          </div>

          {/* Sisi Kanan: AI Assistant + Cloud + Dark Mode + Notifikasi + Avatar Profil */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Tombol Asisten AI Gudang (Touch Target 44x44px) */}
            <button
              onClick={onOpenAiAssistant}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all active:scale-95"
              title="Buka Asisten AI Gudang"
              aria-label="Asisten AI Gudang"
            >
              <Sparkles className="w-4 h-4 fill-indigo-500/20" />
            </button>

            {/* Status Cloud (Ikon Awan + Titik Status, Tanpa Teks) */}
            <NetworkStatusBadge onNotify={onNotify} />

            {/* Tombol Toggle Dark Mode (Sun / Moon) */}
            <button
              onClick={handleToggleTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              title={isDark ? "Ganti ke Mode Terang (Light)" : "Ganti ke Mode Gelap (Dark)"}
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Tombol Notifikasi (Touch Target 44x44px) */}
            <button
              onClick={handleToggleNotif}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                notifGranted
                  ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={notifGranted ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
              aria-label="Toggle Notifikasi"
            >
              {notifGranted ? (
                <Bell className="w-4 h-4 fill-sky-500 dark:fill-sky-400" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>

            {/* Tombol Avatar Profil (Touch Target 44x44px) */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-[430px] bg-white dark:bg-[#151C28] text-slate-900 dark:text-slate-100 rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1" />

            {/* Profile Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20">
                  {initials}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                    {user?.displayName || 'Petugas'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <span className="capitalize">{user?.role === 'admin_gudang' ? 'Admin Gudang' : 'Petugas Gudang'}</span>
                    <span>•</span>
                    <span className="text-slate-400 dark:text-slate-500">@{user?.username || 'user'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Tutup menu profil"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Menu: Legenda Ikon & Panduan Penggunaan */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsLegendOpen(true);
                }}
                className="pressable h-11 px-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 rounded-xl text-xs font-bold border border-sky-200 dark:border-sky-800/60 flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Legenda Ikon</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsOnboardingOpen(true);
                }}
                className="pressable h-11 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Panduan Simbol</span>
              </button>
            </div>

            {/* Device & Session Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Perangkat Aktif
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">iPhone 13 Mobile</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Waktu Sistem
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currentTime} WIB</span>
              </div>
            </div>

            {/* Actions: Reset Demo */}
            {IS_DEMO_MODE && (
              <button
                onClick={handleResetData}
                className="w-full h-11 min-h-[44px] px-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Reset Data Demo (Seed Data)</span>
              </button>
            )}

            {/* Logout Action */}
            <button
              onClick={handleLogoutClick}
              className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}

      {/* Legenda Ikon Bottom Sheet */}
      <IconLegendSheet
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />

      {/* Onboarding / Panduan Simbol Modal */}
      <OnboardingModal
        forceOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </>
  );
}

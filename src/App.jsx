import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import LoginModal from './components/LoginModal';
import PwaUpdateNotification from './components/PwaUpdateNotification';
import ErrorBoundary from './components/ErrorBoundary';
import AsistenAiBottomSheet from './components/AsistenAiBottomSheet';

import DashboardView from './views/DashboardView';
import AktifView from './views/AktifView';
import LelangView from './views/LelangView';
import LaporanView from './views/LaporanView';

import { getActiveSession, logoutSession } from './config/auth';
import {
  getStoredUnits,
  subscribeToStoreUpdates,
  finishChargingUnit,
  autoEnqueueOverdueUnits,
  triggerManualSync
} from './services/storage';
import { playChimeSound, sendNativeNotification } from './services/soundNotification';
import { initPwaUpdateChecker } from './services/pwaUpdate';
import { initOfflineSyncEngine } from './services/offlineQueue';
import { isReducedMotion } from './services/animationHelpers';

const TAB_INDICES = { dashboard: 0, aktif: 1, lelang: 2, laporan: 3 };

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getActiveSession());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [units, setUnits] = useState(() => getStoredUnits());
  const [toast, setToast] = useState(null);

  // Helper aksi awal saat navigasi ke tab Laporan (misal dari tombol Cepat di Aktif)
  const [laporanInitialAction, setLaporanInitialAction] = useState(null);

  // Status & kontrol modal Asisten AI Gudang & filter cepat Aktif
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aktifInitialFilter, setAktifInitialFilter] = useState('ALL');

  // Track if completion sound was already played for current charging session
  const [finishedAlarmFired, setFinishedAlarmFired] = useState(false);

  // Status deteksi pembaruan aplikasi PWA
  const [pwaUpdateInfo, setPwaUpdateInfo] = useState(null);

  // Ref untuk container scroll utama
  const mainRef = useRef(null);

  // 4. Reset Momentum Scroll iOS saat Berganti Tab sebelum frame baru digambar
  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  // Listener deteksi pembaruan aplikasi PWA (Service Worker & Version Check)
  useEffect(() => {
    let cleanup = () => {};
    initPwaUpdateChecker((update) => {
      setPwaUpdateInfo(update);
      sendNativeNotification("Pembaruan Aplikasi Siap! ⚡", {
        body: "Versi baru aplikasi telah siap. Silakan restart / muat ulang aplikasi."
      });
      setToast({
        title: "Pembaruan Tersedia 🚀",
        message: "Versi baru aplikasi terdeteksi di server. Silakan restart halaman.",
        type: "info"
      });
    }).then((unsub) => {
      if (typeof unsub === 'function') cleanup = unsub;
    });

    return () => cleanup();
  }, []);

  // Otomatis masukkan unit yang >= 15 hari belum di-charge saat aplikasi dibuka
  useEffect(() => {
    const { newlyEnqueued } = autoEnqueueOverdueUnits();
    if (newlyEnqueued > 0) {
      setToast({
        title: "Antrian Otomatis Terisi",
        message: `${newlyEnqueued} sepeda listrik yang sudah ≥15 hari belum di-charge otomatis diprioritaskan di antrian teratas.`,
        type: "info"
      });
    }
  }, []);

  // Subscribe to real-time storage & cross-tab sync
  useEffect(() => {
    const unsubscribe = subscribeToStoreUpdates((updated) => {
      setUnits(updated);
    });
    return () => unsubscribe();
  }, []);

  // Background Auto-Sync saat koneksi internet pulih kembali setelah offline di gudang
  useEffect(() => {
    const unsub = initOfflineSyncEngine(async () => {
      const res = await triggerManualSync();
      if (res && res.drained > 0) {
        setToast({
          title: "Sinkronisasi Cloud Berhasil! ☁️",
          message: `${res.drained} perubahan mutasi dari gudang berhasil dikirim ke server Supabase.`,
          type: "success"
        });
      }
    });
    return () => unsub();
  }, []);

  // Monitor charging timer completion and trigger chime sound + notification
  useEffect(() => {
    const interval = setInterval(() => {
      const activeCharging = units.filter(u => u.statusCharger === 'CHARGING');
      const finished = activeCharging.find(u => u.chargeEndAt && u.chargeEndAt <= Date.now());

      if (finished && !finishedAlarmFired) {
        setFinishedAlarmFired(true);
        playChimeSound();
        sendNativeNotification("⚡ Pengisian Daya Selesai!", {
          body: `Sepeda #${finished.kodeGadai} (${finished.merkSepeda}) telah selesai di-charge!`
        });
        setToast({
          title: "Slot Charger Selesai!",
          message: `Waktu pengisian untuk unit #${finished.kodeGadai} telah habis. Klik tombol Selesai untuk menaikkan antrian berikutnya.`,
          type: "success"
        });
      } else if (!finished && finishedAlarmFired) {
        setFinishedAlarmFired(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [units, finishedAlarmFired]);

  // Periodic Session Expiration / Anti-Tamper Check (Auto-Logout saat 12 jam habis atau sesi dihapus)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const active = getActiveSession();
      if (!active) {
        setCurrentUser(null);
        setToast({
          title: "Sesi Kedaluwarsa 🔒",
          message: "Sesi Anda telah berakhir demi keamanan data nasabah. Silakan masuk kembali.",
          type: "warning"
        });
      }
    }, 10000); // Periksa setiap 10 detik

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleNotify = (toastPayload) => {
    setToast(toastPayload);
  };

  const handleLogout = () => {
    logoutSession();
    setCurrentUser(null);
    setToast({
      title: "Sesi Berakhir",
      message: "Anda telah keluar dari aplikasi.",
      type: "info"
    });
  };

  // 1. Perpindahan Tab Instan (Mencegah Ghosting / Overlapping View di iOS Safari)
  const handleTabChange = (newTab) => {
    if (activeTab === newTab) {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
      return;
    }

    setLaporanInitialAction(null);
    setActiveTab(newTab);
  };

  const handleAiNavigateToTab = (targetTab, options = {}) => {
    if (options.filterType) {
      setAktifInitialFilter(options.filterType);
    }
    handleTabChange(targetTab);
  };

  const handleNavigateToPerpanjang = (unitId) => {
    setLaporanInitialAction({ type: 'perpanjang', unitId });
    handleTabChange("laporan");
  };

  const handleNavigateToTebus = (unitId) => {
    setLaporanInitialAction({ type: 'tebus', unitId });
    handleTabChange("laporan");
  };

  const waitingQueueCount = units.filter(u => u.statusCharger === 'WAITING').length;

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-stretch sm:py-4">
      {/* Container Khusus iPhone 13 (Mobile-First 390px x 844px) */}
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-gradient-to-b from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] dark:bg-[#0B0F17] dark:from-[#0B0F17] dark:via-[#0B0F17] dark:to-[#0B0F17] dark:text-slate-100 relative flex flex-col shadow-2xl overflow-x-hidden sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 transition-colors">
        
        {/* Notch simulation decoration for desktop view */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-800 rounded-b-2xl z-50"></div>

        {/* Global In-App Toast */}
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* PWA Application Update Notification Banner */}
        <PwaUpdateNotification
          updateInfo={pwaUpdateInfo}
          onClose={() => setPwaUpdateInfo(null)}
        />

        {/* Auth Check */}
        {!currentUser ? (
          <LoginModal
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setToast({
                title: "Selamat Bertugas!",
                message: `Masuk sebagai ${user.displayName} (${user.role}).`,
                type: "success"
              });
            }}
          />
        ) : (
          <>
            {/* Header with notch padding */}
            <Header
              user={currentUser}
              onLogout={handleLogout}
              onNotify={handleNotify}
              onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            />

            {/* Main Scrollable View Area with Safe Area Padding (pb-28 agar tidak tertutup floating bottom nav) */}
            <main
              ref={mainRef}
              className="flex-1 px-4 pt-3 pb-28 sm:pb-32 overflow-y-auto overscroll-y-contain -webkit-overflow-scrolling-touch"
            >
              <ErrorBoundary key={activeTab} onReset={() => setActiveTab('dashboard')}>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    units={units}
                    onNotify={handleNotify}
                    onSelectTab={handleTabChange}
                    onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  />
                )}

                {activeTab === 'aktif' && (
                  <AktifView
                    units={units}
                    onNotify={handleNotify}
                    onNavigateToPerpanjang={handleNavigateToPerpanjang}
                    onNavigateToTebus={handleNavigateToTebus}
                    initialFilter={aktifInitialFilter}
                  />
                )}

                {activeTab === 'lelang' && (
                  <LelangView
                    units={units}
                    onNotify={handleNotify}
                  />
                )}

                {activeTab === 'laporan' && (
                  <LaporanView
                    units={units}
                    onNotify={handleNotify}
                    initialAction={laporanInitialAction}
                  />
                )}
              </ErrorBoundary>
            </main>

            {/* Floating Dynamic Island Bottom Navigation (Glassmorphism Pill) */}
            <BottomNav
              activeTab={activeTab}
              onChangeTab={handleTabChange}
              queueCount={waitingQueueCount}
            />

            {/* Bottom Sheet Asisten AI Gudang */}
            <AsistenAiBottomSheet
              isOpen={isAiAssistantOpen}
              onClose={() => setIsAiAssistantOpen(false)}
              units={units}
              onNotify={handleNotify}
              onNavigateToTab={handleAiNavigateToTab}
              currentUser={currentUser}
            />
          </>
        )}
      </div>
    </div>
  );
}

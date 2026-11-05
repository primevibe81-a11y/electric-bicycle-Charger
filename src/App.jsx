import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import LoginModal from './components/LoginModal';
import PwaUpdateNotification from './components/PwaUpdateNotification';

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

  // Track if completion sound was already played for current charging session
  const [finishedAlarmFired, setFinishedAlarmFired] = useState(false);

  // Status deteksi pembaruan aplikasi PWA
  const [pwaUpdateInfo, setPwaUpdateInfo] = useState(null);

  // Ref untuk scroll restoration dan pencegahan transisi ganda
  const mainRef = useRef(null);
  const scrollPositions = useRef({ dashboard: 0, aktif: 0, lelang: 0, laporan: 0 });
  const isTransitioningRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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

  // Fungsi transisi antar menu dengan View Transitions + Web Animations fallback & scroll memory
  const handleTabChange = (newTab) => {
    const currentTab = activeTabRef.current;

    // 1. Jika tab yang sama ditekan lagi: scroll ke atas dengan halus, tanpa transisi menu
    if (newTab === currentTab) {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // 2. Cegah transisi ganda bila pengguna menekan tab berulang cepat
    if (isTransitioningRef.current) {
      return;
    }

    // 3. Simpan posisi scroll tab saat ini
    if (mainRef.current) {
      scrollPositions.current[currentTab] = mainRef.current.scrollTop;
    }

    const prevIndex = TAB_INDICES[currentTab] ?? 0;
    const nextIndex = TAB_INDICES[newTab] ?? 0;
    const direction = nextIndex > prevIndex ? 'forward' : 'backward';

    const prefersReduced = isReducedMotion();
    isTransitioningRef.current = true;

    const performStateChange = () => {
      setLaporanInitialAction(null);
      setActiveTab(newTab);
      activeTabRef.current = newTab;
    };

    const onTransitionDone = () => {
      isTransitioningRef.current = false;
      // Pulihkan posisi scroll tab tujuan setelah render
      requestAnimationFrame(() => {
        if (mainRef.current) {
          mainRef.current.scrollTop = scrollPositions.current[newTab] || 0;
        }
      });
    };

    // Implementasi utama: document.startViewTransition bila tersedia
    if (typeof document !== 'undefined' && 'startViewTransition' in document && !prefersReduced) {
      document.documentElement.dataset.transitionDirection = direction;
      const transition = document.startViewTransition(() => {
        performStateChange();
      });
      transition.finished.finally(() => {
        delete document.documentElement.dataset.transitionDirection;
        onTransitionDone();
      });
    } else if (mainRef.current && !prefersReduced) {
      // Fallback cross-fade / slide 220ms memakai Web Animations API
      const xOffset = direction === 'forward' ? '20px' : '-20px';
      const anim = mainRef.current.animate(
        [
          { opacity: 0, transform: `translateX(${xOffset})` },
          { opacity: 1, transform: 'translateX(0)' }
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'both'
        }
      );
      performStateChange();
      anim.onfinish = onTransitionDone;
      anim.oncancel = onTransitionDone;
    } else {
      // Fallback untuk reduced motion (cross-fade 100ms)
      performStateChange();
      onTransitionDone();
    }
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
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-gradient-to-b from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD] relative flex flex-col shadow-2xl overflow-x-hidden sm:rounded-[40px] sm:border-[8px] sm:border-slate-800">
        
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
            />

            {/* Main Scrollable View Area with Safe Area Padding */}
            <main
              ref={mainRef}
              style={{ viewTransitionName: 'main-content' }}
              className="flex-1 px-4 pt-3 pb-24 overflow-y-auto"
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  units={units}
                  onNotify={handleNotify}
                  onSelectTab={handleTabChange}
                />
              )}

              {activeTab === 'aktif' && (
                <AktifView
                  units={units}
                  onNotify={handleNotify}
                  onNavigateToPerpanjang={handleNavigateToPerpanjang}
                  onNavigateToTebus={handleNavigateToTebus}
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
            </main>

            {/* Fixed Bottom Navigation (4 Tab Bar) */}
            <BottomNav
              activeTab={activeTab}
              onChangeTab={handleTabChange}
              queueCount={waitingQueueCount}
            />
          </>
        )}
      </div>
    </div>
  );
}

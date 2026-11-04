import React, { useState, useEffect } from 'react';
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
import { getStoredUnits, subscribeToStoreUpdates, finishChargingUnit, autoEnqueueOverdueUnits } from './services/storage';
import { playChimeSound, sendNativeNotification } from './services/soundNotification';
import { initPwaUpdateChecker } from './services/pwaUpdate';

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

  const handleNavigateToPerpanjang = (unitId) => {
    setLaporanInitialAction({ type: 'perpanjang', unitId });
    setActiveTab("laporan");
  };

  const handleNavigateToTebus = (unitId) => {
    setLaporanInitialAction({ type: 'tebus', unitId });
    setActiveTab("laporan");
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
            <main className="flex-1 px-4 pt-3 pb-24 overflow-y-auto">
              {activeTab === 'dashboard' && (
                <DashboardView
                  units={units}
                  onNotify={handleNotify}
                  onSelectTab={setActiveTab}
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
              onChangeTab={(tabId) => {
                setLaporanInitialAction(null);
                setActiveTab(tabId);
              }}
              queueCount={waitingQueueCount}
            />
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import LoginModal from './components/LoginModal';

import DashboardView from './views/DashboardView';
import AktifView from './views/AktifView';
import TebusView from './views/TebusView';
import PerpanjangView from './views/PerpanjangView';
import LelangView from './views/LelangView';

import { getActiveSession, logoutSession } from './config/auth';
import { getStoredUnits, subscribeToStoreUpdates, finishChargingUnit, autoEnqueueOverdueUnits } from './services/storage';
import { playChimeSound, sendNativeNotification } from './services/soundNotification';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getActiveSession());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [units, setUnits] = useState(() => getStoredUnits());
  const [toast, setToast] = useState(null);

  // Cross-view selection helper (e.g., from Aktif to Perpanjang / Tebus)
  const [preselectedUnitId, setPreselectedUnitId] = useState("");

  // Track if completion sound was already played for current charging session
  const [finishedAlarmFired, setFinishedAlarmFired] = useState(false);

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
    setPreselectedUnitId(unitId);
    setActiveTab("perpanjang");
  };

  const handleNavigateToTebus = (unitId) => {
    setPreselectedUnitId(unitId);
    setActiveTab("tebus");
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

              {activeTab === 'tebus' && (
                <TebusView
                  units={units}
                  onNotify={handleNotify}
                  preselectedUnitId={preselectedUnitId}
                />
              )}

              {activeTab === 'perpanjang' && (
                <PerpanjangView
                  units={units}
                  onNotify={handleNotify}
                  preselectedUnitId={preselectedUnitId}
                  onSelectTab={setActiveTab}
                />
              )}

              {activeTab === 'lelang' && (
                <LelangView
                  units={units}
                  onNotify={handleNotify}
                />
              )}
            </main>

            {/* Fixed Bottom Navigation (5 Tab Bar) */}
            <BottomNav
              activeTab={activeTab}
              onChangeTab={(tabId) => {
                setPreselectedUnitId("");
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

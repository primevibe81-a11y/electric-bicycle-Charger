import React, { useRef, useEffect, useState } from 'react';
import { LayoutDashboard, Bike, Gavel, FileSpreadsheet } from 'lucide-react';
import { triggerHaptic } from '../services/animationHelpers';

export default function BottomNav({ activeTab, onChangeTab, queueCount = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: queueCount > 0 ? queueCount : null },
    { id: 'aktif', label: 'Aktif', icon: Bike },
    { id: 'lelang', label: 'Lelang', icon: Gavel },
    { id: 'laporan', label: 'Laporan', icon: FileSpreadsheet },
  ];

  // Badge pop animation tracker
  const prevBadgeRef = useRef(queueCount);
  const [badgePopping, setBadgePopping] = useState(false);

  useEffect(() => {
    if (queueCount !== prevBadgeRef.current) {
      prevBadgeRef.current = queueCount;
      setBadgePopping(true);
      const timer = setTimeout(() => setBadgePopping(false), 260);
      return () => clearTimeout(timer);
    }
  }, [queueCount]);

  const handleTabClick = (tabId) => {
    triggerHaptic('light');
    onChangeTab(tabId);
  };

  return (
    <nav
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-28px)] max-w-[390px] h-16 rounded-full px-2 flex items-center justify-around bg-white/75 backdrop-blur-xl border border-white/70 shadow-[0_10px_30px_rgba(2,132,199,0.14)] dark:bg-slate-900/80 dark:backdrop-blur-xl dark:border-slate-700/70 dark:shadow-[0_12px_35px_rgba(0,0,0,0.65)] select-none"
      role="navigation"
      aria-label="Navigasi Utama"
    >
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="pressable focus:outline-none flex items-center justify-center min-w-[56px] min-h-[44px]"
            aria-selected={isActive}
            aria-label={tab.label}
            title={tab.label}
          >
            <div
              className={`transition-all duration-200 flex flex-col items-center justify-center ${
                isActive
                  ? 'rounded-full bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300 px-3.5 py-1.5 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`transition-all ${
                    isActive
                      ? 'w-5 h-5 stroke-[2.2] text-sky-600 dark:text-sky-300'
                      : 'w-5 h-5 stroke-[1.6] text-slate-400 dark:text-slate-400'
                  }`}
                />

                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2.5 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 ${
                      badgePopping ? 'badge-pop' : ''
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label Teks selalu tampil pada SEMUA tab */}
              <span
                className={`text-[10px] font-medium leading-tight mt-0.5 tracking-tight ${
                  isActive
                    ? 'font-bold text-sky-700 dark:text-sky-200'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

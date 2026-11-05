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

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));

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
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-40 bg-white/95 backdrop-blur-lg border-t border-sky-100 safe-nav-bottom shadow-lg shadow-sky-900/10 select-none">
      <div className="grid grid-cols-4 h-16 items-center px-2 relative">
        {/* Satu elemen indikator pil biru yang meluncur (translateX) ke tab baru */}
        <div
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-2 w-[calc((100%-16px)/4)] pointer-events-none transition-transform duration-220 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform z-0 flex items-center justify-center pt-0.5"
          style={{
            transform: `translateX(${activeIndex * 100}%)`
          }}
        >
          <div className="w-12 h-8 rounded-xl bg-sky-100/90 shadow-2xs" />
        </div>

        {/* 4 Tombol Tab Navigation */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex flex-col items-center justify-center py-1 relative z-10 pressable focus:outline-none"
              aria-selected={isActive}
            >
              <div className="relative">
                <div className="p-1 rounded-xl flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive
                        ? "stroke-[2.5] text-sky-700 nav-icon-active"
                        : "stroke-[1.8] text-slate-400 hover:text-slate-600"
                    }`}
                  />
                </div>

                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white ${
                      badgePopping ? 'badge-pop' : ''
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] mt-0.5 tracking-tight transition-colors duration-150 ${
                  isActive ? "font-bold text-sky-800" : "font-medium text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

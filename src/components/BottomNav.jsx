import React from 'react';
import { LayoutDashboard, Bike, CheckCircle2, RefreshCw, Gavel } from 'lucide-react';

export default function BottomNav({ activeTab, onChangeTab, queueCount = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: queueCount > 0 ? queueCount : null },
    { id: 'aktif', label: 'Aktif', icon: Bike },
    { id: 'tebus', label: 'Tebus', icon: CheckCircle2 },
    { id: 'perpanjang', label: 'Perpanjang', icon: RefreshCw },
    { id: 'lelang', label: 'Lelang', icon: Gavel },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-40 bg-white/95 backdrop-blur-lg border-t border-sky-100 safe-nav-bottom shadow-lg shadow-sky-900/10">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 transition-all active:scale-90 relative ${
                isActive ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? "bg-sky-100 text-sky-700 shadow-xs" : ""
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? "font-bold text-sky-800" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

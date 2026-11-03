import React, { useState } from 'react';
import { RefreshCw, Sparkles, X, ArrowRight, Zap } from 'lucide-react';
import { applyPwaUpdate } from '../services/pwaUpdate';

export default function PwaUpdateNotification({ updateInfo, onClose }) {
  const [isDismissedToPill, setIsDismissedToPill] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  if (!updateInfo) return null;

  const handleRestart = async () => {
    setIsReloading(true);
    await applyPwaUpdate();
  };

  // Compact floating pill state when user taps "Nanti"
  if (isDismissedToPill) {
    return (
      <div className="fixed top-3 right-3 z-[60] animate-in slide-in-from-top-2 duration-200">
        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-[11px] rounded-full shadow-lg shadow-emerald-900/30 border border-emerald-400/40 active:scale-95 transition-transform"
          title="Ketuk untuk memuat ulang versi terbaru"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Update Siap (Restart)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-3 left-3 right-3 z-[60] animate-in slide-in-from-top-4 duration-300">
      <div className="max-w-[400px] mx-auto bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/90 text-white rounded-3xl p-4 shadow-2xl border-2 border-emerald-500/60 backdrop-blur-md relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black tracking-wide uppercase text-white">
                  Pembaruan Aplikasi Tersedia
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              </div>
              <p className="text-[11px] text-emerald-100 font-medium leading-tight mt-0.5">
                Versi baru telah di-deploy di cloud.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissedToPill(true)}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
            title="Tutup sementara"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 mt-2.5 leading-snug relative z-10">
          Muat ulang halaman sekarang untuk menerapkan fitur, pembaruan data, dan perbaikan sistem terbaru.
        </p>

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2 relative z-10">
          <button
            onClick={handleRestart}
            disabled={isReloading}
            className="flex-1 h-10 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            <span>{isReloading ? 'Memuat Ulang...' : 'Restart / Muat Ulang'}</span>
          </button>

          <button
            onClick={() => setIsDismissedToPill(true)}
            className="px-3 h-10 bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}

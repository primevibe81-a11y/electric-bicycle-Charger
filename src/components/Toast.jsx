import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Zap } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';
  const isInfo = toast.type === 'info';

  let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  let borderClass = "border-emerald-200 bg-white/95 text-slate-800";

  if (isWarning) {
    icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
    borderClass = "border-amber-200 bg-white/95 text-slate-800";
  } else if (isInfo) {
    icon = <Zap className="w-5 h-5 text-sky-500 shrink-0" />;
    borderClass = "border-sky-200 bg-white/95 text-slate-800";
  }

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-[400px] mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`p-3.5 rounded-2xl shadow-xl backdrop-blur-md border ${borderClass} flex items-start gap-3`}>
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 leading-tight">{toast.title || "Pemberitahuan"}</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-snug break-words">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import Icon, { ICON_REGISTRY } from './Icon';

/**
 * Bottom Sheet Legenda Ikon (Icon Legend)
 * Membantu petugas gudang mengenali arti setiap ikon minimalis di aplikasi,
 * termasuk pembeda bentuk ramah buta warna.
 */
export default function IconLegendSheet({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!isOpen) return null;

  const categories = [
    { id: 'ALL', label: 'Semua Ikon' },
    { id: 'baterai', label: 'Baterai & Kondisi' },
    { id: 'gudang', label: 'Gudang & Colokan' },
    { id: 'sistem', label: 'Sistem & Aksi' }
  ];

  const registryItems = Object.entries(ICON_REGISTRY).map(([key, val]) => ({
    key,
    ...val
  }));

  const filteredItems = registryItems.filter(item => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'baterai') return item.category === 'baterai' || item.category === 'kondisi' || item.category === 'waktu';
    if (selectedCategory === 'gudang') return item.category === 'gudang';
    if (selectedCategory === 'sistem') return item.category === 'sistem' || item.category === 'aksi';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] max-h-[85vh] bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle & Header */}
        <div className="p-4 pb-2 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  Legenda Ikon
                </h3>
                <p className="text-[11px] text-slate-500">
                  Panduan simbol minimalis & bentuk ramah buta warna
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Tutup Legenda Ikon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`pressable px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colorblind-Safe Callout Box */}
        <div className="mx-4 mt-3 p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-start gap-2">
          <div className="flex items-center gap-1 pt-0.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            <strong>Bentuk Pembeda:</strong> Status baterai tidak hanya dibedakan oleh warna, melainkan juga bentuk: <em>Centang</em> (Prima), <em>Segitiga</em> (Menurun), dan <em>Oktagon</em> (Rusak).
          </p>
        </div>

        {/* Scrollable Icon List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filteredItems.map(item => (
            <div
              key={item.key}
              className="flex items-start gap-3 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                <Icon name={item.key} size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {item.label}
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600 shrink-0">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 text-center">
          <p className="text-[11px] text-slate-500">
            💡 Tip: Sentuh & tahan ikon apa pun di aplikasi selama 0.5 detik untuk melihat namanya.
          </p>
        </div>
      </div>
    </div>
  );
}

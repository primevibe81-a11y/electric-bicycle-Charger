import React, { useState, useEffect } from 'react';
import { MapPin, X, History, Check, ChevronDown, ChevronUp, User } from 'lucide-react';
import { getPopularLocations } from '../services/storage';

export default function LetakUnitBottomSheet({
  unit,
  units = [],
  isOpen,
  onClose,
  onSave,
  currentPetugas = 'Admin'
}) {
  const [locationText, setLocationText] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (unit) {
      setLocationText(unit.lokasi || '');
      setShowHistory(false);
    }
  }, [unit]);

  if (!isOpen || !unit) return null;

  const currentTrimmed = (unit.lokasi || '').trim();
  const inputTrimmed = locationText.trim().replace(/\s+/g, ' ');
  const isUnchanged = inputTrimmed === currentTrimmed;

  // 5 saran lokasi paling sering digunakan dari populasi unit yang ada
  const suggestions = getPopularLocations(units, 5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isUnchanged) return;
    onSave(unit.id, inputTrimmed, currentPetugas);
    onClose();
  };

  const formatDateTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(Number(ts));
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ', ' + d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch {
      return '-';
    }
  };

  const historyList = Array.isArray(unit.riwayatLokasi) ? unit.riwayatLokasi : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
        {/* Drag Handle Indicator */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Letak Unit</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px] sm:max-w-xs mt-0.5">
                #{unit.kodeGadai} • {unit.merkSepeda}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Input Lokasi */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Lokasi Fisik di Gudang
              </label>
              <span className={`text-[11px] font-mono ${locationText.length >= 55 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {locationText.length}/60
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={60}
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Contoh: Rak B2, lantai 2"
                className="w-full h-11 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                autoFocus
              />
              {locationText && (
                <button
                  type="button"
                  onClick={() => setLocationText('')}
                  className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg"
                  aria-label="Hapus teks"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chip Saran Cepat (Top 5 Sering Digunakan) */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] text-slate-500 font-medium block">
                Saran Letak Sering Digunakan:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLocationText(s)}
                    className="pressable px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info Terakhir Diubah & Tombol Riwayat */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px]">Terakhir diubah:</span>
              <span className="text-[11px] font-semibold text-slate-800 text-right">
                {unit.lokasiUpdatedAt
                  ? `${formatDateTime(unit.lokasiUpdatedAt)} oleh ${unit.lokasiUpdatedBy || 'Petugas'}`
                  : 'Belum pernah diubah'}
              </span>
            </div>

            {historyList.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{showHistory ? 'Sembunyikan Riwayat' : `Lihat Riwayat (${historyList.length})`}</span>
                  {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 animate-in fade-in duration-150">
                    {historyList.slice(0, 5).map((h, i) => (
                      <div key={i} className="text-[11px] bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>{formatDateTime(h.timestamp)}</span>
                          <span className="font-medium text-slate-600 flex items-center gap-0.5">
                            <User className="w-3 h-3" />
                            {h.petugas || 'Admin'}
                          </span>
                        </div>
                        <div className="text-slate-700 font-medium">
                          <span className="text-slate-400 line-through mr-1">
                            {h.lokasiLama ? h.lokasiLama : '(Kosong)'}
                          </span>
                          <span className="text-slate-400">→</span>{' '}
                          <span className="text-sky-700 font-bold">{h.lokasiBaru || '(Dikosongkan)'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Aksi Batal & Simpan (44px) */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="pressable flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUnchanged}
              className={`pressable flex-1 h-11 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                isUnchanged
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-100'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

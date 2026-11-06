import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Save, CheckCircle2 } from 'lucide-react';
import { BATTERY_CONDITIONS } from '../services/chargerQueue';
import { updateBatteryAudit } from '../services/storage';

export default function AuditBatteryModal({ unit, onClose, onNotify }) {
  const [kondisi, setKondisi] = useState(unit?.kondisiBaterai || 'PRIMA');
  const [catatan, setCatatan] = useState(unit?.catatanBaterai || '');

  if (!unit) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = updateBatteryAudit(unit.id, kondisi, catatan);
    if (res.success) {
      onNotify({
        title: "Audit Baterai Disimpan",
        message: `Kondisi baterai unit #${unit.kodeGadai} berhasil diperbarui menjadi ${BATTERY_CONDITIONS[kondisi]?.label}.`,
        type: "success"
      });
      onClose();
    } else {
      onNotify({
        title: "Gagal Simpan",
        message: res.message,
        type: "warning"
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="w-full max-w-[380px] bg-white dark:bg-[#151C28] text-slate-900 dark:text-slate-100 rounded-3xl p-5 shadow-2xl border border-sky-100 dark:border-[#232F42] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">Audit Kondisi Baterai</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Unit #{unit.kodeGadai} • {unit.merkSepeda}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Status Kesehatan & Fisik Baterai
            </label>
            <div className="space-y-1.5">
              {Object.values(BATTERY_CONDITIONS).map((cond) => {
                const isSelected = kondisi === cond.id;
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setKondisi(cond.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 shadow-xs ring-1 ring-sky-400"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111722] hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{cond.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{cond.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Audit Fisik / Kerusakan (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Baterai 48V, soket agak longgar, kabel adaptor ada isolasi."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 dark:shadow-none flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Audit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

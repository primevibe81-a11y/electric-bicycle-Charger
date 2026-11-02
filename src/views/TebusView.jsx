import React, { useState } from 'react';
import {
  CheckCircle2,
  Search,
  AlertTriangle,
  History,
  Bike,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  ZapOff
} from 'lucide-react';
import { redeemGadaiUnit } from '../services/storage';

export default function TebusView({ units, onNotify, preselectedUnitId }) {
  const [selectedUnitId, setSelectedUnitId] = useState(preselectedUnitId || "");
  const [notes, setNotes] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const activeUnits = units.filter(u => u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG');
  const redeemedUnits = units.filter(u => u.statusBarang === 'DITEBUS');

  const selectedUnit = activeUnits.find(u => u.id === selectedUnitId);

  const handleRedeemSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnit) {
      onNotify({ title: "Pilih Unit", message: "Silakan pilih unit yang akan ditebus.", type: "warning" });
      return;
    }

    if (window.confirm(`Konfirmasi pelunasan & penebusan unit #${selectedUnit.kodeGadai} (${selectedUnit.merkSepeda})?`)) {
      const res = redeemGadaiUnit(selectedUnit.id, notes);
      if (res.success) {
        setSelectedUnitId("");
        setNotes("");
        onNotify({
          title: "Penebusan Berhasil",
          message: res.message,
          type: "success"
        });
      } else {
        onNotify({
          title: "Gagal Penebusan",
          message: res.message,
          type: "warning"
        });
      }
    }
  };

  const filteredHistory = redeemedUnits.filter(u => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.kodeGadai.toLowerCase().includes(q) ||
      u.namaNasabah.toLowerCase().includes(q) ||
      u.merkSepeda.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h2 className="text-base font-extrabold text-slate-900">Proses Penebusan Unit</h2>
        <p className="text-xs text-slate-500">Pelunasan gadai & pengeluaran unit dari sistem</p>
      </div>

      {/* FORM PENEBUSAN */}
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-100">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Formulir Tebus Nasabah</h3>
            <p className="text-[11px] text-slate-400">Pilih nomor gadai aktif yang akan ditebus</p>
          </div>
        </div>

        <form onSubmit={handleRedeemSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Unit Gadai
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Pilih Nomor Bukti Gadai --</option>
              {activeUnits.map(u => (
                <option key={u.id} value={u.id}>
                  #{u.kodeGadai} - {u.merkSepeda} ({u.namaNasabah})
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Detail Sepeda</span>
                  <p className="text-sm font-bold text-slate-800">{selectedUnit.merkSepeda}</p>
                  <p className="text-xs text-slate-500">Nasabah: {selectedUnit.namaNasabah}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                  <p className="text-xs font-extrabold text-sky-700">{selectedUnit.statusBarang}</p>
                  <p className="text-[11px] text-slate-500">Baterai: {selectedUnit.batteryLevel}%</p>
                </div>
              </div>

              {/* Warning if unit is currently in charger or queue */}
              {(selectedUnit.statusCharger === 'CHARGING' || selectedUnit.statusCharger === 'WAITING') && (
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                  <ZapOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Unit ini sedang {selectedUnit.statusCharger === 'CHARGING' ? 'di-charge' : 'dalam antrian'}. Sistem akan otomatis mengeluarkannya!
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Pelunasan / Kuitansi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Lunas via Transfer BCA / Kuitansi No. 102"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={!selectedUnit}
              className={`w-full h-12 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                selectedUnit
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi & Selesaikan Penebusan</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIWAYAT PENEBUSAN */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Riwayat Unit Ditebus ({redeemedUnits.length})
            </h3>
          </div>
        </div>

        {/* Search Riwayat */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Cari riwayat tebus..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="bg-white/70 rounded-2xl p-4 text-center text-xs text-slate-400">
              Belum ada riwayat unit yang ditebus.
            </div>
          ) : (
            filteredHistory.map((unit) => {
              const redeemedDate = unit.redeemedAt
                ? new Date(unit.redeemedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : "-";

              return (
                <div
                  key={unit.id}
                  className="bg-white/80 rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        #{unit.kodeGadai}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                        Ditebus
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {unit.merkSepeda} • {unit.namaNasabah}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Waktu tebus: {redeemedDate}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-medium text-slate-500 max-w-[120px] block truncate">
                      {unit.notes || "Lunas"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

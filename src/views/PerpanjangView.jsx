import React, { useState } from 'react';
import {
  RefreshCw,
  Calendar,
  AlertCircle,
  History,
  CheckCircle2,
  Bike,
  User,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';
import { extendGadaiUnit } from '../services/storage';

export default function PerpanjangView({ units, onNotify, preselectedUnitId, onSelectTab }) {
  const [selectedUnitId, setSelectedUnitId] = useState(preselectedUnitId || "");
  const [newKodeGadai, setNewKodeGadai] = useState("");
  const [extensionDays, setExtensionDays] = useState("30");

  const activeUnits = units.filter(u => u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG');
  const selectedUnit = activeUnits.find(u => u.id === selectedUnitId);

  const handleExtendSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnit) {
      onNotify({ title: "Pilih Unit", message: "Silakan pilih unit yang ingin diperpanjang.", type: "warning" });
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(newKodeGadai.trim())) {
      onNotify({
        title: "Nomor Baru Tidak Valid",
        message: "Nomor gadai baru wajib berupa karakter alfanumerik (contoh: 26_0037861).",
        type: "warning"
      });
      return;
    }

    if (newKodeGadai.trim() === selectedUnit.kodeGadai) {
      onNotify({
        title: "Nomor Gadai Sama",
        message: "Nomor gadai baru harus berbeda dari nomor sebelumnya.",
        type: "warning"
      });
      return;
    }

    const newJatuhTempoAt = Date.now() + Number(extensionDays) * 24 * 60 * 60 * 1000;
    const res = extendGadaiUnit(selectedUnit.id, newKodeGadai, newJatuhTempoAt);

    if (res.success) {
      onNotify({
        title: "Perpanjangan Berhasil!",
        message: res.message,
        type: "success"
      });
      setSelectedUnitId("");
      setNewKodeGadai("");
    } else {
      onNotify({
        title: "Gagal Memperpanjang",
        message: res.message,
        type: "warning"
      });
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h2 className="text-base font-extrabold text-slate-900">Perpanjangan Masa Gadai</h2>
        <p className="text-xs text-slate-500">Mutasi kode bukti gadai & perpanjangan jatuh tempo</p>
      </div>

      {/* Info Callout */}
      <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 text-xs text-sky-800 flex items-start gap-2">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong>Sinkronisasi Real-Time:</strong> Jika unit sedang berada di slot charger atau antrian tunggu, nomor gadai pada kartu Dashboard akan langsung diperbarui ke nomor baru tanpa mengulang hitung mundur timer!
        </div>
      </div>

      {/* FORM PERPANJANGAN */}
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-100">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Form Mutasi Nomor Gadai</h3>
            <p className="text-[11px] text-slate-400">Ganti nomor lama ke akad baru</p>
          </div>
        </div>

        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Nomor Gadai Lama
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Pilih Unit yang Diperpanjang --</option>
              {activeUnits.map(u => (
                <option key={u.id} value={u.id}>
                  #{u.kodeGadai} - {u.merkSepeda} ({u.namaNasabah})
                </option>
              ))}
            </select>
          </div>

          {selectedUnit && (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Nomor Aktif Saat Ini</span>
                  <p className="text-base font-black text-amber-950">#{selectedUnit.kodeGadai}</p>
                  <p className="text-xs text-amber-900 font-medium">{selectedUnit.merkSepeda} • {selectedUnit.namaNasabah}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Jatuh Tempo Lama</span>
                  <p className="text-xs font-bold text-amber-900">
                    {new Date(selectedUnit.jatuhTempoAt).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>

              {selectedUnit.statusCharger !== 'IDLE' && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700 bg-sky-100/70 p-2 rounded-xl">
                  <Zap className="w-3.5 h-3.5 fill-sky-600" />
                  <span>
                    Unit ini sedang {selectedUnit.statusCharger === 'CHARGING' ? 'di-charge' : 'dalam antrian'}. Nomor pada kartu Dashboard akan langsung tersinkronkan!
                  </span>
                </div>
              )}

              {Array.isArray(selectedUnit.riwayatKodeGadai) && selectedUnit.riwayatKodeGadai.length > 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <History className="w-3 h-3 text-slate-400" />
                  <span>Riwayat Nomor Sebelumnya: {selectedUnit.riwayatKodeGadai.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor Gadai Baru (Kode Unik / Akad)
            </label>
            <input
              type="text"
              required
              value={newKodeGadai}
              onChange={(e) => setNewKodeGadai(e.target.value.replace(/[^\w-]/g, ''))}
              placeholder="Contoh: 26_0037899"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Nomor baru akan menggantikan nomor lama, dan nomor lama otomatis disimpan ke riwayat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Perpanjangan Durasi Jatuh Tempo
            </label>
            <select
              value={extensionDays}
              onChange={(e) => setExtensionDays(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="15">+15 Hari</option>
              <option value="30">+30 Hari (1 Bulan Standar)</option>
              <option value="60">+60 Hari (2 Bulan)</option>
              <option value="90">+90 Hari (3 Bulan)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedUnit || !newKodeGadai}
              className={`w-full h-12 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                selectedUnit && newKodeGadai
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Perpanjangan & Mutasi Nomor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

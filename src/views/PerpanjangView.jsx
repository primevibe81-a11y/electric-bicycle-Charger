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
  Info,
  Search,
  X,
  FileText,
  Sparkles
} from 'lucide-react';
import { extendGadaiUnit, normalizeHistoryEntry } from '../services/storage';
import RiwayatPerpanjanganCard from '../components/RiwayatPerpanjanganCard';

export default function PerpanjangView({ units, onNotify, preselectedUnitId, onSelectTab }) {
  const [selectedUnitId, setSelectedUnitId] = useState(preselectedUnitId || "");
  const [newKodeGadai, setNewKodeGadai] = useState("");
  const [extensionDays, setExtensionDays] = useState("30");
  const [catatanPerpanjangan, setCatatanPerpanjangan] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("form"); // 'form' | 'history'
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");

  const activeUnits = units.filter(u => u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG');
  const selectedUnit = activeUnits.find(u => u.id === selectedUnitId);

  // Filter unit yang memiliki riwayat perpanjangan (pernah mutasi nomor gadai)
  const unitsWithHistory = units.filter(
    u => Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.length > 0
  );

  const q = searchHistoryQuery.toLowerCase().trim();
  const filteredHistoryUnits = unitsWithHistory.filter(u => {
    if (!q) return true;
    const matchCurrent =
      u.kodeGadai.toLowerCase().includes(q) ||
      u.merkSepeda.toLowerCase().includes(q) ||
      u.namaNasabah.toLowerCase().includes(q);

    const matchOldCodes = u.riwayatKodeGadai.some(entry => {
      const norm = normalizeHistoryEntry(entry);
      return (
        norm.kodeGadaiLama.toLowerCase().includes(q) ||
        norm.catatanLama.toLowerCase().includes(q)
      );
    });

    return matchCurrent || matchOldCodes;
  });

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
    const res = extendGadaiUnit(selectedUnit.id, newKodeGadai, newJatuhTempoAt, catatanPerpanjangan);

    if (res.success) {
      onNotify({
        title: "Perpanjangan Berhasil!",
        message: res.message,
        type: "success"
      });
      setSelectedUnitId("");
      setNewKodeGadai("");
      setCatatanPerpanjangan("");
      setActiveSubTab("history"); // Bawa ke tab riwayat untuk melihat card mutasi
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
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900">Perpanjangan Masa Gadai</h2>
        <p className="text-xs text-slate-500">Mutasi nomor bukti gadai & pencatatan riwayat barang</p>
      </div>

      {/* Sub-Tabs: Form Mutasi vs Riwayat Perpanjang */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-2xl">
        <button
          onClick={() => setActiveSubTab("form")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "form"
              ? "bg-white text-amber-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RefreshCw className="w-4 h-4 text-amber-600" />
          <span>Form Mutasi</span>
        </button>

        <button
          onClick={() => setActiveSubTab("history")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "history"
              ? "bg-white text-amber-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="w-4 h-4 text-amber-600" />
          <span>Riwayat Barang ({unitsWithHistory.length})</span>
        </button>
      </div>

      {/* TAMPILAN 1: FORM PERPANJANGAN */}
      {activeSubTab === "form" ? (
        <div className="space-y-4">
          {/* Info Callout */}
          <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 text-xs text-sky-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Sinkronisasi Real-Time:</strong> Jika unit sedang berada di slot charger atau antrian tunggu, nomor gadai pada kartu Dashboard akan langsung diperbarui ke nomor baru tanpa mengulang hitung mundur timer!
            </div>
          </div>

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
                      <p className="text-base font-black text-amber-950 font-mono">#{selectedUnit.kodeGadai}</p>
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
                    <div className="text-[11px] text-slate-600 flex items-center gap-1 bg-white/70 p-2 rounded-xl border border-amber-200/50">
                      <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Pernah diperpanjang dari: <strong>
                          {selectedUnit.riwayatKodeGadai.map(e => typeof e === 'object' ? e.kodeGadaiLama : e).join(', ')}
                        </strong>
                      </span>
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
                  placeholder="Contoh: 26_0038119"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nomor baru akan menggantikan nomor lama, dan nomor lama otomatis disimpan ke riwayat barang.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Fisik / Baterai Saat Perpanjangan (Opsional)
                </label>
                <input
                  type="text"
                  value={catatanPerpanjangan}
                  onChange={(e) => setCatatanPerpanjangan(e.target.value)}
                  placeholder="Contoh: Baterai 100%, soket charger normal, body lecet pemakaian..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Catatan ini akan tersimpan permanen di kartu riwayat agar admin gudang dapat melacak kondisi riil barang sebelumnya.
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
                  <span>Simpan Perpanjangan & Rekam Riwayat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* TAMPILAN 2: RIWAYAT PERPANJANGAN & MUTASI BARANG */
        <div className="space-y-3">
          {/* Search Box Riwayat */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchHistoryQuery}
              onChange={(e) => setSearchHistoryQuery(e.target.value)}
              placeholder="Cari nomor gadai saat ini / nomor lama / nama nasabah..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchHistoryQuery && (
              <button
                onClick={() => setSearchHistoryQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Indikator Hasil Pencarian */}
          {searchHistoryQuery && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
              <span>
                Hasil pencarian "<strong>{searchHistoryQuery}</strong>":{" "}
                <strong className="text-amber-700 font-bold">{filteredHistoryUnits.length} unit</strong>
              </span>
              <button
                onClick={() => setSearchHistoryQuery("")}
                className="text-amber-600 hover:text-amber-800 font-bold text-xs"
              >
                Reset
              </button>
            </div>
          )}

          {/* Daftar Card Detail Riwayat */}
          {unitsWithHistory.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-6 text-center text-xs text-slate-400 border border-slate-200 space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Belum ada unit sepeda listrik yang pernah mengalami mutasi perpanjangan nomor gadai.</p>
            </div>
          ) : filteredHistoryUnits.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-6 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
              <p>Tidak ditemukan riwayat mutasi dengan kata kunci "<strong>{searchHistoryQuery}</strong>".</p>
              <button
                onClick={() => setSearchHistoryQuery("")}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100"
              >
                Tampilkan Semua ({unitsWithHistory.length} Unit)
              </button>
            </div>
          ) : (
            filteredHistoryUnits.map((u) => (
              <RiwayatPerpanjanganCard key={u.id} unit={u} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

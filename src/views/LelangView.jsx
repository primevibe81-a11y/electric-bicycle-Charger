import React, { useState } from 'react';
import {
  Gavel,
  Zap,
  Tag,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  X,
  FileText,
  PackageCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import { enqueueUnitForCharging, markLelangSold } from '../services/storage';
import { getDaysSinceLastCharge } from '../services/chargerQueue';

export default function LelangView({ units, onNotify }) {
  const [selectedUnitForSale, setSelectedUnitForSale] = useState(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [buyerInfo, setBuyerInfo] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("available"); // 'available' | 'sold'
  const [searchQuery, setSearchQuery] = useState("");

  const lelangUnits = units.filter(u => u.statusBarang === 'LELANG');
  const soldUnits = units.filter(u => u.statusBarang === 'TERJUAL_LELANG');

  const q = searchQuery.toLowerCase().trim();

  // Filter pencarian untuk tab Siap Lelang
  const filteredLelangUnits = lelangUnits.filter(u => {
    if (!q) return true;
    return (
      (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
      (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
      (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
      (u.catatanBaterai && u.catatanBaterai.toLowerCase().includes(q))
    );
  });

  // Filter pencarian untuk tab Riwayat Terjual
  const filteredSoldUnits = soldUnits.filter(u => {
    if (!q) return true;
    return (
      (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
      (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
      (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
      (u.buyerInfo && u.buyerInfo.toLowerCase().includes(q))
    );
  });

  const handleChargeLelangUnit = (unit) => {
    const res = enqueueUnitForCharging(unit.id, unit.batteryLevel);
    if (res.success) {
      onNotify({
        title: "Perawatan Baterai Lelang",
        message: `Unit lelang #${unit.kodeGadai} berhasil masuk antrian charger!`,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Masuk Antrian",
        message: res.message,
        type: "warning"
      });
    }
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitForSale) return;

    const res = markLelangSold(selectedUnitForSale.id, soldPrice, buyerInfo);
    if (res.success) {
      setSelectedUnitForSale(null);
      setSoldPrice("");
      setBuyerInfo("");
      onNotify({
        title: "Lelang Terjual!",
        message: res.message,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Mencatat",
        message: res.message,
        type: "warning"
      });
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. HEADER HALAMAN RINGKAS */}
      <div className="pt-0.5">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
          Manajemen Unit Lelang
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Perawatan baterai &amp; pencatatan transaksi unit jatuh tempo
        </p>
      </div>

      {/* 2. STICKY SEGMENTED TABS & SEARCH BAR */}
      <div className="sticky -top-3 z-20 -mx-4 px-4 pt-2 pb-2 bg-[#F0F9FF]/95 backdrop-blur-md border-b border-sky-100/80 shadow-xs space-y-2">
        {/* Segmented Tabs: Siap Lelang vs Terjual */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
          <button
            onClick={() => setActiveSubTab("available")}
            className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === "available"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Gavel className="w-3.5 h-3.5 text-purple-600" />
            <span>Siap Lelang ({lelangUnits.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("sold")}
            className={`h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === "sold"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terjual ({soldUnits.length})</span>
          </button>
        </div>

        {/* Input Pencarian Menu Lelang */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari akad / merk / nasabah"
            className="w-full h-11 pl-10 pr-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. KONTEN TAB SIAP LELANG VS TERJUAL */}
      {activeSubTab === "available" ? (
        <div className="space-y-3 pt-1">
          {lelangUnits.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
              Tidak ada unit sepeda listrik yang berada dalam daftar lelang.
            </div>
          ) : filteredLelangUnits.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
              <p>Tidak ditemukan unit lelang dengan kata kunci "<strong>{searchQuery}</strong>".</p>
              <button
                onClick={() => setSearchQuery("")}
                className="h-9 px-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs hover:bg-purple-100"
              >
                Tampilkan Semua ({lelangUnits.length} Unit)
              </button>
            </div>
          ) : (
            filteredLelangUnits.map((unit) => {
              const isCharging = unit.statusCharger === 'CHARGING';
              const isWaiting = unit.statusCharger === 'WAITING';
              const fallbackMasuk = unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
              const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, fallbackMasuk);
              const isCriticalOverdue = daysAgo >= 15;

              return (
                <div
                  key={unit.id}
                  className={`bg-white rounded-2xl p-3.5 border transition-all shadow-xs ${
                    isCriticalOverdue
                      ? 'border-slate-200 border-l-4 border-l-rose-500'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* BARIS 1: Nomor Akad (kiri) + Badge Baterai % (kanan) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-slate-900 font-mono tracking-tight">
                      #{unit.kodeGadai}
                    </span>
                    <BatteryIndicator level={unit.batteryLevel} isCharging={isCharging} size="sm" />
                  </div>

                  {/* BARIS 2: Nama Unit & Nasabah Asal (1 Blok, Ellipsis) */}
                  <div className="pt-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-slate-900 truncate leading-snug">
                      {unit.merkSepeda}
                    </h4>
                    <p className="text-[12px] text-slate-500 truncate leading-tight mt-0.5">
                      Nasabah asal: {unit.namaNasabah}
                    </p>
                  </div>

                  {/* BARIS 3: Badges Kondisi & Antrian Charge */}
                  <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                    <BatteryConditionBadge condition={unit.kondisiBaterai || 'PRIMA'} size="sm" />

                    {isCharging && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-sky-600" /> Di-Charge
                      </span>
                    )}

                    {isWaiting && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Antrian Charge
                      </span>
                    )}
                  </div>

                  {/* BARIS 4: Meta Waktu Charge (Satu Sinyal Kritis Bersih, Kontras WCAG AA) */}
                  <div className="pt-2 flex items-center gap-1.5 text-[12px] flex-wrap">
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${isCriticalOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className={isCriticalOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                      Charge {daysAgo === 0 ? 'hari ini' : `${daysAgo} hari lalu`}
                      {isCriticalOverdue && ` (${daysAgo} hari tidak di-charge)`}
                    </span>
                  </div>

                  {/* BARIS 5: Estimasi Nilai Lelang */}
                  <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Estimasi Nilai Lelang:</span>
                    <span className="font-extrabold text-purple-700 font-mono text-sm">
                      {formatRupiah(unit.hargaLelang || 2500000)}
                    </span>
                  </div>

                  {/* BARIS 6: Aksi Kartu (Antrikan Charge & Catat Terjual dengan Touch Target 44px) */}
                  <div className="pt-2.5 flex items-center gap-2">
                    {/* Status / Tombol Antrian Charge */}
                    {isWaiting ? (
                      <div className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Dalam Antrian Charge</span>
                      </div>
                    ) : isCharging ? (
                      <div className="h-11 px-3 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-sky-200 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-sky-600" />
                        <span>Sedang Di-charge</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleChargeLelangUnit(unit)}
                        className="h-11 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
                        title="Masukkan unit lelang ke antrian charger"
                      >
                        <Zap className="w-3.5 h-3.5 text-sky-600" />
                        <span>Antrikan Charge</span>
                      </button>
                    )}

                    {/* Tombol Utama: Catat Terjual (Wajib Membuka Bottom Sheet Konfirmasi) */}
                    <button
                      onClick={() => {
                        setSelectedUnitForSale(unit);
                        setSoldPrice(String(unit.hargaLelang || 2500000));
                        setBuyerInfo("");
                      }}
                      className="h-11 flex-1 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Catat Terjual</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TAB RIWAYAT TERJUAL LELANG */
        <div className="space-y-2.5 pt-1">
          {soldUnits.length === 0 ? (
            /* Empty State Informatif untuk Tab Terjual (0) */
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum ada unit terjual</h3>
              <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                Unit lelang yang berhasil terjual akan tercatat di sini beserta data pembeli dan nominal penjualan.
              </p>
            </div>
          ) : filteredSoldUnits.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
              <p>Tidak ditemukan riwayat lelang dengan kata kunci "<strong>{searchQuery}</strong>".</p>
              <button
                onClick={() => setSearchQuery("")}
                className="h-9 px-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs hover:bg-purple-100"
              >
                Tampilkan Semua ({soldUnits.length} Unit)
              </button>
            </div>
          ) : (
            filteredSoldUnits.map((unit) => {
              const soldDate = unit.soldAt
                ? new Date(unit.soldAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : "-";

              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        #{unit.kodeGadai}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Terjual
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                      {unit.merkSepeda}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Pembeli: {unit.buyerInfo || "-"} • {soldDate}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-600 font-mono block">
                      {formatRupiah(unit.soldPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Laku Terjual</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. BOTTOM SHEET KONFIRMASI CATAT TERJUAL LELANG */}
      {selectedUnitForSale && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Konfirmasi Penjualan Lelang</h3>
                  <p className="text-xs text-slate-500">
                    Unit #{selectedUnitForSale.kodeGadai} • {selectedUnitForSale.merkSepeda}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitForSale(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-3 pt-1">
              {/* Ringkasan Singkat Unit */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Nasabah Asal:</span>
                  <span className="font-semibold text-slate-800">{selectedUnitForSale.namaNasabah}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimasi Awal:</span>
                  <span className="font-semibold text-purple-700">
                    {formatRupiah(selectedUnitForSale.hargaLelang || 2500000)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Laku Terjual (Rp)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="Contoh: 2800000"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pembeli &amp; Nomor Kuitansi
                </label>
                <input
                  type="text"
                  required
                  value={buyerInfo}
                  onChange={(e) => setBuyerInfo(e.target.value)}
                  placeholder="Contoh: Pak Herman (0812xxxx) / Kuitansi L-09"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2 text-xs text-purple-900">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">
                  Aksi ini bersifat final: unit akan dipindahkan ke tab <strong>Terjual</strong> dan dilepas dari daftar siap lelang.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnitForSale(null)}
                  className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
                >
                  Konfirmasi Terjual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

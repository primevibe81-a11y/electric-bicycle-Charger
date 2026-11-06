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
  Info,
  MapPin,
  SlidersHorizontal,
  ArrowUpDown,
  Coins
} from 'lucide-react';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import LetakUnitBottomSheet from '../components/LetakUnitBottomSheet';
import { enqueueUnitForCharging, markLelangSold, updateUnitLocation } from '../services/storage';
import { getDaysSinceLastCharge } from '../services/chargerQueue';
import { triggerHaptic } from '../services/animationHelpers';

export default function LelangView({ units, onNotify }) {
  const [selectedUnitForSale, setSelectedUnitForSale] = useState(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [buyerInfo, setBuyerInfo] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("available"); // 'available' | 'sold'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'NO_LOCATION'
  const [sortBy, setSortBy] = useState("DEFAULT"); // 'DEFAULT' | 'LOKASI_AZ'
  const [editLokasiUnit, setEditLokasiUnit] = useState(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState(null);
  const [chargingSuccessUnitId, setChargingSuccessUnitId] = useState(null);
  const [removingUnitId, setRemovingUnitId] = useState(null);

  const lelangUnits = units.filter(u => u.statusBarang === 'LELANG');
  const soldUnits = units.filter(u => u.statusBarang === 'TERJUAL_LELANG');
  const noLocationCount = lelangUnits.filter(u => !u.lokasi || !u.lokasi.trim()).length;

  const q = searchQuery.toLowerCase().trim();

  // Filter pencarian & tipe untuk tab Siap Lelang
  let filteredLelangUnits = lelangUnits.filter(u => {
    if (filterType === 'NO_LOCATION' && u.lokasi && u.lokasi.trim()) {
      return false;
    }
    if (!q) return true;
    return (
      (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
      (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
      (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
      (u.catatanBaterai && u.catatanBaterai.toLowerCase().includes(q)) ||
      (u.lokasi && u.lokasi.toLowerCase().includes(q))
    );
  });

  if (sortBy === 'LOKASI_AZ') {
    filteredLelangUnits = [...filteredLelangUnits].sort((a, b) => {
      const locA = (a.lokasi || '').trim().toLowerCase();
      const locB = (b.lokasi || '').trim().toLowerCase();
      if (!locA && locB) return 1;
      if (locA && !locB) return -1;
      return locA.localeCompare(locB);
    });
  }

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
      triggerHaptic('success');
      setChargingSuccessUnitId(unit.id);
      setTimeout(() => setChargingSuccessUnitId(null), 1200);
      onNotify({
        title: "Perawatan Baterai Lelang",
        message: `Unit lelang #${unit.kodeGadai} berhasil masuk antrian charger!`,
        type: "success"
      });
    } else {
      triggerHaptic('medium');
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

    const unitToSell = selectedUnitForSale;
    setRemovingUnitId(unitToSell.id);
    setSelectedUnitForSale(null);

    setTimeout(() => {
      const res = markLelangSold(unitToSell.id, soldPrice, buyerInfo);
      setRemovingUnitId(null);
      setSoldPrice("");
      setBuyerInfo("");
      if (res.success) {
        triggerHaptic('success');
        onNotify({
          title: "Lelang Terjual!",
          message: res.message,
          type: "success"
        });
      } else {
        triggerHaptic('medium');
        onNotify({
          title: "Gagal Mencatat",
          message: res.message,
          type: "warning"
        });
      }
    }, 200);
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

      {/* 2. STICKY SEGMENTED TABS & SEARCH BAR (Solid Background, Bebas Blur GPU iOS) */}
      <div className="sticky -top-3 z-20 -mx-4 px-4 pt-2 pb-2 bg-[#F0F9FF] border-b border-sky-100 shadow-xs space-y-2">
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
            placeholder="Cari..."
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

        {/* Chip Filter Cepat & Sortir Lokasi (Hanya di Tab Siap Lelang) */}
        {activeSubTab === "available" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-0.5">
            <button
              onClick={() => setFilterType("ALL")}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 pressable ${
                filterType === "ALL"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>Semua ({lelangUnits.length})</span>
            </button>

            <button
              onClick={() => setFilterType(filterType === "NO_LOCATION" ? "ALL" : "NO_LOCATION")}
              className={`h-8 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 pressable ${
                filterType === "NO_LOCATION"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              title="Belum Ada Letak"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanpa Letak ({noLocationCount})</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

            <button
              onClick={() => setSortBy(sortBy === "LOKASI_AZ" ? "DEFAULT" : "LOKASI_AZ")}
              className={`h-8 px-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 pressable ${
                sortBy === "LOKASI_AZ"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              title="Urutkan letak gudang A-Z"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy === "LOKASI_AZ" ? "Lokasi A-Z" : "Sortir"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. KONTEN TAB SIAP LELANG VS TERJUAL */}
      {activeSubTab === "available" ? (
        <div className="space-y-2.5 pt-1">
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
            filteredLelangUnits.map((unit, index) => {
              const isCharging = unit.statusCharger === 'CHARGING';
              const isWaiting = unit.statusCharger === 'WAITING';
              const fallbackMasuk = unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
              const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, fallbackMasuk);
              const isCriticalOverdue = daysAgo >= 15;

              return (
                <div
                  key={unit.id}
                  className={`bg-white rounded-2xl p-3 border transition-colors shadow-xs pressable-card unit-card-optimized ${
                    removingUnitId === unit.id ? 'opacity-0 scale-95 transition-opacity duration-200 pointer-events-none' : ''
                  } ${
                    highlightedUnitId === unit.id ? 'animate-highlight border-purple-400 ring-2 ring-purple-200' : ''
                  } ${
                    isCriticalOverdue
                      ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 animate-critical-pulse'
                      : 'border-slate-200/90 dark:border-[#232F42]'
                  } bg-white dark:bg-[#151C28]`}
                >
                  {/* BARIS 1: Nomor Akad (kiri) + Badge Baterai (kanan) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                      #{unit.kodeGadai}
                    </span>
                    <BatteryIndicator level={unit.batteryLevel} isCharging={isCharging} size="sm" />
                  </div>

                  {/* BARIS 2: Nama Unit & Nasabah Asal (1 baris, ellipsis) */}
                  <div className="pt-1 min-w-0">
                    <p className="text-[13px] text-slate-800 dark:text-slate-200 truncate leading-snug">
                      <span className="font-semibold text-slate-900 dark:text-white">{unit.merkSepeda}</span>
                      <span className="text-slate-400 dark:text-slate-600 mx-1.5">•</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[12px]">Nasabah asal: {unit.namaNasabah}</span>
                    </p>
                  </div>

                  {/* BARIS 3: Meta Ikon + Nilai Estimasi + Tombol Aksi */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 mt-1.5">
                    {/* Sisi Kiri: Meta Info & Nilai Koin */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      {/* Letak Gudang (Ikon Pin + Teks; jika kosong ikon pudar tanpa teks) */}
                      <button
                        type="button"
                        onClick={() => setEditLokasiUnit(unit)}
                        className={`pressable flex items-center gap-1 text-[11px] truncate ${
                          highlightedUnitId === unit.id ? 'animate-highlight' : ''
                        }`}
                        title={unit.lokasi ? `Letak di gudang: ${unit.lokasi}` : 'Ketuk untuk isi letak di gudang'}
                        aria-label="Letak unit di gudang"
                      >
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${unit.lokasi ? 'text-purple-600 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`} />
                        {unit.lokasi && (
                          <span className="truncate max-w-[80px] font-medium text-slate-700 dark:text-slate-300">
                            {unit.lokasi}
                          </span>
                        )}
                      </button>

                      {/* Waktu Terakhir Charge */}
                      <span
                        className={`flex items-center gap-1 text-[11px] font-mono tabular-nums ${
                          isCriticalOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
                        }`}
                        title={`Charge ${daysAgo === 0 ? 'hari ini' : `${daysAgo} hari lalu`}`}
                      >
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isCriticalOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                        <span>{daysAgo === 0 ? 'Hari ini' : `${daysAgo}h lalu`}</span>
                      </span>

                      {/* Kondisi Baterai (Bentuk Pembeda Ramah Buta Warna) */}
                      <BatteryConditionBadge condition={unit.kondisiBaterai || 'PRIMA'} size="xs" />

                      {/* Nilai Estimasi Lelang (Ikon Koin + Nilai Rp) */}
                      <span
                        className="flex items-center gap-1 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300 tabular-nums"
                        title="Estimasi Nilai Lelang"
                      >
                        <Coins className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{formatRupiah(unit.hargaLelang || 2500000)}</span>
                      </span>
                    </div>

                    {/* Sisi Kanan: Aksi (Antrikan Charge & Catat Terjual) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isWaiting ? (
                        <div
                          className="h-10 px-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-200"
                          title="Dalam Antrian Charge"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Antrian</span>
                        </div>
                      ) : isCharging ? (
                        <div
                          className="h-10 px-2.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold flex items-center justify-center gap-1 border border-sky-200"
                          title="Sedang Di-charge"
                        >
                          <Zap className="w-3.5 h-3.5 text-sky-600" />
                          <span>Di-charge</span>
                        </div>
                      ) : chargingSuccessUnitId === unit.id ? (
                        <div className="h-10 px-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Antri</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleChargeLelangUnit(unit)}
                          className="pressable h-10 w-10 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-700 flex items-center justify-center transition-all active:scale-95"
                          title="Antrikan Charge"
                          aria-label="Antrikan Charge"
                        >
                          <Zap className="w-4 h-4 text-sky-600" />
                        </button>
                      )}

                      {/* Tombol Utama: Catat Terjual (Tetap Teks sesuai instruksi spesifikasi) */}
                      <button
                        onClick={() => {
                          setSelectedUnitForSale(unit);
                          setSoldPrice(String(unit.hargaLelang || 2500000));
                          setBuyerInfo("");
                        }}
                        className="pressable h-10 px-3.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Catat Terjual</span>
                      </button>
                    </div>
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
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3 unit-card-optimized"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
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
                  <span>Letak Unit:</span>
                  <span className="font-semibold text-slate-800">{selectedUnitForSale.lokasi || 'Belum diisi'}</span>
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
      {/* 5. BOTTOM SHEET EDIT LETAK UNIT */}
      <LetakUnitBottomSheet
        unit={editLokasiUnit}
        allUnits={units}
        isOpen={!!editLokasiUnit}
        onClose={() => setEditLokasiUnit(null)}
        onSave={(unitId, newLoc) => {
          const res = updateUnitLocation(unitId, newLoc, "Admin Gudang");
          if (res.success) {
            setHighlightedUnitId(unitId);
            setTimeout(() => setHighlightedUnitId(null), 700);
            onNotify({
              title: "Letak unit diperbarui",
              message: res.message,
              type: "success"
            });
          } else {
            onNotify({
              title: "Gagal Menyimpan",
              message: res.message || "Terjadi kesalahan",
              type: "warning"
            });
          }
        }}
      />
    </div>
  );
}

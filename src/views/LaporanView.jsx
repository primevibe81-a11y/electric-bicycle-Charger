import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  UploadCloud,
  Search,
  X,
  Bike,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  Download,
  Info,
  MapPin,
  Box,
  PackageCheck,
  ClipboardCopy,
  Check
} from 'lucide-react';
import { exportLaporanExcel, generatePdfReport } from '../services/reportExport';
import { copyWhatsAppReportToClipboard } from '../services/whatsappReport';
import { getDaysSinceLastCharge, getChargeAuditInfo, BATTERY_CONDITIONS, getBatteryConditionLabel } from '../services/chargerQueue';
import { extendGadaiUnit, redeemGadaiUnit, normalizeHistoryEntry, updateUnitLocation } from '../services/storage';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import BatteryIndicator from '../components/BatteryIndicator';
import ChargeAuditBadge from '../components/ChargeAuditBadge';
import AuditBatteryModal from '../components/AuditBatteryModal';
import ExcelSyncModal from '../components/ExcelSyncModal';
import LetakUnitBottomSheet from '../components/LetakUnitBottomSheet';
import BottomSheet from '../components/BottomSheet';
import Tooltip from '../components/Tooltip';
import { triggerHaptic } from '../services/animationHelpers';

/**
 * Filter cerdas untuk mendeteksi apakah sebuah unit benar-benar memiliki
 * komplain / cacat baterai atau fisik nyata (bukan catatan informatif biasa)
 */
function isRealBatteryOrPhysicalDefect(unit) {
  if (unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA') {
    return true;
  }
  const note = String(unit.catatanBaterai || '').toLowerCase();
  return /rusak|drop|mati|bocor|kendur|patah|cacat|kurang|sobek|terkelupas/i.test(note);
}

export default function LaporanView({ units = [], onNotify, initialAction = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SEMUA'); // 'SEMUA' | 'AKTIF' | 'LELANG' | 'DITEBUS' | 'MUTASI' | 'BERMASALAH'
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const [isStockOpnameSort, setIsStockOpnameSort] = useState(false);
  const [editLokasiUnit, setEditLokasiUnit] = useState(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  // Reset limit saat filter berubah
  useEffect(() => {
    setDisplayLimit(20);
  }, [statusFilter, searchQuery, isStockOpnameSort]);

  // Quick Action Modal states
  const [auditUnit, setAuditUnit] = useState(null);
  const [perpanjangUnit, setPerpanjangUnit] = useState(null);
  const [tebusUnit, setTebusUnit] = useState(null);

  // Form states for Quick Perpanjang
  const [newKodeGadai, setNewKodeGadai] = useState('');
  const [perpanjangDays, setPerpanjangDays] = useState('30');
  const [catatanPerpanjang, setCatatanPerpanjang] = useState('');

  // Form states for Quick Tebus
  const [catatanTebus, setCatatanTebus] = useState('');

  // Refs for sticky scrollIntoView tabs
  const tabScrollRef = useRef(null);
  const activeTabRef = useRef(null);

  // Handle initialAction passed from props
  useEffect(() => {
    if (initialAction?.type === 'perpanjang' && initialAction.unitId) {
      const u = units.find(item => item.id === initialAction.unitId);
      if (u) setPerpanjangUnit(u);
    } else if (initialAction?.type === 'tebus' && initialAction.unitId) {
      const u = units.find(item => item.id === initialAction.unitId);
      if (u) setTebusUnit(u);
    }
  }, [initialAction, units]);

  // Scroll active tab into view whenever statusFilter changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [statusFilter]);

  // Statistik Unit
  const stats = useMemo(() => {
    const total = units.length;
    const aktif = units.filter(u => u.statusBarang === 'AKTIF').length;
    const lelang = units.filter(u => u.statusBarang === 'LELANG').length;
    const ditebus = units.filter(u => u.statusBarang === 'DITEBUS').length;
    const mutasi = units.filter(u => Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.length > 0).length;
    const bermasalah = units.filter(isRealBatteryOrPhysicalDefect).length;
    return { total, aktif, lelang, ditebus, mutasi, bermasalah };
  }, [units]);

  // Filter & Search Logic
  const filteredUnits = useMemo(() => {
    let result = [...units];

    // Status filter
    if (statusFilter === 'AKTIF') {
      result = result.filter(u => u.statusBarang === 'AKTIF');
    } else if (statusFilter === 'LELANG') {
      result = result.filter(u => u.statusBarang === 'LELANG');
    } else if (statusFilter === 'DITEBUS') {
      result = result.filter(u => u.statusBarang === 'DITEBUS');
    } else if (statusFilter === 'MUTASI') {
      result = result.filter(u => Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.length > 0);
    } else if (statusFilter === 'BERMASALAH') {
      result = result.filter(isRealBatteryOrPhysicalDefect);
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(u => {
        const matchMain =
          (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
          (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
          (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
          (u.catatanBaterai && u.catatanBaterai.toLowerCase().includes(q)) ||
          (u.kondisiBaterai && u.kondisiBaterai.toLowerCase().includes(q)) ||
          (u.lokasi && u.lokasi.toLowerCase().includes(q));

        const matchOldCodes = Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.some(entry => {
          const norm = normalizeHistoryEntry(entry);
          return (
            norm.kodeGadaiLama.toLowerCase().includes(q) ||
            norm.catatanLama.toLowerCase().includes(q)
          );
        });

        return matchMain || matchOldCodes;
      });
    }

    return result;
  }, [units, statusFilter, searchQuery]);

  // Batasi render awal (misal 20 kartu) untuk menjamin 60fps di WebKit iOS Safari
  const displayedUnits = useMemo(() => {
    return filteredUnits.slice(0, displayLimit);
  }, [filteredUnits, displayLimit]);

  // Handle Export Excel
  const handleExportExcel = () => {
    try {
      const res = exportLaporanExcel(units, statusFilter, {
        sortBy: isStockOpnameSort ? 'LOKASI_AZ' : undefined
      });
      onNotify({
        title: 'Export Excel Berhasil! 📊',
        message: `${res.count} data sepeda listrik berhasil diexport ke file ${res.fileName}`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      onNotify({
        title: 'Export Excel Gagal',
        message: err.message || String(err),
        type: 'warning'
      });
    }
  };

  // Handle Generate PDF
  const handleGeneratePdf = () => {
    try {
      const res = generatePdfReport(units, {
        filterStatus: statusFilter,
        sortBy: isStockOpnameSort ? 'LOKASI_AZ' : undefined
      });
      onNotify({
        title: 'Generate PDF Berhasil! 📄',
        message: `Laporan lengkap sepeda listrik berhasil dibuat (${res.fileName})`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      onNotify({
        title: 'Generate PDF Gagal',
        message: err.message || String(err),
        type: 'warning'
      });
    }
  };

  // Handle Submit Perpanjang
  const handlePerpanjangSubmit = (e) => {
    e.preventDefault();
    if (!perpanjangUnit) return;

    if (!newKodeGadai.trim()) {
      onNotify({ title: 'Nomor Baru Wajib Diisi', message: 'Silakan masukkan nomor gadai baru.', type: 'warning' });
      return;
    }

    if (newKodeGadai.trim() === perpanjangUnit.kodeGadai) {
      onNotify({ title: 'Nomor Sama', message: 'Nomor baru harus berbeda dari nomor sebelumnya.', type: 'warning' });
      return;
    }

    const newJatuhTempoAt = Date.now() + Number(perpanjangDays) * 24 * 60 * 60 * 1000;
    const res = extendGadaiUnit(perpanjangUnit.id, newKodeGadai, newJatuhTempoAt, catatanPerpanjang);

    if (res.success) {
      onNotify({
        title: 'Perpanjangan Berhasil! 🔄',
        message: res.message,
        type: 'success'
      });
      setPerpanjangUnit(null);
      setNewKodeGadai('');
      setCatatanPerpanjang('');
    } else {
      onNotify({ title: 'Gagal Perpanjang', message: res.message, type: 'warning' });
    }
  };

  // Handle Submit Tebus
  const handleTebusSubmit = (e) => {
    e.preventDefault();
    if (!tebusUnit) return;

    if (window.confirm(`Konfirmasi pelunasan & penebusan unit #${tebusUnit.kodeGadai} (${tebusUnit.merkSepeda})?`)) {
      const res = redeemGadaiUnit(tebusUnit.id, catatanTebus);
      if (res.success) {
        onNotify({
          title: 'Penebusan Berhasil! ✅',
          message: res.message,
          type: 'success'
        });
        setTebusUnit(null);
        setCatatanTebus('');
      } else {
        onNotify({ title: 'Gagal Penebusan', message: res.message, type: 'warning' });
      }
    }
  };

  // Handler: Salin Ringkasan Shift Harian untuk WhatsApp
  const handleCopyWhatsApp = async () => {
    triggerHaptic('success');
    try {
      await copyWhatsAppReportToClipboard(units, null);
      onNotify({
        title: 'Tersalin ke Clipboard! 📋',
        message: 'Laporan shift harian siap di-paste ke grup WhatsApp kantor.',
        type: 'success'
      });
    } catch (err) {
      onNotify({
        title: 'Gagal Menyalin',
        message: 'Tidak dapat mengakses clipboard browser.',
        type: 'warning'
      });
    }
  };

  // Definisi tab filter
  const filterTabs = [
    { id: 'SEMUA', label: 'Semua', count: stats.total },
    { id: 'AKTIF', label: 'Aktif', count: stats.aktif },
    { id: 'LELANG', label: 'Lelang', count: stats.lelang },
    { id: 'DITEBUS', label: 'Ditebus', count: stats.ditebus },
    { id: 'MUTASI', label: 'Riwayat Mutasi', count: stats.mutasi },
    { id: 'BERMASALAH', label: 'Bermasalah', count: stats.bermasalah }
  ];

  return (
    <div className="space-y-3 pb-8">
      {/* 1. HEADER SECTION (Judul Utuh + Tombol Auto-Sync Icon-Only 44x44px) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            Pusat Laporan & Mutasi
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
            Rekapitulasi seluruh status, ekspor dokumen, dan mutasi e-bike
          </p>
        </div>

        {/* Tombol Auto-Sync Icon-Only (Touch Target 44x44px) */}
        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center justify-center shadow-xs active:scale-95 transition-all shrink-0"
          title="Auto-Sync File Excel Transaksi & Buku Besar"
          aria-label="Buka Modal Auto-Sync Excel"
        >
          <UploadCloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </button>
      </div>

      {/* Tombol Cepat Salin Ringkasan WA Shift Harian */}
      <button
        type="button"
        onClick={handleCopyWhatsApp}
        className="pressable w-full h-11 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
        title="Salin Ringkasan Laporan Harian untuk WhatsApp"
      >
        <ClipboardCopy className="w-4 h-4" />
        <span>Salin Ringkasan WA</span>
      </button>

      {/* 2. STATS CARDS (Kompak, Ikon di atas, Angka Besar, Label Teks Jelas) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Fisik Card */}
        <Tooltip content="Fisik Gudang: Total unit aktif & lelang di gudang" position="bottom" className="w-full">
          <button
            onClick={() => {
              triggerHaptic('light');
              setStatusFilter(statusFilter === 'SEMUA' ? 'AKTIF' : 'SEMUA');
            }}
            className={`pressable w-full p-2.5 rounded-2xl border text-center transition-all min-h-[68px] flex flex-col items-center justify-center gap-1 ${
              statusFilter === 'SEMUA' || statusFilter === 'AKTIF'
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 ring-2 ring-sky-400/20 shadow-xs'
                : 'bg-white dark:bg-[#151C28] border-slate-200/80 dark:border-[#232F42] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Fisik Gudang"
            aria-label="Filter Fisik Gudang"
          >
            <Box className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
              {stats.aktif + stats.lelang}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              FISIK GUDANG
            </span>
          </button>
        </Tooltip>

        {/* Ditebus Card */}
        <Tooltip content="Ditebus: Unit yang telah dilunasi dan keluar gudang" position="bottom" className="w-full">
          <button
            onClick={() => {
              triggerHaptic('light');
              setStatusFilter('DITEBUS');
            }}
            className={`pressable w-full p-2.5 rounded-2xl border text-center transition-colors min-h-[68px] flex flex-col items-center justify-center gap-1 ${
              statusFilter === 'DITEBUS'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-400/20 shadow-xs'
                : 'bg-white dark:bg-[#151C28] border-slate-200/80 dark:border-[#232F42] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Ditebus"
            aria-label="Filter Ditebus"
          >
            <PackageCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 leading-none tabular-nums">
              {stats.ditebus}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              DITEBUS
            </span>
          </button>
        </Tooltip>

        {/* Bermasalah Card */}
        <Tooltip content="Bermasalah: Unit dengan kendala baterai atau fisik" position="bottom" className="w-full">
          <button
            onClick={() => {
              triggerHaptic('light');
              setStatusFilter('BERMASALAH');
            }}
            className={`pressable w-full p-2.5 rounded-2xl border text-center transition-colors min-h-[68px] flex flex-col items-center justify-center gap-1 ${
              statusFilter === 'BERMASALAH'
                ? 'bg-rose-100/80 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 ring-2 ring-rose-400/30 shadow-xs'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:bg-rose-100/50 dark:hover:bg-rose-950/40'
            }`}
            title="Bermasalah"
            aria-label="Filter Bermasalah"
          >
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-xl font-black text-rose-600 dark:text-rose-300 leading-none tabular-nums">
              {stats.bermasalah}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
              BERMASALAH
            </span>
          </button>
        </Tooltip>
      </div>

      {/* 3. STICKY CONTROLS (Solid Background, Bebas Blur GPU iOS) */}
      <div className="sticky -top-3 z-20 -mx-4 px-4 pt-2.5 pb-2 bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800/80 shadow-xs space-y-2">
        {/* Row 1: Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari..."
            className="w-full h-11 pl-9 pr-9 bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232F42] rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-none focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 2: Tiga Tombol Ekspor Berlabel Jelas (PDF Kacab, Excel, Kontak) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => handleGeneratePdf(filteredUnits)}
            className="h-9 px-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs pressable transition-all"
            title="Cetak Laporan PDF untuk Kepala Cabang"
            aria-label="Cetak PDF Kacab"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>📄 PDF Kacab</span>
          </button>
          <button
            onClick={() => handleExportExcel(filteredUnits)}
            className="h-9 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs pressable transition-all"
            title="Ekspor Data ke File Excel (.xlsx)"
            aria-label="Ekspor Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>📊 Excel</span>
          </button>
          <button
            onClick={handleCopyWhatsApp}
            className="h-9 px-2 rounded-xl bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs pressable transition-all"
            title="Salin Ringkasan untuk Kontak WhatsApp Kacab"
            aria-label="Kontak WA Kacab"
          >
            <ClipboardCopy className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>⚙️ Kontak</span>
          </button>
        </div>

        {/* Row 3: Status Filter Tabs dengan Fade Gradient & Auto-scroll */}
        <div className="relative">
          <div
            ref={tabScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pr-8"
          >
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-8 min-h-[32px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#151C28] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#232F42] hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fade Gradient di tepi kanan petunjuk scroll */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white dark:from-[#0B0F17] to-transparent"></div>
        </div>
      </div>

      {/* 4. DAFTAR KARTU UNIT (Prioritas Area Daftar: Minimal 2-3 Kartu Terlihat Tanpa Scroll) */}
      <div className="space-y-2.5">
        {filteredUnits.length === 0 ? (
          <div className="bg-white dark:bg-[#151C28] rounded-2xl p-8 text-center border border-slate-200/80 dark:border-[#232F42] shadow-xs">
            <Bike className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Tidak ada data sepeda listrik</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada data pada kategori ini'}
            </p>
          </div>
        ) : (
          <>
            {displayedUnits.map((unit, index) => {
              const daysSinceCharge = getDaysSinceLastCharge(
                unit.lastChargedAt,
                unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null
              );
              const hasHistory = Array.isArray(unit.riwayatKodeGadai) && unit.riwayatKodeGadai.length > 0;
              const isExpanded = expandedUnitId === unit.id;
              const isDitebus = unit.statusBarang === 'DITEBUS';
              const isDefect = isRealBatteryOrPhysicalDefect(unit);
              const kondisiLabel = getBatteryConditionLabel(unit.kondisiBaterai);
              const lokasiText = unit.lokasi ? unit.lokasi : 'Lokasi belum diisi';
              const chargeText = daysSinceCharge === 0 ? 'Charge hari ini' : `Charge ${daysSinceCharge} hari lalu`;

              return (
                <div
                  key={unit.id}
                  className={`bg-white dark:bg-[#151C28] rounded-2xl p-3 border transition-colors shadow-xs pressable-card unit-card-optimized border-slate-200/80 dark:border-[#232F42] text-slate-900 dark:text-slate-100 ${
                    highlightedUnitId === unit.id ? 'animate-highlight border-sky-400 ring-2 ring-sky-200' : ''
                  } ${
                    isDefect ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-300/30' : ''
                  }`}
                >
                  {/* BARIS 1: Nomor Akad + Status Pill + Badge Baterai */}
                  <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                        #{unit.kodeGadai}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          unit.statusBarang === 'AKTIF'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                            : unit.statusBarang === 'LELANG'
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {unit.statusBarang === 'DITEBUS' ? 'DITEBUS' : unit.statusBarang}
                      </span>

                      {/* History Mutasi Badge */}
                      {hasHistory && (
                        <span
                          className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center"
                          title="Ada riwayat mutasi perpanjangan"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        </span>
                      )}
                    </div>

                    <BatteryIndicator level={unit.batteryLevel} size="sm" />
                  </div>

                  {/* BARIS 2: Merk Sepeda • Nama Nasabah */}
                  <div className="pt-1 min-w-0">
                    <p className="text-[13px] text-slate-800 dark:text-slate-200 truncate leading-snug">
                      <span className="font-semibold text-slate-900 dark:text-white">{unit.merkSepeda}</span>
                      <span className="text-slate-400 dark:text-slate-600 mx-1.5">•</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[12px]">{unit.namaNasabah}</span>
                    </p>
                  </div>

                  {/* BARIS 3: Meta Info (Letak, Charge, Kondisi) */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 mt-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                      <BatteryConditionBadge kondisi={unit.kondisiBaterai} size="xs" />
                      <span className={unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                        {kondisiLabel}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => setEditLokasiUnit(unit)}
                        className={`hover:underline truncate max-w-[85px] ${
                          unit.lokasi ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'
                        }`}
                        title={unit.lokasi ? `Letak di gudang: ${unit.lokasi}` : 'Ketuk untuk isi letak di gudang'}
                      >
                        {lokasiText}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className={`inline-flex items-center gap-1 ${daysSinceCharge >= 15 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{chargeText}</span>
                      </span>

                      {/* Catatan Baterai */}
                      {unit.catatanBaterai && (
                        <button
                          type="button"
                          onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-0.5"
                          title={unit.catatanBaterai}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                {/* 6. CATATAN KARTU UNIT:
                    Warna amber/kuning HANYA jika ada masalah baterai / fisik nyata.
                    Catatan biasa berupa teks abu-abu kecil tanpa kotak berwarna. */}
                {unit.catatanBaterai && (
                  isDefect ? (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] space-y-0.5">
                      <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Catatan Masalah Fisik / Baterai:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 pl-4 text-[11px] leading-snug">{unit.catatanBaterai}</p>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="leading-snug">{unit.catatanBaterai}</p>
                    </div>
                  )
                )}

                {/* Riwayat Mutasi Expandable */}
                {hasHistory && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                      className="w-full flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-400 font-bold hover:text-amber-900 dark:hover:text-amber-300"
                    >
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Riwayat Mutasi ({unit.riwayatKodeGadai.length})
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5">
                        {unit.riwayatKodeGadai.map((rawEntry, hIdx) => {
                          const entry = normalizeHistoryEntry(rawEntry);
                          return (
                            <div
                              key={hIdx}
                              className="p-2 bg-slate-50 dark:bg-[#111722] rounded-xl border border-slate-200 dark:border-[#232F42] text-[10.5px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-600 dark:text-slate-300">
                                  No. Lama: <strong className="text-amber-700 dark:text-amber-400">#{entry.kodeGadaiLama}</strong>
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {entry.tglPerpanjang ? new Date(entry.tglPerpanjang).toLocaleDateString('id-ID') : '-'}
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400">
                                Catatan lama: {entry.catatanLama || '-'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Footer Buttons (hanya untuk unit aktif/lelang, radius 12px, Touch Target >= 44px) */}
                {!isDitebus && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setAuditUnit(unit)}
                      className="h-10 min-h-[44px] px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Audit kondisi baterai"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span>Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        setPerpanjangUnit(unit);
                        setNewKodeGadai('');
                        setCatatanPerpanjang(unit.catatanBaterai || '');
                      }}
                      className="h-10 min-h-[44px] px-3 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Perpanjang gadai unit"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Perpanjang</span>
                    </button>

                    <button
                      onClick={() => {
                        setTebusUnit(unit);
                        setCatatanTebus('');
                      }}
                      className="h-10 min-h-[44px] px-3 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Pelunasan & tebus unit"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Tebus</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tombol Tampilkan Lebih Banyak untuk Membatasi Beban DOM iOS Safari */}
          {filteredUnits.length > displayLimit && (
            <button
              type="button"
              onClick={() => setDisplayLimit(prev => prev + 25)}
              className="w-full h-11 bg-white hover:bg-sky-50 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 shadow-2xs pressable transition-colors flex items-center justify-center gap-1.5"
            >
              Tampilkan Lebih Banyak ({displayLimit} dari {filteredUnits.length} Unit)
            </button>
          )}
        </>
      )}
    </div>

      {/* 5. BOTTOM SHEET EKSPOR LAPORAN (Pengganti Kartu Ekspor Besar) */}
      <BottomSheet
        isOpen={isExportSheetOpen}
        onClose={() => setIsExportSheetOpen(false)}
        title="Ekspor Dokumen Laporan"
        subtitle={`Filter aktif: ${statusFilter} (${filteredUnits.length} Unit)`}
        icon={Download}
        maxHeight="90vh"
      >
        {/* Opsi Sortir Stock Opname */}
        <div
          onClick={() => setIsStockOpnameSort(!isStockOpnameSort)}
          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all pressable ${
            isStockOpnameSort
              ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-300/40'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isStockOpnameSort ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block">
                Urutkan Berdasarkan Letak Gudang (A-Z)
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Cocok untuk stock opname fisik menyusuri rak gudang
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isStockOpnameSort}
            onChange={() => {}}
            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
          />
        </div>

        {/* Opsi Ekspor */}
        <div className="space-y-2.5">
          {/* Opsi Excel */}
          <button
            onClick={() => {
              handleExportExcel();
              setIsExportSheetOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl text-left transition-all pressable"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-emerald-950">Export ke Excel (.xlsx)</div>
              <div className="text-[11px] text-emerald-700">Tabel lengkap nomor gadai, nasabah, baterai, & riwayat</div>
            </div>
          </button>

          {/* Opsi PDF */}
          <button
            onClick={() => {
              handleGeneratePdf();
              setIsExportSheetOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-2xl text-left transition-all pressable"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-rose-950">Generate PDF Resmi (.pdf)</div>
              <div className="text-[11px] text-rose-700">Laporan cetak A4 dengan bukti foto fisik & tanda tangan</div>
            </div>
          </button>
        </div>

        <button
          onClick={() => setIsExportSheetOpen(false)}
          className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 pressable"
        >
          Tutup
        </button>
      </BottomSheet>

      {/* MODAL AUTO-SYNC EXCEL */}
      <ExcelSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        units={units}
        onNotify={onNotify}
      />

      {/* MODAL AUDIT BATERAI */}
      {auditUnit && (
        <AuditBatteryModal
          unit={auditUnit}
          onClose={() => setAuditUnit(null)}
          onNotify={onNotify}
        />
      )}

      {/* MODAL QUICK PERPANJANG */}
      {perpanjangUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-sky-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Perpanjangan Gadai Cepat</h3>
                  <p className="text-[10px] text-slate-400">Unit #{perpanjangUnit.kodeGadai} • {perpanjangUnit.namaNasabah}</p>
                </div>
              </div>
              <button
                onClick={() => setPerpanjangUnit(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePerpanjangSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor Gadai Baru
                </label>
                <input
                  type="text"
                  required
                  value={newKodeGadai}
                  onChange={(e) => setNewKodeGadai(e.target.value)}
                  placeholder="Contoh: 26_0038119"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Durasi Perpanjangan (Hari)
                </label>
                <select
                  value={perpanjangDays}
                  onChange={(e) => setPerpanjangDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="15">15 Hari</option>
                  <option value="30">30 Hari (1 Bulan)</option>
                  <option value="60">60 Hari (2 Bulan)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Kondisi / Fisik Baru (Opsional)
                </label>
                <textarea
                  value={catatanPerpanjang}
                  onChange={(e) => setCatatanPerpanjang(e.target.value)}
                  placeholder="Catatan kondisi saat diperpanjang..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                Konfirmasi Perpanjangan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL QUICK TEBUS */}
      {tebusUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-sky-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Pelunasan & Penebusan Cepat</h3>
                  <p className="text-[10px] text-slate-400">Unit #{tebusUnit.kodeGadai} • {tebusUnit.namaNasabah}</p>
                </div>
              </div>
              <button
                onClick={() => setTebusUnit(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTebusSubmit} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-600">
                  Barang: <strong className="text-slate-800">{tebusUnit.merkSepeda}</strong>
                </p>
                <p className="text-slate-600">
                  Nasabah: <strong className="text-slate-800">{tebusUnit.namaNasabah}</strong>
                </p>
                <p className="text-[10px] text-slate-400">
                  Unit akan dikeluarkan dari antrian charger dan berstatus DITEBUS.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Penebusan (Opsional)
                </label>
                <textarea
                  value={catatanTebus}
                  onChange={(e) => setCatatanTebus(e.target.value)}
                  placeholder="Contoh: Ditebus lunas oleh nasabah langsung..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                Konfirmasi Tebus & Keluar Gudang
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL EDIT LETAK UNIT */}
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

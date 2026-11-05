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
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  Download,
  Info,
  MapPin
} from 'lucide-react';
import { exportLaporanExcel, generatePdfReport } from '../services/reportExport';
import { getDaysSinceLastCharge, getChargeAuditInfo } from '../services/chargerQueue';
import { extendGadaiUnit, redeemGadaiUnit, normalizeHistoryEntry, updateUnitLocation } from '../services/storage';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import BatteryIndicator from '../components/BatteryIndicator';
import ChargeAuditBadge from '../components/ChargeAuditBadge';
import AuditBatteryModal from '../components/AuditBatteryModal';
import ExcelSyncModal from '../components/ExcelSyncModal';
import LetakUnitBottomSheet from '../components/LetakUnitBottomSheet';
import BottomSheet from '../components/BottomSheet';
import CountUp from '../components/CountUp';
import { getStaggerStyle, triggerHaptic } from '../services/animationHelpers';

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
  const [isStaggerActive, setIsStaggerActive] = useState(true);

  // Stagger hanya aktif saat awal render atau filter berubah
  useEffect(() => {
    setIsStaggerActive(true);
    const timer = setTimeout(() => setIsStaggerActive(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

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
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            Pusat Laporan & Mutasi
          </h2>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
            Rekapitulasi seluruh status, ekspor dokumen, dan mutasi e-bike
          </p>
        </div>

        {/* Tombol Auto-Sync Icon-Only (Touch Target 44x44px) */}
        <button
          onClick={() => setIsSyncModalOpen(true)}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shadow-xs active:scale-95 transition-all shrink-0"
          title="Auto-Sync File Excel Transaksi & Buku Besar"
          aria-label="Buka Modal Auto-Sync Excel"
        >
          <UploadCloud className="w-5 h-5 text-sky-600" />
        </button>
      </div>

      {/* 2. STATS CARDS (Kompak, Padding Vertikal <= 12px, Interaktif) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Fisik Card */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter(statusFilter === 'SEMUA' ? 'AKTIF' : 'SEMUA');
          }}
          className={`pressable p-2 rounded-2xl border text-center transition-all ${
            statusFilter === 'SEMUA' || statusFilter === 'AKTIF'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
          title="Filter unit fisik di gudang"
        >
          <div className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
            Fisik Gudang
          </div>
          <div className="text-sm font-black text-slate-900 leading-tight">
            <CountUp to={stats.aktif + stats.lelang} /> <span className="text-[10px] font-normal text-slate-500">Unit</span>
          </div>
        </button>

        {/* Ditebus Card */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('DITEBUS');
          }}
          className={`pressable p-2 rounded-2xl border text-center transition-all ${
            statusFilter === 'DITEBUS'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
          title="Filter unit ditebus / keluar gudang"
        >
          <div className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
            Ditebus
          </div>
          <div className="text-sm font-black text-blue-700 leading-tight">
            <CountUp to={stats.ditebus} /> <span className="text-[10px] font-normal text-slate-500">Unit</span>
          </div>
        </button>

        {/* Bermasalah Card (Warna Merah & Filter Cepat) */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('BERMASALAH');
          }}
          className={`pressable p-2 rounded-2xl border text-center transition-all ${
            statusFilter === 'BERMASALAH'
              ? 'bg-rose-100/80 border-rose-300 ring-2 ring-rose-400/30 shadow-xs'
              : 'bg-rose-50/60 border-rose-200 hover:bg-rose-100/50'
          }`}
          title="Filter unit baterai bermasalah"
        >
          <div className="text-[9.5px] font-semibold text-rose-700 uppercase tracking-wider">
            Bermasalah
          </div>
          <div className="text-sm font-black text-rose-600 leading-tight">
            <CountUp to={stats.bermasalah} /> <span className="text-[10px] font-normal text-rose-400">Unit</span>
          </div>
        </button>
      </div>

      {/* 3. STICKY CONTROLS (Collapsing Header Effect: Search Bar + Tombol Ekspor + Tab Filter dengan Fade) */}
      <div className="sticky -top-3 z-20 -mx-4 px-4 pt-2.5 pb-2 bg-[#F0F9FF]/95 backdrop-blur-md border-b border-sky-100/70 shadow-xs space-y-2">
        {/* Row 1: Search Bar + Single "Ekspor" Button */}
        <div className="flex items-center gap-2">
          {/* Kolom Pencarian (radius 12px, shadow-none, border jelas) */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no gadai, nasabah, masalah..."
              className="w-full h-11 pl-9 pr-9 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 shadow-none focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tombol Ekspor Ringkas (Touch target 44x44px, membuka Bottom Sheet) */}
          <button
            onClick={() => setIsExportSheetOpen(true)}
            className="h-11 min-h-[44px] px-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0"
            title="Buka pilihan ekspor laporan"
            aria-label="Buka Opsi Ekspor Laporan"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Ekspor</span>
          </button>
        </div>

        {/* Row 2: Status Filter Tabs dengan Fade Gradient & Auto-scroll */}
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
                  className={`h-9 min-h-[36px] px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fade Gradient di tepi kanan petunjuk scroll */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#F0F9FF] to-transparent"></div>
        </div>
      </div>

      {/* 4. DAFTAR KARTU UNIT (Prioritas Area Daftar: Minimal 2-3 Kartu Terlihat Tanpa Scroll) */}
      <div className="space-y-2.5">
        {filteredUnits.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-xs">
            <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Tidak ada data sepeda listrik</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada data pada kategori ini'}
            </p>
          </div>
        ) : (
          filteredUnits.map((unit, index) => {
            const daysSinceCharge = getDaysSinceLastCharge(
              unit.lastChargedAt,
              unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null
            );
            const hasHistory = Array.isArray(unit.riwayatKodeGadai) && unit.riwayatKodeGadai.length > 0;
            const isExpanded = expandedUnitId === unit.id;
            const isDitebus = unit.statusBarang === 'DITEBUS';
            const isDefect = isRealBatteryOrPhysicalDefect(unit);

            return (
              <div
                key={unit.id}
                style={getStaggerStyle(index, isStaggerActive)}
                className={`bg-white rounded-2xl p-3.5 border transition-all shadow-xs pressable-card ${
                  index < 6 && isStaggerActive ? 'animate-card-enter' : ''
                } ${
                  highlightedUnitId === unit.id ? 'animate-highlight border-sky-400 ring-2 ring-sky-200' : ''
                } ${
                  isDefect ? 'border-amber-300 ring-1 ring-amber-300/30' : 'border-slate-200/80'
                }`}
              >
                {/* Header Card: Pawn Ticket, Status & History Badge (Pills) */}
                <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                      #{unit.kodeGadai}
                    </span>

                    {/* Status Badge (Pill) */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        unit.statusBarang === 'AKTIF'
                          ? 'bg-emerald-100 text-emerald-800'
                          : unit.statusBarang === 'LELANG'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {unit.statusBarang === 'DITEBUS' ? 'DITEBUS' : unit.statusBarang}
                    </span>

                    {/* History Mutasi Badge (Pill) */}
                    {hasHistory && (
                      <span className="text-[9.5px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Perpanjangan
                      </span>
                    )}
                  </div>

                  <BatteryConditionBadge kondisi={unit.kondisiBaterai} />
                </div>

                {/* Bike Model & Customer Info */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {unit.merkSepeda}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">Nasabah: <strong className="text-slate-700">{unit.namaNasabah}</strong></span>
                      </p>
                    </div>
                    <BatteryIndicator level={unit.batteryLevel} size="sm" />
                  </div>

                  {/* Charging & Overdue Stats */}
                  <div className="flex items-center justify-between text-[10.5px] pt-1">
                    <span className="text-slate-500">
                      Charge:{' '}
                      <strong className={daysSinceCharge >= 15 ? 'text-rose-600' : 'text-slate-700'}>
                        {daysSinceCharge} Hari Lalu
                      </strong>
                    </span>
                    <ChargeAuditBadge
                      lastChargedAt={unit.lastChargedAt}
                      createdAt={unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null}
                    />
                  </div>

                  {/* Lokasi Gudang Meta Row: Ikon Pin + Teks Lokasi, Abu-abu 12-13px, Ellipsis, Touch Target 44px */}
                  <button
                    type="button"
                    onClick={() => setEditLokasiUnit(unit)}
                    className="w-full text-left pt-1 flex items-center gap-1.5 text-[11px] group min-h-[36px] py-1 px-1 -mx-1 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors pressable"
                    title="Ubah letak unit di gudang"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-sky-600 transition-colors" />
                    <span className={`truncate flex-1 ${unit.lokasi ? 'text-slate-600 font-medium' : 'text-slate-400 italic'}`}>
                      {unit.lokasi || 'Letak belum diisi'}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ubah
                    </span>
                  </button>
                </div>

                {/* 6. CATATAN KARTU UNIT:
                    Warna amber/kuning HANYA jika ada masalah baterai / fisik nyata.
                    Catatan biasa berupa teks abu-abu kecil tanpa kotak berwarna. */}
                {unit.catatanBaterai && (
                  isDefect ? (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] space-y-0.5">
                      <div className="flex items-center gap-1 text-amber-800 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Catatan Masalah Fisik / Baterai:</span>
                      </div>
                      <p className="text-slate-700 pl-4 text-[11px] leading-snug">{unit.catatanBaterai}</p>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-500">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="leading-snug">{unit.catatanBaterai}</p>
                    </div>
                  )
                )}

                {/* Riwayat Mutasi Expandable */}
                {hasHistory && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                      className="w-full flex items-center justify-between text-[11px] text-amber-800 font-bold hover:text-amber-900"
                    >
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-amber-600" />
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
                              className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-600">
                                  No. Lama: <strong className="text-amber-700">#{entry.kodeGadaiLama}</strong>
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {entry.tglPerpanjang ? new Date(entry.tglPerpanjang).toLocaleDateString('id-ID') : '-'}
                                </span>
                              </div>
                              <p className="text-slate-500">
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
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setAuditUnit(unit)}
                      className="h-10 min-h-[44px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Audit kondisi baterai"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                      <span>Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        setPerpanjangUnit(unit);
                        setNewKodeGadai('');
                        setCatatanPerpanjang(unit.catatanBaterai || '');
                      }}
                      className="h-10 min-h-[44px] px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Perpanjang gadai unit"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      <span>Perpanjang</span>
                    </button>

                    <button
                      onClick={() => {
                        setTebusUnit(unit);
                        setCatatanTebus('');
                      }}
                      className="h-10 min-h-[44px] px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      title="Pelunasan & tebus unit"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Tebus</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
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

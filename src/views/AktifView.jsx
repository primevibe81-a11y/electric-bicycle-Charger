import React, { useState, useRef, useEffect } from 'react';
import {
  Bike,
  Plus,
  Search,
  Zap,
  Calendar,
  User,
  ShieldCheck,
  History,
  AlertTriangle,
  Gavel,
  RefreshCw,
  CheckCircle2,
  X,
  Clock,
  ArrowDownUp,
  FileText,
  MoreHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import AuditBatteryModal from '../components/AuditBatteryModal';
import { createGadaiUnit, enqueueUnitForCharging, moveToLelang } from '../services/storage';
import {
  BATTERY_CONDITIONS,
  getDaysSinceLastCharge
} from '../services/chargerQueue';

export default function AktifView({ units, onNotify, onNavigateToPerpanjang, onNavigateToTebus }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'CRITICAL' | 'DEFECT'
  const [sortBy, setSortBy] = useState("DEFAULT"); // 'DEFAULT' | 'OLDEST_CHARGED'
  const [auditingUnit, setAuditingUnit] = useState(null);
  const [actionSheetUnit, setActionSheetUnit] = useState(null);
  const [detailUnit, setDetailUnit] = useState(null);

  // References for horizontal chip scrolling
  const chipsContainerRef = useRef(null);
  const activeChipRef = useRef(null);

  // Form states for new pledge unit
  const [kodeGadai, setKodeGadai] = useState("");
  const [merkSepeda, setMerkSepeda] = useState("");
  const [namaNasabah, setNamaNasabah] = useState("");
  const [batteryLevel, setBatteryLevel] = useState("100");
  const [kondisiBaterai, setKondisiBaterai] = useState("PRIMA");
  const [catatanBaterai, setCatatanBaterai] = useState("");
  const [jatuhTempoDays, setJatuhTempoDays] = useState("30");

  const aktifUnits = units.filter(u => u.statusBarang === 'AKTIF');

  // Count metrics for quick filter chips
  const criticalCount = aktifUnits.filter(u => {
    const fallback = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
    return getDaysSinceLastCharge(u.lastChargedAt, fallback) >= 15;
  }).length;

  const defectCount = aktifUnits.filter(u => u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA').length;

  // Auto scroll active chip into view smoothly
  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [filterType]);

  // Filter & Search Logic
  let processedUnits = aktifUnits.filter(u => {
    // 1. Text Search
    const q = searchQuery.toLowerCase().trim();
    const matchText = !q || (
      u.kodeGadai.toLowerCase().includes(q) ||
      u.namaNasabah.toLowerCase().includes(q) ||
      u.merkSepeda.toLowerCase().includes(q)
    );
    if (!matchText) return false;

    // 2. Chip Filter
    if (filterType === 'CRITICAL') {
      const fallback = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
      return getDaysSinceLastCharge(u.lastChargedAt, fallback) >= 15;
    }
    if (filterType === 'DEFECT') {
      return u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA';
    }
    return true;
  });

  // Sorting: Oldest charged on top
  if (sortBy === 'OLDEST_CHARGED') {
    processedUnits.sort((a, b) => {
      const timeA = Number(a.lastChargedAt) || 0;
      const timeB = Number(b.lastChargedAt) || 0;
      return timeA - timeB; // Ascending: waktu terkecil (terlama belum di-charge) paling atas
    });
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9_-]+$/.test(kodeGadai.trim())) {
      onNotify({
        title: "Kode Gadai Tidak Valid",
        message: "Nomor gadai wajib berupa karakter unik (contoh: 26_0037861 atau 2026110055).",
        type: "warning"
      });
      return;
    }

    const jatuhTempoAt = Date.now() + Number(jatuhTempoDays) * 24 * 60 * 60 * 1000;
    const res = createGadaiUnit({
      kodeGadai,
      merkSepeda,
      namaNasabah,
      batteryLevel,
      kondisiBaterai,
      catatanBaterai,
      jatuhTempoAt
    });

    if (res.success) {
      setShowAddForm(false);
      setKodeGadai("");
      setMerkSepeda("");
      setNamaNasabah("");
      setBatteryLevel("100");
      setKondisiBaterai("PRIMA");
      setCatatanBaterai("");
      onNotify({
        title: "Unit Berhasil Didaftarkan",
        message: `Nomor gadai #${res.unit.kodeGadai} aktif terdaftar di sistem.`,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Pendaftaran",
        message: res.message,
        type: "warning"
      });
    }
  };

  const handleQuickEnqueue = (unit) => {
    const res = enqueueUnitForCharging(unit.id, unit.batteryLevel);
    if (res.success) {
      onNotify({
        title: "Masuk Antrian",
        message: res.message,
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

  const handleMoveToLelang = (unit) => {
    if (window.confirm(`Pindahkan sepeda listrik #${unit.kodeGadai} (${unit.merkSepeda}) ke daftar Lelang?`)) {
      moveToLelang(unit.id);
      setActionSheetUnit(null);
      onNotify({
        title: "Pindah ke Lelang",
        message: `Unit #${unit.kodeGadai} kini masuk daftar Lelang.`,
        type: "info"
      });
    }
  };

  const handleTebusConfirm = (unit) => {
    if (window.confirm(`Lanjutkan proses penebusan unit #${unit.kodeGadai} (${unit.merkSepeda})?`)) {
      setActionSheetUnit(null);
      onNavigateToTebus(unit.id);
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Header Bar: Title, Count, & Add Unit Button */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
            Unit Gadai Aktif
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Total {aktifUnits.length} unit sepeda aktif
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-11 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? "Tutup" : "Tambah Baru"}</span>
        </button>
      </div>

      {/* 2. FORM INPUT UNIT GADAI BARU (COLLAPSIBLE) */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-4 shadow-card border border-sky-100 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Pendaftaran Sepeda Gadai Baru</h3>
              <p className="text-[11px] text-slate-500">Isi data fisik &amp; kondisi awal baterai</p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nomor Bukti Gadai (Kode Unik / Akad)
              </label>
              <input
                type="text"
                required
                value={kodeGadai}
                onChange={(e) => setKodeGadai(e.target.value.replace(/[^\w-]/g, ''))}
                placeholder="Contoh: 26_0037861"
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Merk / Tipe Sepeda
                </label>
                <input
                  type="text"
                  required
                  value={merkSepeda}
                  onChange={(e) => setMerkSepeda(e.target.value)}
                  placeholder="Contoh: U-WINFLY D65 HITAM"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Nasabah
                </label>
                <input
                  type="text"
                  required
                  value={namaNasabah}
                  onChange={(e) => setNamaNasabah(e.target.value)}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Audit Kondisi Baterai Saat Masuk */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kondisi Awal Baterai
                </label>
                <select
                  value={kondisiBaterai}
                  onChange={(e) => setKondisiBaterai(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {Object.values(BATTERY_CONDITIONS).map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Persentase Baterai (%)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  required
                  value={batteryLevel}
                  onChange={(e) => setBatteryLevel(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Masa Gadai
                </label>
                <select
                  value={jatuhTempoDays}
                  onChange={(e) => setJatuhTempoDays(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="15">15 Hari</option>
                  <option value="30">30 Hari (1 Bulan)</option>
                  <option value="60">60 Hari (2 Bulan)</option>
                  <option value="90">90 Hari (3 Bulan)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Fisik Baterai
                </label>
                <input
                  type="text"
                  value={catatanBaterai}
                  onChange={(e) => setCatatanBaterai(e.target.value)}
                  placeholder="Misal: Baterai 48V, soket baik"
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-[0.98] transition-all"
              >
                Simpan Data Gadai Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. STICKY FILTER & SEARCH BAR */}
      <div className="sticky -top-3 z-20 -mx-4 px-4 pt-2.5 pb-2 bg-[#F0F9FF]/95 backdrop-blur-md border-b border-sky-100/80 shadow-xs space-y-2">
        {/* Row 1: Search Input (flex-1) + Sort Button (44x44px) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari akad / nasabah / merk"
              className="w-full h-11 pl-10 pr-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg"
                aria-label="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'DEFAULT' ? 'OLDEST_CHARGED' : 'DEFAULT')}
            className={`h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center transition-all ${
              sortBy === 'OLDEST_CHARGED'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-95'
            }`}
            title={sortBy === 'OLDEST_CHARGED' ? "Urutan: Terlama belum charge (Aktif)" : "Urutkan dari terlama belum di-charge"}
            aria-label="Urutkan Terlama Charge"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Horizontal Filter Chips with Right Edge Fade Gradient */}
        <div className="relative">
          <div
            ref={chipsContainerRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 pr-8 scroll-smooth"
          >
            <button
              ref={filterType === 'ALL' ? activeChipRef : null}
              onClick={() => setFilterType('ALL')}
              className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                filterType === 'ALL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua ({aktifUnits.length})
            </button>

            <button
              ref={filterType === 'CRITICAL' ? activeChipRef : null}
              onClick={() => setFilterType('CRITICAL')}
              className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                filterType === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>&gt;14 Hari Belum Charge ({criticalCount})</span>
            </button>

            <button
              ref={filterType === 'DEFECT' ? activeChipRef : null}
              onClick={() => setFilterType('DEFECT')}
              className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                filterType === 'DEFECT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>Baterai Bermasalah ({defectCount})</span>
            </button>
          </div>

          {/* Fade gradient cue for horizontal scroll */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F0F9FF] to-transparent" />
        </div>
      </div>

      {/* 4. LIST KARTU UNIT GADAI AKTIF */}
      <div className="space-y-3 pt-1">
        {processedUnits.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
            {searchQuery || filterType !== 'ALL'
              ? "Tidak ada unit sepeda dengan kriteria filter tersebut."
              : "Belum ada unit sepeda aktif terdaftar."}
          </div>
        ) : (
          processedUnits.map((unit) => {
            const isCharging = unit.statusCharger === 'CHARGING';
            const isWaiting = unit.statusCharger === 'WAITING';
            const fallbackMasuk = unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
            const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, fallbackMasuk);
            const isCriticalOverdue = daysAgo >= 15;

            const jatuhTempoDate = new Date(unit.jatuhTempoAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base font-bold text-slate-900 font-mono tracking-tight">
                      #{unit.kodeGadai}
                    </span>
                    {Array.isArray(unit.riwayatKodeGadai) && unit.riwayatKodeGadai.length > 0 && (
                      <span
                        onClick={() => onNavigateToPerpanjang(unit.id)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200 flex items-center gap-1 transition-colors shrink-0"
                        title="Klik untuk melihat riwayat mutasi perpanjangan"
                      >
                        <History className="w-3 h-3 text-slate-500" />
                        <span>Riwayat ({unit.riwayatKodeGadai.length})</span>
                      </span>
                    )}
                  </div>

                  <BatteryIndicator level={unit.batteryLevel} isCharging={isCharging} size="sm" />
                </div>

                {/* BARIS 2: Merk Sepeda + Nama Nasabah (kiri) & Status Kondisi / Antrian Charge (kanan) */}
                <div className="flex items-start justify-between gap-2 pt-1.5">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => setDetailUnit(unit)}
                    title="Klik untuk melihat detail lengkap unit"
                  >
                    <h4 className="text-[14px] font-semibold text-slate-900 truncate leading-snug">
                      {unit.merkSepeda}
                    </h4>
                    <p className="text-[12px] text-slate-500 truncate leading-tight mt-0.5">
                      {unit.namaNasabah}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <BatteryConditionBadge
                      condition={unit.kondisiBaterai || 'PRIMA'}
                      size="sm"
                      onClick={() => setDetailUnit(unit)}
                    />

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
                </div>

                {/* BARIS 3 (META): Ikon Jam + Waktu Charge • Ikon Kalender + Jatuh Tempo, serta Catatan Informatif 1 Baris */}
                <div className="pt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[12px] flex-wrap">
                    <span className={`inline-flex items-center gap-1 ${
                      isCriticalOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'
                    }`}>
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${isCriticalOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span>Charge {daysAgo === 0 ? 'hari ini' : `${daysAgo} hari lalu`}</span>
                      {isCriticalOverdue && (
                        <span className="text-[11px] font-bold text-rose-600">(Segera charge)</span>
                      )}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Jatuh tempo {jatuhTempoDate}</span>
                    </span>
                  </div>

                  {/* Catatan informatif biasa: 1 baris teks abu-abu kecil (12-13px), tanpa kotak, tanpa emoji, ellipsis */}
                  {unit.catatanBaterai && (
                    <div
                      onClick={() => setDetailUnit(unit)}
                      className="text-[12px] text-slate-500 truncate cursor-pointer hover:text-slate-700 flex items-center gap-1 pt-0.5"
                      title={unit.catatanBaterai}
                    >
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{unit.catatanBaterai}</span>
                    </div>
                  )}
                </div>

                {/* BARIS 4: Aksi dengan Hierarki Jelas (Charge, Perpanjang, dan Titik Tiga ⋯) */}
                <div className="pt-2.5 flex items-center gap-2">
                  {/* Tombol Utama: Charge (solid sky, h-11, fleksibel) */}
                  <button
                    onClick={() => handleQuickEnqueue(unit)}
                    disabled={isCharging || isWaiting}
                    className={`h-11 flex-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                      isCharging || isWaiting
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                    }`}
                    title={isCharging ? "Sedang di-charge" : isWaiting ? "Sedang dalam antrian" : "Mulai / jadwalkan charge"}
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isCharging ? "Sedang Di-charge" : isWaiting ? "Dalam Antrian" : "Charge"}</span>
                  </button>

                  {/* Tombol Sekunder: Perpanjang (outline, h-11) */}
                  <button
                    onClick={() => onNavigateToPerpanjang(unit.id)}
                    className="h-11 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
                    title="Perpanjang nomor gadai"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Perpanjang</span>
                  </button>

                  {/* Tombol Titik Tiga (⋯) 44x44px untuk membuka Bottom Sheet Aksi */}
                  <button
                    onClick={() => setActionSheetUnit(unit)}
                    className="h-11 w-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 active:scale-95 flex items-center justify-center shrink-0 transition-all"
                    title="Menu aksi lainnya (Audit Baterai, Tebus, Lelang)"
                    aria-label="Aksi Lainnya"
                  >
                    <MoreHorizontal className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. BOTTOM SHEET AKSI (⋯) */}
      {actionSheetUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            {/* Header Bottom Sheet */}
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Aksi Unit #{actionSheetUnit.kodeGadai}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[280px]">
                  {actionSheetUnit.merkSepeda} • {actionSheetUnit.namaNasabah}
                </p>
              </div>
              <button
                onClick={() => setActionSheetUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Items List */}
            <div className="space-y-1.5 pt-1">
              {/* Action 1: Audit Baterai (Line icon ShieldCheck) */}
              <button
                onClick={() => {
                  const target = actionSheetUnit;
                  setActionSheetUnit(null);
                  setAuditingUnit(target);
                }}
                className="w-full min-h-[44px] p-2.5 rounded-xl text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">Audit Baterai</div>
                  <div className="text-[11px] text-slate-500">Catat voltase, kesehatan sel, dan kondisi fisik</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>

              {/* Action 2: Tebus Unit (Line icon CheckCircle2) */}
              <button
                onClick={() => handleTebusConfirm(actionSheetUnit)}
                className="w-full min-h-[44px] p-2.5 rounded-xl text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">Tebus Unit</div>
                  <div className="text-[11px] text-slate-500">Pelunasan pinjaman gadai &amp; serah terima sepeda</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </button>

              {/* Divider sebelum aksi besar Lelang */}
              <div className="border-t border-slate-100 my-1" />

              {/* Action 3: Pindah ke Lelang (Line icon Gavel, dipisahkan styling tersendiri) */}
              <button
                onClick={() => handleMoveToLelang(actionSheetUnit)}
                className="w-full min-h-[44px] p-2.5 rounded-xl text-left flex items-center gap-3 bg-purple-50/60 hover:bg-purple-100/70 text-purple-900 border border-purple-200/80 transition-colors active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Gavel className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-purple-950">Pindahkan ke Lelang</div>
                  <div className="text-[11px] text-purple-700">Lepas unit jatuh tempo ke lelang barang</div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
              </button>
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                onClick={() => setActionSheetUnit(null)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. DETAIL UNIT SHEET (DIBUKA SAAT KARTU DI-TAP) */}
      {detailUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3.5 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 uppercase">
                  Detail Unit Gadai
                </span>
                <h3 className="text-base font-bold text-slate-900 font-mono mt-1">
                  #{detailUnit.kodeGadai}
                </h3>
              </div>
              <button
                onClick={() => setDetailUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup Detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="text-slate-500 text-[11px]">Informasi Sepeda &amp; Nasabah</div>
                <div className="font-bold text-slate-900 text-sm">{detailUnit.merkSepeda}</div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{detailUnit.namaNasabah}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-1">Kondisi Baterai</span>
                  <BatteryConditionBadge condition={detailUnit.kondisiBaterai || 'PRIMA'} size="sm" />
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-1">Daya Tersisa</span>
                  <BatteryIndicator level={detailUnit.batteryLevel} isCharging={detailUnit.statusCharger === 'CHARGING'} size="sm" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Terakhir Di-charge:</span>
                  <span className="font-semibold text-slate-800">
                    {detailUnit.lastChargedAt
                      ? new Date(detailUnit.lastChargedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'Belum pernah di-charge'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Jatuh Tempo:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(detailUnit.jatuhTempoAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Catatan Lengkap Fisik / Baterai */}
              {detailUnit.catatanBaterai && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Catatan Fisik &amp; Baterai:</span>
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                    {detailUnit.catatanBaterai}
                  </p>
                </div>
              )}

              {/* Riwayat Mutasi Kode Gadai Jika Ada */}
              {Array.isArray(detailUnit.riwayatKodeGadai) && detailUnit.riwayatKodeGadai.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Riwayat Perpanjangan Akad:</span>
                  </div>
                  <div className="space-y-1">
                    {detailUnit.riwayatKodeGadai.map((rk, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="font-mono font-semibold">#{rk.kodeGadai}</span>
                        <span className="text-slate-400">
                          {new Date(rk.perpanjangAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  const target = detailUnit;
                  setDetailUnit(null);
                  setAuditingUnit(target);
                }}
                className="h-11 flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Baterai</span>
              </button>
              <button
                onClick={() => setDetailUnit(null)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL AUDIT BATERAI */}
      {auditingUnit && (
        <AuditBatteryModal
          unit={auditingUnit}
          onClose={() => setAuditingUnit(null)}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}

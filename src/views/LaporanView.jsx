import React, { useState, useMemo } from 'react';
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
  Filter,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  Layers,
  ArrowRight,
  Download,
  Check,
  Info
} from 'lucide-react';
import { exportLaporanExcel, generatePdfReport } from '../services/reportExport';
import { getDaysSinceLastCharge, getChargeAuditInfo } from '../services/chargerQueue';
import { extendGadaiUnit, redeemGadaiUnit, normalizeHistoryEntry } from '../services/storage';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import BatteryIndicator from '../components/BatteryIndicator';
import ChargeAuditBadge from '../components/ChargeAuditBadge';
import AuditBatteryModal from '../components/AuditBatteryModal';
import ExcelSyncModal from '../components/ExcelSyncModal';
import RiwayatPerpanjanganCard from '../components/RiwayatPerpanjanganCard';

export default function LaporanView({ units = [], onNotify, initialAction = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('SEMUA'); // 'SEMUA' | 'AKTIF' | 'LELANG' | 'DITEBUS' | 'MUTASI' | 'BERMASALAH'
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState(null);

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

  // Handle initialAction passed from props
  React.useEffect(() => {
    if (initialAction?.type === 'perpanjang' && initialAction.unitId) {
      const u = units.find(item => item.id === initialAction.unitId);
      if (u) setPerpanjangUnit(u);
    } else if (initialAction?.type === 'tebus' && initialAction.unitId) {
      const u = units.find(item => item.id === initialAction.unitId);
      if (u) setTebusUnit(u);
    }
  }, [initialAction, units]);

  // Statistik Unit
  const stats = useMemo(() => {
    const total = units.length;
    const aktif = units.filter(u => u.statusBarang === 'AKTIF').length;
    const lelang = units.filter(u => u.statusBarang === 'LELANG').length;
    const ditebus = units.filter(u => u.statusBarang === 'DITEBUS').length;
    const mutasi = units.filter(u => Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.length > 0).length;
    const bermasalah = units.filter(u => u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA').length;
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
      result = result.filter(u => u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA');
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
          (u.kondisiBaterai && u.kondisiBaterai.toLowerCase().includes(q));

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
      const res = exportLaporanExcel(units, statusFilter);
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
      const res = generatePdfReport(units, { filterStatus: statusFilter });
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
      onNotify({ title: 'Nomor Gadai Baru Wajib Diisi', message: 'Silakan masukkan nomor gadai baru.', type: 'warning' });
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

  return (
    <div className="space-y-4 pb-6">
      {/* HEADER SECTION */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Pusat Laporan & Mutasi E-Bike
            </h2>
            <p className="text-xs text-slate-500">
              Rekapitulasi semua status, ekspor laporan, dan sinkronisasi
            </p>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-500/20 active:scale-95 transition-all hover:from-sky-600 hover:to-blue-700"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Auto-Sync</span>
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded-2xl border border-sky-100 shadow-xs text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fisik</p>
          <p className="text-base font-black text-slate-800">{stats.aktif + stats.lelang} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          <p className="text-[9.5px] text-sky-600 font-semibold">{stats.aktif} Aktif • {stats.lelang} Lelang</p>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-sky-100 shadow-xs text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ditebus</p>
          <p className="text-base font-black text-blue-700">{stats.ditebus} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          <p className="text-[9.5px] text-blue-500 font-semibold">Keluar Gudang</p>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-sky-100 shadow-xs text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bermasalah</p>
          <p className="text-base font-black text-rose-600">{stats.bermasalah} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          <p className="text-[9.5px] text-rose-500 font-semibold">Butuh Perhatian</p>
        </div>
      </div>

      {/* EXPORT ACTION BUTTONS */}
      <div className="bg-white rounded-3xl p-3.5 shadow-md border border-sky-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-sky-600" />
            Ekspor Dokumen Laporan
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Filter: <span className="font-bold text-sky-700">{statusFilter}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Tombol Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">Export Excel</div>
              <div className="text-[9.5px] text-emerald-600 font-normal">Format *.xlsx</div>
            </div>
          </button>

          {/* Tombol Generate PDF */}
          <button
            onClick={handleGeneratePdf}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-50 hover:bg-rose-100/80 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">Generate PDF</div>
              <div className="text-[9.5px] text-rose-600 font-normal">Lengkap + Foto</div>
            </div>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari no gadai, no lama, nasabah, masalah..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-sky-100 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'SEMUA', label: 'Semua', count: stats.total },
          { id: 'AKTIF', label: 'Aktif', count: stats.aktif },
          { id: 'LELANG', label: 'Lelang', count: stats.lelang },
          { id: 'DITEBUS', label: 'Ditebus', count: stats.ditebus },
          { id: 'MUTASI', label: 'Riwayat Mutasi', count: stats.mutasi },
          { id: 'BERMASALAH', label: 'Bermasalah', count: stats.bermasalah }
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-sky-100 hover:bg-sky-50/50'
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

      {/* UNIT CARDS LIST */}
      <div className="space-y-3">
        {filteredUnits.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-sky-100 shadow-sm">
            <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Tidak ada data sepeda listrik</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada data pada kategori ini'}
            </p>
          </div>
        ) : (
          filteredUnits.map((unit) => {
            const daysSinceCharge = getDaysSinceLastCharge(
              unit.lastChargedAt,
              unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null
            );
            const auditInfo = getChargeAuditInfo(
              unit.lastChargedAt,
              unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null
            );
            const hasHistory = Array.isArray(unit.riwayatKodeGadai) && unit.riwayatKodeGadai.length > 0;
            const isExpanded = expandedUnitId === unit.id;
            const isDefect = unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA';
            const isDitebus = unit.statusBarang === 'DITEBUS';

            return (
              <div
                key={unit.id}
                className={`bg-white rounded-3xl p-4 shadow-sm border transition-all ${
                  isDefect ? 'border-amber-200' : 'border-sky-100'
                }`}
              >
                {/* Header Card: Pawn Ticket, Status & History Badge */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                      #{unit.kodeGadai}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        unit.statusBarang === 'AKTIF'
                          ? 'bg-emerald-100 text-emerald-800'
                          : unit.statusBarang === 'LELANG'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {unit.statusBarang === 'DITEBUS' ? 'DITEBUS (Keluar)' : unit.statusBarang}
                    </span>

                    {/* History Mutasi Badge */}
                    {hasHistory && (
                      <span className="text-[9.5px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Pernah Diperpanjang
                      </span>
                    )}
                  </div>

                  <BatteryConditionBadge kondisi={unit.kondisiBaterai} />
                </div>

                {/* Bike Model & Customer Info */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 leading-tight">
                        {unit.merkSepeda}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Nasabah: <strong className="text-slate-700">{unit.namaNasabah}</strong></span>
                      </p>
                    </div>
                    <BatteryIndicator level={unit.batteryLevel} size="sm" />
                  </div>

                  {/* Charging & Overdue Stats */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
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
                </div>

                {/* Defect / Problem Notes Highlight Box */}
                {unit.catatanBaterai && (
                  <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] space-y-0.5">
                    <div className="flex items-center gap-1 text-amber-800 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Catatan Khusus Baterai / Masalah Fisik:</span>
                    </div>
                    <p className="text-slate-700 pl-4">{unit.catatanBaterai}</p>
                  </div>
                )}

                {/* Expanded Details: Mutation History & Previous Notes */}
                {hasHistory && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                      className="w-full flex items-center justify-between text-[11px] text-amber-800 font-bold hover:text-amber-900"
                    >
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-amber-600" />
                        Riwayat Mutasi & Catatan Lama ({unit.riwayatKodeGadai.length})
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {unit.riwayatKodeGadai.map((rawEntry, hIdx) => {
                          const entry = normalizeHistoryEntry(rawEntry);
                          return (
                            <div
                              key={hIdx}
                              className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-500">
                                  Nomor Sebelumnya: <strong className="text-amber-700">#{entry.kodeGadaiLama}</strong>
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(entry.tanggalPerpanjangan).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                              <p className="text-slate-600">
                                <span className="font-semibold text-slate-700">Catatan Kondisi di Nomor Lama: </span>
                                {entry.catatanLama || 'Tidak ada catatan khusus.'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Footer Buttons (hanya untuk unit aktif/lelang) */}
                {!isDitebus && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setAuditUnit(unit)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        setPerpanjangUnit(unit);
                        setNewKodeGadai('');
                        setCatatanPerpanjang(unit.catatanBaterai || '');
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Perpanjang</span>
                    </button>

                    <button
                      onClick={() => {
                        setTebusUnit(unit);
                        setCatatanTebus('');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tebus</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: EXCEL AUTO-SYNC */}
      <ExcelSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        units={units}
        onNotify={onNotify}
      />

      {/* MODAL 2: AUDIT BATTERY */}
      {auditUnit && (
        <AuditBatteryModal
          unit={auditUnit}
          onClose={() => setAuditUnit(null)}
          onNotify={onNotify}
        />
      )}

      {/* MODAL 3: QUICK PERPANJANG */}
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

      {/* MODAL 4: QUICK TEBUS */}
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
    </div>
  );
}

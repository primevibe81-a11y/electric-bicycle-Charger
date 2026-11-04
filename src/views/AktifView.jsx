import React, { useState } from 'react';
import {
  Bike,
  Plus,
  Search,
  Zap,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  History,
  AlertTriangle,
  Gavel,
  RefreshCw,
  CheckCircle2,
  X,
  AlertOctagon,
  Clock,
  ArrowDownUp
} from 'lucide-react';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import ChargeAuditBadge from '../components/ChargeAuditBadge';
import AuditBatteryModal from '../components/AuditBatteryModal';
import { createGadaiUnit, enqueueUnitForCharging, moveToLelang } from '../services/storage';
import { BATTERY_CONDITIONS, getChargeAuditInfo } from '../services/chargerQueue';

export default function AktifView({ units, onNotify, onNavigateToPerpanjang, onNavigateToTebus }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'CRITICAL' | 'DEFECT'
  const [sortBy, setSortBy] = useState("DEFAULT"); // 'DEFAULT' | 'OLDEST_CHARGED'
  const [auditingUnit, setAuditingUnit] = useState(null);

  // Form states
  const [kodeGadai, setKodeGadai] = useState("");
  const [merkSepeda, setMerkSepeda] = useState("");
  const [namaNasabah, setNamaNasabah] = useState("");
  const [batteryLevel, setBatteryLevel] = useState("100");
  const [kondisiBaterai, setKondisiBaterai] = useState("PRIMA");
  const [catatanBaterai, setCatatanBaterai] = useState("");
  const [jatuhTempoDays, setJatuhTempoDays] = useState("30");

  const aktifUnits = units.filter(u => u.statusBarang === 'AKTIF');

  // Filter & Search
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
      const audit = getChargeAuditInfo(u.lastChargedAt, u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000);
      return audit.isCritical;
    }
    if (filterType === 'DEFECT') {
      return u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA';
    }
    return true;
  });

  // Sorting
  if (sortBy === 'OLDEST_CHARGED') {
    processedUnits.sort((a, b) => {
      const timeA = Number(a.lastChargedAt) || 0;
      const timeB = Number(b.lastChargedAt) || 0;
      return timeA - timeB; // Ascending: waktu terkecil (terlama belum di-charge) di posisi paling atas
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
      onNotify({
        title: "Pindah ke Lelang",
        message: `Unit #${unit.kodeGadai} kini masuk daftar Lelang.`,
        type: "info"
      });
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header bar with count & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Unit Gadai Aktif</h2>
          <p className="text-xs text-slate-500">Total {aktifUnits.length} unit sepeda listrik aktif</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-10 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-sky-200 active:scale-95 transition-all flex items-center gap-1.5"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? "Tutup Form" : "Tambah Baru"}</span>
        </button>
      </div>

      {/* FORM INPUT UNIT GADAI BARU (DENGAN AUDIT BATERAI) */}
      {showAddForm && (
        <div className="bg-white rounded-3xl p-4 shadow-lg border border-sky-100 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Form Pendaftaran Unit Gadai</h3>
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 active:scale-[0.98] transition-all"
              >
                Simpan Data Gadai Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SORT BAR */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode akad / nasabah / merk sepeda..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills & Sort Selector */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua ({aktifUnits.length})
            </button>
            <button
              onClick={() => setFilterType('CRITICAL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                filterType === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertOctagon className="w-3 h-3" />
              <span>&gt;14 Hari Belum Charge</span>
            </button>
            <button
              onClick={() => setFilterType('DEFECT')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterType === 'DEFECT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Baterai Bermasalah
            </button>
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'DEFAULT' ? 'OLDEST_CHARGED' : 'DEFAULT')}
            className={`p-1.5 rounded-xl border text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all ${
              sortBy === 'OLDEST_CHARGED'
                ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
            title="Urutkan dari yang paling lama belum di-charge"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Urut: Terlama Charge</span>
          </button>
        </div>
      </div>

      {/* LIST KARTU UNIT GADAI AKTIF */}
      <div className="space-y-3">
        {processedUnits.length === 0 ? (
          <div className="bg-white/80 rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
            {searchQuery || filterType !== 'ALL'
              ? "Tidak ada unit dengan kriteria filter tersebut."
              : "Belum ada unit sepeda aktif."}
          </div>
        ) : (
          processedUnits.map((unit) => {
            const isCharging = unit.statusCharger === 'CHARGING';
            const isWaiting = unit.statusCharger === 'WAITING';
            const jatuhTempoDate = new Date(unit.jatuhTempoAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={unit.id}
                className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-sky-100 shadow-xs hover:border-sky-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base font-black text-slate-900 font-mono">
                        #{unit.kodeGadai}
                      </span>

                      {/* Status Charger Badge */}
                      {isCharging && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 animate-pulse flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-sky-600" /> Di-Charge
                        </span>
                      )}
                      {isWaiting && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Antrian
                        </span>
                      )}

                      {/* Badge Riwayat Perpanjangan jika pernah mutasi kode */}
                      {Array.isArray(unit.riwayatKodeGadai) && unit.riwayatKodeGadai.length > 0 && (
                        <span
                          onClick={() => onNavigateToPerpanjang(unit.id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 flex items-center gap-1 transition-colors"
                          title="Klik untuk melihat riwayat mutasi perpanjangan unit ini"
                        >
                          <History className="w-3 h-3 text-amber-600" />
                          <span>Pernah Diperpanjang</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 mt-1">
                      {unit.merkSepeda}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{unit.namaNasabah}</span>
                    </p>

                    {/* Badge Kondisi & Audit Siklus Baterai */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <BatteryConditionBadge
                        condition={unit.kondisiBaterai || 'PRIMA'}
                        onClick={() => setAuditingUnit(unit)}
                      />
                      <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} />
                    </div>

                    {unit.catatanBaterai && (
                      <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-[320px]">
                        📝 {unit.catatanBaterai}
                      </p>
                    )}
                  </div>

                  <BatteryIndicator level={unit.batteryLevel} isCharging={isCharging} size="sm" />
                </div>

                {/* Banner Peringatan Kritis Jika > 14 Hari Belum Di-charge */}
                <div className="mt-2.5">
                  <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} showFullAlert={true} />
                </div>

                {/* Info Riwayat & Jatuh Tempo */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Jatuh Tempo: <strong>{jatuhTempoDate}</strong></span>
                  </div>

                  <button
                    onClick={() => setAuditingUnit(unit)}
                    className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-100 active:scale-95 transition-all"
                  >
                    ✏️ Audit Baterai
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleQuickEnqueue(unit)}
                    disabled={isCharging || isWaiting}
                    className={`h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                      isCharging || isWaiting
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 active:scale-95"
                    }`}
                    title="Masukkan ke antrian charger"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Charge</span>
                  </button>

                  <button
                    onClick={() => onNavigateToPerpanjang(unit.id)}
                    className="h-8 rounded-xl text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="Perpanjang nomor gadai"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Perpanjang</span>
                  </button>

                  <button
                    onClick={() => onNavigateToTebus(unit.id)}
                    className="h-8 rounded-xl text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="Tebus unit gadai"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Tebus</span>
                  </button>

                  <button
                    onClick={() => handleMoveToLelang(unit)}
                    className="h-8 rounded-xl text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title="Pindah ke daftar lelang"
                  >
                    <Gavel className="w-3 h-3" />
                    <span>Lelang</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL AUDIT BATERAI */}
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

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  BatteryCharging,
  PlusCircle,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  XCircle,
  Bike,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Sliders,
  AlertOctagon,
  Calendar
} from 'lucide-react';
import {
  getRemainingChargeTime,
  sortWaitingQueue,
  MAX_QUEUE_LIMIT,
  DEFAULT_CHARGE_DURATION_MS,
  CHARGE_PRESETS,
  getChargeAuditInfo
} from '../services/chargerQueue';
import {
  finishChargingUnit,
  startChargingUnit,
  cancelWaitingQueue,
  enqueueUnitForCharging
} from '../services/storage';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import ChargeAuditBadge from '../components/ChargeAuditBadge';

export default function DashboardView({ units, onNotify, onSelectTab }) {
  const [nowTick, setNowTick] = useState(Date.now());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [inputBattery, setInputBattery] = useState("100");
  const [selectedDurationMs, setSelectedDurationMs] = useState(DEFAULT_CHARGE_DURATION_MS);
  const [customHours, setCustomHours] = useState("3");
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [showDirectStartModal, setShowDirectStartModal] = useState(false);
  const [targetStartUnitId, setTargetStartUnitId] = useState("");

  // Timer update interval (1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter unit yang sedang di-charge (Maks 1 unit)
  const chargingUnit = units.find(u => u.statusCharger === 'CHARGING');

  // Filter dan urutkan antrian tunggu: Prioritas BATERAI TERENDAH di Urutan #1
  const rawWaiting = units.filter(u => u.statusCharger === 'WAITING');
  const sortedWaiting = sortWaitingQueue(rawWaiting);

  // Unit yang memenuhi syarat untuk dimasukkan ke antrian (AKTIF atau LELANG yang IDLE)
  const eligibleUnits = units.filter(
    u => (u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG') &&
         u.statusCharger === 'IDLE'
  );

  // Hitung unit dengan status audit kritis (>14 hari belum di-charge)
  const criticalUnits = units.filter(u => {
    if (u.statusBarang !== 'AKTIF' && u.statusBarang !== 'LELANG') return false;
    const audit = getChargeAuditInfo(u.lastChargedAt, u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000);
    return audit.isCritical;
  });

  // Periksa sisa waktu charger dengan durasi dinamis
  const chargeTimeInfo = chargingUnit
    ? getRemainingChargeTime(chargingUnit.chargeEndAt, chargingUnit.chargeDurationMs)
    : null;

  const currentDurationHours = chargingUnit
    ? Math.round((Number(chargingUnit.chargeDurationMs || DEFAULT_CHARGE_DURATION_MS) / (1000 * 60 * 60)) * 10) / 10
    : 3;

  const handleFinishCharging = (unitId) => {
    const result = finishChargingUnit(unitId);
    if (result.success) {
      onNotify({
        title: "Selesai Di-Charge!",
        message: result.message,
        type: "success"
      });
    }
  };

  const handleCancelQueue = (unitId, kodeGadai) => {
    if (window.confirm(`Keluarkan unit ${kodeGadai} dari antrian tunggu?`)) {
      cancelWaitingQueue(unitId);
      onNotify({
        title: "Antrian Dibatalkan",
        message: `Unit ${kodeGadai} dikeluarkan dari antrian tunggu.`,
        type: "info"
      });
    }
  };

  const openDurationPickerForStart = (unitId) => {
    setTargetStartUnitId(unitId);
    setShowDirectStartModal(true);
  };

  const handleConfirmStartCharging = () => {
    const unitId = targetStartUnitId;
    if (!unitId) return;

    let finalDuration = selectedDurationMs;
    if (isCustomDuration) {
      const h = Math.max(0.5, Math.min(12, Number(customHours) || 3));
      finalDuration = Math.round(h * 60 * 60 * 1000);
    }

    const result = startChargingUnit(unitId, finalDuration);
    setShowDirectStartModal(false);
    setTargetStartUnitId("");

    if (result.success) {
      onNotify({
        title: "Mulai Di-Charge",
        message: result.message,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Memulai",
        message: result.message,
        type: "warning"
      });
    }
  };

  const handleEnqueueSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      onNotify({ title: "Pilih Unit", message: "Silakan pilih unit sepeda listrik terlebih dahulu.", type: "warning" });
      return;
    }

    const res = enqueueUnitForCharging(selectedUnitId, Number(inputBattery));
    if (res.success) {
      setShowAddModal(false);
      setSelectedUnitId("");
      onNotify({
        title: "Berhasil Masuk Antrian",
        message: res.message,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Menambah Antrian",
        message: res.message,
        type: "warning"
      });
    }
  };

  const isQueueFull = sortedWaiting.length >= MAX_QUEUE_LIMIT;

  return (
    <div className="space-y-4 pb-6">
      {/* BANNER AUDIT SMART ALERT (>14 HARI) */}
      {criticalUnits.length > 0 && (
        <div
          onClick={() => onSelectTab('aktif')}
          className="p-3 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-900 leading-tight">
                ⚠️ {criticalUnits.length} Sepeda Perlu Segera Di-Charge!
              </p>
              <p className="text-[10px] text-rose-700 mt-0.5">
                Sudah &gt;14 hari tanpa pengisian daya (risiko baterai drop/rusak total).
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-500 shrink-0" />
        </div>
      )}

      {/* 1. SLOT CHARGER AKTIF (1 SLOT UTAMA DENGAN DURASI DINAMIS) */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping"></span>
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Slot Charger Aktif (1 Unit)
            </h2>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-sky-600" />
            Durasi: {chargingUnit ? `${currentDurationHours} Jam` : 'Dinamis (1-4 Jam)'}
          </span>
        </div>

        {chargingUnit ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white p-5 shadow-lg shadow-sky-500/25">
            {/* Header Card */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold tracking-wide uppercase">
                    <BatteryCharging className="w-3 h-3 text-amber-300 animate-bounce" />
                    Sedang Mengisi Daya
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-100">
                    Durasi: {currentDurationHours} Jam
                  </span>
                  {chargingUnit.kondisiBaterai && chargingUnit.kondisiBaterai !== 'PRIMA' && (
                    <BatteryConditionBadge condition={chargingUnit.kondisiBaterai} size="xs" />
                  )}
                </div>

                <h3 className="text-2xl font-black tracking-tight mt-1.5">
                  #{chargingUnit.kodeGadai}
                </h3>
                <p className="text-xs text-sky-100 font-medium mt-0.5">
                  {chargingUnit.merkSepeda} • {chargingUnit.namaNasabah}
                </p>
                {chargingUnit.catatanBaterai && (
                  <p className="text-[10px] text-amber-200 mt-1 italic max-w-[280px]">
                    Catatan: {chargingUnit.catatanBaterai}
                  </p>
                )}
              </div>

              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-2xl text-right">
                <span className="text-[10px] block text-sky-100 font-medium">Baterai Awal</span>
                <span className="text-sm font-black text-white">{chargingUnit.batteryLevel}%</span>
              </div>
            </div>

            {/* Countdown Timer Digital & Progress Bar */}
            <div className="my-4 bg-sky-950/25 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
              <span className="text-[11px] uppercase tracking-widest text-sky-200 font-semibold flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Sisa Waktu Pengisian
              </span>
              <div className="text-3xl font-black tracking-widest font-mono my-1 text-white">
                {chargeTimeInfo?.formatted}
              </div>

              {/* Dynamic Progress Bar */}
              <div className="w-full bg-sky-900/50 rounded-full h-2.5 overflow-hidden mt-3 p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-300 via-sky-200 to-emerald-300 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${chargeTimeInfo?.progressPercent || 0}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-sky-200 font-medium mt-1.5 px-0.5">
                <span>Progress: {chargeTimeInfo?.progressPercent}%</span>
                <span>{chargeTimeInfo?.isFinished ? "Pengisian Selesai" : `Total ${currentDurationHours} Jam`}</span>
              </div>
            </div>

            {/* Tombol Aksi Selesai / Cabut Charger */}
            <div className="flex gap-2">
              <button
                onClick={() => handleFinishCharging(chargingUnit.id)}
                className="w-full h-12 bg-white text-sky-700 font-bold text-xs rounded-2xl shadow-md hover:bg-sky-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Selesai & Cabut Charger (100%)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Slot Kosong */
          <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Slot Charger Sedang Kosong</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              {sortedWaiting.length > 0
                ? "Ada unit di antrian tunggu siap dinaikkan ke slot charger."
                : "Belum ada unit yang di-charge saat ini."}
            </p>

            {sortedWaiting.length > 0 ? (
              <button
                onClick={() => openDurationPickerForStart(sortedWaiting[0].id)}
                className="h-11 px-5 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 hover:from-sky-600 hover:to-sky-700 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Atur Durasi & Naikkan Antrian #1 (#{sortedWaiting[0].kodeGadai})</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="h-11 px-5 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Pilih Unit untuk Di-Charge</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 2. DAFTAR ANTRIAN PRIORITAS (MAKSIMAL 2 UNIT, BATERAI TERENDAH DI POSISI #1) */}
      <section className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Antrian Prioritas
            </h2>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-full ${
                isQueueFull
                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {sortedWaiting.length}/{MAX_QUEUE_LIMIT} Unit
            </span>
          </div>

          <span className="text-[11px] text-sky-700 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Prioritas: Baterai Rendah
          </span>
        </div>

        {/* Info banner jika antrian penuh */}
        {isQueueFull && (
          <div className="mb-3 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Antrian penuh (Maksimal 2 unit). Tunggu salah satu unit selesai di-charge.</span>
          </div>
        )}

        {/* List Antrian */}
        <div className="space-y-2.5">
          {sortedWaiting.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-5 border border-sky-100 text-center text-xs text-slate-500">
              Antrian tunggu saat ini kosong.
            </div>
          ) : (
            sortedWaiting.map((unit, index) => {
              const isFirstPriority = index === 0;

              return (
                <div
                  key={unit.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isFirstPriority
                      ? "bg-white/95 border-sky-300 shadow-md shadow-sky-100 ring-2 ring-sky-400/20"
                      : "bg-white/80 border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      {/* Urutan Badge */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isFirstPriority
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-slate-900">
                            #{unit.kodeGadai}
                          </span>
                          {unit.statusBarang === 'LELANG' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700">
                              Lelang
                            </span>
                          )}
                          {isFirstPriority && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 animate-pulse">
                              Prioritas #1
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {unit.merkSepeda} • {unit.namaNasabah}
                        </p>

                        {/* Audit & Condition badges */}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <BatteryConditionBadge condition={unit.kondisiBaterai || 'PRIMA'} size="xs" />
                          <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} />
                        </div>
                      </div>
                    </div>

                    {/* Indikator Baterai */}
                    <BatteryIndicator level={unit.batteryLevel} size="sm" />
                  </div>

                  {/* Action buttons on card */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Tunggu: {Math.max(1, Math.round((Date.now() - (unit.queuedAt || Date.now())) / 60000))} mnt lalu
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCancelQueue(unit.id, unit.kodeGadai)}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        Batalkan
                      </button>

                      {!chargingUnit && isFirstPriority && (
                        <button
                          onClick={() => openDurationPickerForStart(unit.id)}
                          className="text-[11px] font-bold bg-sky-500 text-white px-2.5 py-1 rounded-lg shadow-xs hover:bg-sky-600 active:scale-95 transition-all"
                        >
                          Naikkan Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tombol Tambah ke Antrian */}
        <div className="mt-4">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={isQueueFull}
            className={`w-full h-12 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              isQueueFull
                ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                : "bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white shadow-sky-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {isQueueFull
                ? "Antrian Penuh (Maks 2 Unit)"
                : "Tambah Unit ke Antrian Charger"}
            </span>
          </button>
        </div>
      </section>

      {/* 3. MODAL PILIH DURASI CHARGER SEBELUM MULAI (FITUR DURASI DINAMIS) */}
      {showDirectStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[390px] bg-white rounded-3xl p-5 shadow-2xl border border-sky-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Tentukan Durasi Charger</h3>
                  <p className="text-[11px] text-slate-400">Pilih durasi pengisian sesuai kebutuhan unit</p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectStartModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {CHARGE_PRESETS.map((preset) => {
                const isSelected = !isCustomDuration && selectedDurationMs === preset.ms;
                return (
                  <button
                    key={preset.ms}
                    type="button"
                    onClick={() => {
                      setIsCustomDuration(false);
                      setSelectedDurationMs(preset.ms);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50 text-sky-800 ring-1 ring-sky-400"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{preset.label}</span>
                      <span className="text-[10px] text-slate-400">{preset.desc}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-sky-600 shrink-0" />}
                  </button>
                );
              })}

              {/* Kustom Durasi */}
              <button
                type="button"
                onClick={() => setIsCustomDuration(true)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isCustomDuration
                    ? "border-sky-500 bg-sky-50 text-sky-800 ring-1 ring-sky-400"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Durasi Kustom</span>
                  <span className="text-[10px] text-slate-400">Tentukan jam manual (0.5 – 12 Jam)</span>
                </div>
                {isCustomDuration && <CheckCircle className="w-4 h-4 text-sky-600 shrink-0" />}
              </button>

              {isCustomDuration && (
                <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 mt-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Masukkan Jumlah Jam:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDirectStartModal(false)}
                className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmStartCharging}
                className="flex-1 h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4" />
                <span>Mulai Pengisian Daya</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL TAMBAH KE ANTRIAN CHARGER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-sky-100 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tambah ke Antrian Charger</h3>
                  <p className="text-[11px] text-slate-400">Prioritas otomatis berdasarkan baterai terendah</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {eligibleUnits.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500 mb-3">
                  Tidak ada unit berstatus Aktif atau Lelang yang tersedia (semua sedang di-charge atau mengantri).
                </p>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    onSelectTab('aktif');
                  }}
                  className="px-4 py-2 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold border border-sky-200"
                >
                  Lihat Daftar Unit di Tab Aktif
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnqueueSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Sepeda Listrik
                  </label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => {
                      setSelectedUnitId(e.target.value);
                      const unit = eligibleUnits.find(u => u.id === e.target.value);
                      if (unit) setInputBattery(String(unit.batteryLevel));
                    }}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">-- Pilih Nomor Gadai --</option>
                    {eligibleUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        #{u.kodeGadai} - {u.merkSepeda} ({u.namaNasabah}) [Baterai: {u.batteryLevel}%]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Persentase Baterai Saat Ini (0 - 100%)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={inputBattery}
                    onChange={(e) => setInputBattery(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[11px] text-sky-700 mt-1 font-medium">
                    💡 Tips: Semakin rendah persentase baterai, unit akan otomatis diprioritaskan di Urutan #1.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-200 hover:bg-sky-700"
                  >
                    Masukkan Antrian
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

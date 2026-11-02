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
  Plus,
  Minus,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import {
  getRemainingChargeTime,
  sortWaitingQueue,
  DEFAULT_CHARGE_DURATION_MS,
  CHARGE_PRESETS,
  getChargeAuditInfo,
  getDaysSinceLastCharge,
  MIN_SLOTS_CAPACITY,
  MAX_SLOTS_CAPACITY
} from '../services/chargerQueue';
import {
  finishChargingUnit,
  cancelChargingUnit,
  startChargingUnit,
  cancelWaitingQueue,
  enqueueUnitForCharging,
  getChargerSlotsCapacity,
  setChargerSlotsCapacity,
  autoEnqueueOverdueUnits
} from '../services/storage';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import ChargeAuditBadge from '../components/ChargeAuditBadge';

export default function DashboardView({ units, onNotify, onSelectTab }) {
  const [nowTick, setNowTick] = useState(Date.now());
  const [slotsCapacity, setSlotsCapacity] = useState(() => getChargerSlotsCapacity());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [inputBattery, setInputBattery] = useState("100");
  const [selectedDurationMs, setSelectedDurationMs] = useState(DEFAULT_CHARGE_DURATION_MS);
  const [customHours, setCustomHours] = useState("3");
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [showDirectStartModal, setShowDirectStartModal] = useState(false);
  const [targetStartUnitId, setTargetStartUnitId] = useState("");
  const [queueSearchQuery, setQueueSearchQuery] = useState("");

  // Timer update interval (1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter unit yang sedang di-charge (Bisa lebih dari 1 unit sesuai kapasitas slot)
  const chargingUnits = units.filter(u => u.statusCharger === 'CHARGING');

  // Filter dan urutkan antrian tunggu: Prioritas >= 15 HARI SELALU DI POSISI TERATAS (#1)
  const rawWaiting = units.filter(u => u.statusCharger === 'WAITING');
  const sortedWaiting = sortWaitingQueue(rawWaiting);

  // Filter pencarian di dalam antrian prioritas
  const displayedWaiting = sortedWaiting.filter(u => {
    const q = queueSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.kodeGadai.toLowerCase().includes(q) ||
      u.merkSepeda.toLowerCase().includes(q) ||
      u.namaNasabah.toLowerCase().includes(q)
    );
  });

  // Unit yang memenuhi syarat untuk dimasukkan ke antrian (AKTIF atau LELANG yang IDLE)
  const eligibleUnits = units.filter(
    u => (u.statusBarang === 'AKTIF' || u.statusBarang === 'LELANG') &&
         u.statusCharger === 'IDLE'
  );

  // Hitung unit dengan status audit kritis (>=15 hari belum di-charge)
  const overdueUnits = units.filter(u => {
    if (u.statusBarang !== 'AKTIF' && u.statusBarang !== 'LELANG') return false;
    const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    return days >= 15;
  });

  const handleAdjustSlots = (delta) => {
    const current = getChargerSlotsCapacity();
    const nextVal = Math.min(MAX_SLOTS_CAPACITY, Math.max(MIN_SLOTS_CAPACITY, current + delta));
    setChargerSlotsCapacity(nextVal);
    setSlotsCapacity(nextVal);
    onNotify({
      title: "Kapasitas Slot Diperbarui",
      message: `Jumlah slot charger aktif disetel menjadi ${nextVal} slot.`,
      type: "info"
    });
  };

  const handleTriggerAutoQueue = () => {
    const { newlyEnqueued } = autoEnqueueOverdueUnits();
    if (newlyEnqueued > 0) {
      onNotify({
        title: "Sinkronisasi Antrian Otomatis",
        message: `${newlyEnqueued} unit yang sudah ≥15 hari belum di-charge telah otomatis masuk antrian prioritas.`,
        type: "success"
      });
    } else {
      onNotify({
        title: "Antrian Sudah Sinkron",
        message: "Seluruh unit yang sudah ≥15 hari sudah berada di dalam antrian.",
        type: "info"
      });
    }
  };

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

  // Batalkan sesi charger aktif (antisipasi salah input unit/slot)
  const handleCancelActiveCharging = (unit) => {
    if (window.confirm(`Salah input unit? Batalkan proses charger untuk unit #${unit.kodeGadai} dan kembalikan ke antrian tunggu?`)) {
      const res = cancelChargingUnit(unit.id, true);
      if (res.success) {
        onNotify({
          title: "Charger Dibatalkan",
          message: res.message,
          type: "info"
        });
      }
    }
  };

  const handleCancelQueue = (unitId, kodeGadai) => {
    if (window.confirm(`Keluarkan unit #${kodeGadai} dari antrian tunggu?`)) {
      cancelWaitingQueue(unitId);
      onNotify({
        title: "Antrian Dibatalkan",
        message: `Unit #${kodeGadai} dikeluarkan dari antrian tunggu.`,
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

  // Bangun array slot: dari index 0 sampai slotsCapacity - 1
  const slotIndices = Array.from({ length: slotsCapacity }, (_, i) => i);
  const emptySlotsCount = Math.max(0, slotsCapacity - chargingUnits.length);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. HEADER PENGATURAN SLOT CHARGER DINAMIS */}
      <section className="bg-white/90 backdrop-blur-md rounded-3xl p-4 border border-sky-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Slot Charger Dinamis
              </h2>
              <p className="text-[11px] text-slate-500">
                Terisi: <strong className="text-sky-700">{chargingUnits.length}</strong> dari <strong>{slotsCapacity} Colokan</strong>
              </p>
            </div>
          </div>

          {/* Stepper Tambah / Kurangi Slot Charger */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => handleAdjustSlots(-1)}
              disabled={slotsCapacity <= MIN_SLOTS_CAPACITY}
              className="w-7 h-7 rounded-xl bg-white text-slate-700 flex items-center justify-center font-bold text-sm shadow-xs hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kurangi 1 Slot Charger"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-slate-800 px-2 min-w-[20px] text-center">
              {slotsCapacity}
            </span>
            <button
              onClick={() => handleAdjustSlots(1)}
              disabled={slotsCapacity >= MAX_SLOTS_CAPACITY}
              className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs hover:bg-sky-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Tambah 1 Slot Charger"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. DAFTAR SLOT CHARGER AKTIF (MULTI-SLOT DENGAN FITUR BATALKAN) */}
      <section className="space-y-3">
        {slotIndices.map((slotIndex) => {
          const unit = chargingUnits[slotIndex];
          const slotNumber = slotIndex + 1;

          if (unit) {
            // SLOT TERISI UNIT
            const durationHours = Math.round((Number(unit.chargeDurationMs || DEFAULT_CHARGE_DURATION_MS) / (1000 * 60 * 60)) * 10) / 10;
            const timeInfo = getRemainingChargeTime(unit.chargeEndAt, unit.chargeDurationMs);

            return (
              <div
                key={unit.id}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white p-4 shadow-md shadow-sky-500/20"
              >
                {/* Header Slot */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-wide uppercase">
                        <BatteryCharging className="w-3 h-3 text-amber-300 animate-bounce" />
                        Slot #{slotNumber} Sedang Di-Charge
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-100">
                        Durasi: {durationHours} Jam
                      </span>
                      {unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA' && (
                        <BatteryConditionBadge condition={unit.kondisiBaterai} size="xs" />
                      )}
                    </div>

                    <h3 className="text-xl font-black tracking-tight mt-1 font-mono">
                      #{unit.kodeGadai}
                    </h3>
                    <p className="text-xs text-sky-100 font-medium">
                      {unit.merkSepeda} • {unit.namaNasabah}
                    </p>
                  </div>

                  <div className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl text-right">
                    <span className="text-[9px] block text-sky-100 font-medium">Baterai Awal</span>
                    <span className="text-xs font-black text-white">{unit.batteryLevel}%</span>
                  </div>
                </div>

                {/* Timer & Progress Bar */}
                <div className="my-3 bg-sky-950/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                  <span className="text-[10px] uppercase tracking-widest text-sky-200 font-semibold flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Sisa Waktu Pengisian
                  </span>
                  <div className="text-2xl font-black tracking-widest font-mono my-0.5 text-white">
                    {timeInfo.formatted}
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full bg-sky-900/50 rounded-full h-2 overflow-hidden mt-2 p-0.5 border border-white/10">
                    <div
                      className="bg-gradient-to-r from-amber-300 via-sky-200 to-emerald-300 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${timeInfo.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Aksi: Selesai Penuh (100%) vs Batalkan Charger (Salah Input) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFinishCharging(unit.id)}
                    className="flex-1 h-10 bg-white text-sky-700 font-bold text-xs rounded-xl shadow-sm hover:bg-sky-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Selesai (Baterai 100%)</span>
                  </button>

                  <button
                    onClick={() => handleCancelActiveCharging(unit)}
                    className="h-10 px-3.5 bg-rose-500/25 hover:bg-rose-600 text-white font-bold text-xs rounded-xl border border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-2xs"
                    title="Batalkan proses charger untuk unit ini jika terjadi salah input"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Batalkan</span>
                  </button>
                </div>
              </div>
            );
          } else {
            // SLOT KOSONG
            const nextInQueue = sortedWaiting[slotIndex - chargingUnits.length] || sortedWaiting[0];

            return (
              <div
                key={`empty-slot-${slotIndex}`}
                className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-4 text-center"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    Slot Charger #{slotNumber} Kosong
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Siap Digunakan
                  </span>
                </div>

                {sortedWaiting.length > 0 ? (
                  <button
                    onClick={() => openDurationPickerForStart(nextInQueue.id)}
                    className="w-full h-11 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs rounded-2xl shadow-sm shadow-sky-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>
                      Naikkan #{nextInQueue.kodeGadai} ke Slot #{slotNumber}
                      {getDaysSinceLastCharge(nextInQueue.lastChargedAt) >= 15 ? ' (⚡ Prioritas ≥15 Hari)' : ''}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full h-11 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4 text-sky-500" />
                    <span>Pilih Unit untuk Slot #{slotNumber}</span>
                  </button>
                )}
              </div>
            );
          }
        })}
      </section>

      {/* 3. ANTRIAN PRIORITAS (DENGAN FITUR PENCARIAN NOMOR GADAI) */}
      <section className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Antrian Prioritas
            </h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {sortedWaiting.length} Unit
            </span>
          </div>

          <button
            onClick={handleTriggerAutoQueue}
            className="text-[11px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 active:scale-95 transition-transform"
            title="Sinkronkan unit yang sudah ≥15 hari belum di-charge ke antrian"
          >
            <RefreshCw className="w-3 h-3 text-sky-600" />
            <span>Cek Otomatis (≥15 Hari)</span>
          </button>
        </div>

        {/* Info Box Prioritas */}
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-sky-50 border border-amber-200 mb-2.5 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 leading-snug">
            Unit yang sudah <strong>15 hari atau lebih</strong> belum di-charge otomatis diprioritaskan di antrian teratas.
          </p>
        </div>

        {/* FITUR PENCARIAN NOMOR GADAI DI ANTRIAN */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            placeholder="Cari nomor gadai di antrian (contoh: 26_0037...)..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {queueSearchQuery && (
            <button
              onClick={() => setQueueSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {queueSearchQuery && (
          <p className="text-[11px] text-slate-500 font-semibold mb-2 px-1">
            Menampilkan {displayedWaiting.length} dari {sortedWaiting.length} unit di antrian
          </p>
        )}

        {/* List Antrian */}
        <div className="space-y-2.5">
          {displayedWaiting.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-5 border border-sky-100 text-center text-xs text-slate-500">
              {queueSearchQuery ? `Nomor gadai "${queueSearchQuery}" tidak ditemukan di dalam antrian.` : 'Antrian tunggu saat ini kosong.'}
            </div>
          ) : (
            displayedWaiting.map((unit) => {
              // Temukan urutan asli di sortedWaiting
              const originalIndex = sortedWaiting.findIndex(u => u.id === unit.id);
              const isFirstPriority = originalIndex === 0;
              const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
              const isOverdue = daysAgo >= 15;

              return (
                <div
                  key={unit.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isOverdue
                      ? "bg-rose-50/70 border-rose-300 shadow-sm ring-1 ring-rose-200"
                      : isFirstPriority
                        ? "bg-white border-sky-300 shadow-sm ring-1 ring-sky-200"
                        : "bg-white/90 border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      {/* Urutan Asli Badge */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isOverdue
                            ? "bg-rose-600 text-white shadow-xs animate-pulse"
                            : isFirstPriority
                              ? "bg-sky-600 text-white shadow-xs"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        #{originalIndex + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-slate-900 font-mono">
                            #{unit.kodeGadai}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-600 text-white animate-pulse flex items-center gap-0.5">
                              ⚠️ Prioritas {daysAgo} Hari
                            </span>
                          )}
                          {unit.statusBarang === 'LELANG' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700">
                              Lelang
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

                      {emptySlotsCount > 0 && (
                        <button
                          onClick={() => openDurationPickerForStart(unit.id)}
                          className="text-[11px] font-bold bg-sky-500 text-white px-2.5 py-1 rounded-lg shadow-xs hover:bg-sky-600 active:scale-95 transition-all"
                        >
                          Naikkan ke Slot Kosong
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tombol Tambah ke Antrian Manual (Tanpa Batasan Kuota) */}
        <div className="mt-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full h-12 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white shadow-sky-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Unit Lain ke Antrian</span>
          </button>
        </div>
      </section>

      {/* 4. MODAL PILIH DURASI CHARGER SEBELUM MULAI */}
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
                  <p className="text-[11px] text-slate-400">Pilih durasi pengisian sesuai kondisi baterai</p>
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
                <span>Mulai Pengisian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL TAMBAH KE ANTRIAN CHARGER */}
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
                  <p className="text-[11px] text-slate-400">Unit ≥15 hari otomatis menjadi prioritas teratas</p>
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
                    {eligibleUnits.map(u => {
                      const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
                      return (
                        <option key={u.id} value={u.id}>
                          #{u.kodeGadai} - {u.merkSepeda} ({u.namaNasabah}) [{days >= 15 ? `⚠️ ${days} Hari!` : `Baterai ${u.batteryLevel}%`}]
                        </option>
                      );
                    })}
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
                    💡 Sistem otomatis menempatkan unit yang sudah ≥15 hari di posisi teratas (#1).
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

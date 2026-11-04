import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  BatteryCharging,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  XCircle,
  Bike,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  AlertOctagon,
  Plus,
  Minus,
  RefreshCw,
  Search,
  X,
  Smartphone,
  Play,
  Square,
  Volume2,
  Info,
  Settings
} from 'lucide-react';
import {
  getRemainingChargeTime,
  sortWaitingQueue,
  DEFAULT_CHARGE_DURATION_MS,
  CHARGE_PRESETS,
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
import {
  startLockScreenMonitor,
  stopLockScreenMonitor,
  updateLockScreenMonitor,
  getIsLockScreenMonitorActive
} from '../services/lockScreenMonitor';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';

export default function DashboardView({ units, onNotify, onSelectTab }) {
  const [nowTick, setNowTick] = useState(Date.now());
  const [slotsCapacity, setSlotsCapacity] = useState(() => getChargerSlotsCapacity());
  const [showSlotSettings, setShowSlotSettings] = useState(false);
  const [showLiveMonitorDetail, setShowLiveMonitorDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [inputBattery, setInputBattery] = useState("100");
  const [selectedDurationMs, setSelectedDurationMs] = useState(DEFAULT_CHARGE_DURATION_MS);
  const [customHours, setCustomHours] = useState("3");
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [showDirectStartModal, setShowDirectStartModal] = useState(false);
  const [targetStartUnitId, setTargetStartUnitId] = useState("");
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [isLiveMonitorOn, setIsLiveMonitorOn] = useState(() => getIsLockScreenMonitorActive());

  // Timer update interval (1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter unit yang sedang di-charge
  const chargingUnits = units.filter(u => u.statusCharger === 'CHARGING');

  // Sinkronisasi pembaruan Lock Screen Live Monitor
  useEffect(() => {
    if (isLiveMonitorOn) {
      updateLockScreenMonitor(chargingUnits);
    }
  }, [nowTick, isLiveMonitorOn, chargingUnits]);

  // Antrian tunggu: Unit >= 15 hari otomatis paling atas
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

  // Unit kritis (>= 15 hari belum di-charge)
  const overdueUnits = units.filter(u => {
    if (u.statusBarang !== 'AKTIF' && u.statusBarang !== 'LELANG') return false;
    const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    return days >= 15;
  });

  // Unit butuh charge (idle dan battery < 60% atau >= 7 hari)
  const needChargeUnits = units.filter(u => {
    if (u.statusBarang !== 'AKTIF' && u.statusBarang !== 'LELANG') return false;
    if (u.statusCharger !== 'IDLE') return false;
    const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    return Number(u.batteryLevel) < 60 || days >= 7;
  });

  const handleAdjustSlots = (delta) => {
    const current = getChargerSlotsCapacity();
    const nextVal = current + delta;

    if (delta < 0 && nextVal < chargingUnits.length) {
      onNotify({
        title: "Slot Sedang Terisi",
        message: `Tidak dapat mengurangi slot di bawah ${chargingUnits.length} karena unit sedang aktif diisi daya.`,
        type: "warning"
      });
      return;
    }

    const clamped = Math.min(MAX_SLOTS_CAPACITY, Math.max(MIN_SLOTS_CAPACITY, nextVal));
    setChargerSlotsCapacity(clamped);
    setSlotsCapacity(clamped);
    onNotify({
      title: "Kapasitas Slot Diperbarui",
      message: `Jumlah slot charger disetel menjadi ${clamped} colokan.`,
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

  const handleToggleLiveMonitor = async () => {
    if (isLiveMonitorOn) {
      await stopLockScreenMonitor();
      setIsLiveMonitorOn(false);
      onNotify({
        title: "Lock Screen Monitor Dimatikan",
        message: "Monitoring di layar kunci telah dinonaktifkan.",
        type: "info"
      });
    } else {
      const res = await startLockScreenMonitor(chargingUnits);
      if (res.success) {
        setIsLiveMonitorOn(true);
        onNotify({
          title: "Lock Screen Monitor Aktif",
          message: "Sisa waktu pengisian kini tampil langsung di layar kunci ponsel Anda.",
          type: "success"
        });
      } else {
        onNotify({
          title: "Gagal Mengaktifkan",
          message: res.error || "Izin audio atau notifikasi tidak dapat diaktifkan pada browser ini.",
          type: "warning"
        });
      }
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

  const slotIndices = Array.from({ length: slotsCapacity }, (_, i) => i);
  const emptySlotsCount = Math.max(0, slotsCapacity - chargingUnits.length);

  return (
    <div className="space-y-3 pb-8">
      {/* 1. RINGKASAN ANGKA PALING ATAS (TINGGI MAKSIMAL 72PX, PADDING 12PX) */}
      <section className="grid grid-cols-3 gap-2">
        {/* Card 1: Butuh Charge */}
        <div
          onClick={() => onSelectTab && onSelectTab('aktif')}
          className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs hover:border-sky-300 transition-all cursor-pointer max-h-[72px] flex flex-col justify-between"
          title="Lihat unit yang butuh di-charge"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold truncate">Butuh Charge</span>
            <BatteryCharging className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900 leading-none">{needChargeUnits.length}</span>
            <span className="text-[10px] text-slate-400">unit</span>
          </div>
        </div>

        {/* Card 2: Kritis */}
        <div
          onClick={() => onSelectTab && onSelectTab('aktif')}
          className="bg-rose-50/70 rounded-2xl p-2.5 border border-rose-200 shadow-xs hover:border-rose-400 transition-all cursor-pointer max-h-[72px] flex flex-col justify-between"
          title="Unit kritis belum di-charge ≥15 hari"
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-semibold truncate">Kritis ≥15 Hari</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-rose-700 leading-none">{overdueUnits.length}</span>
            <span className="text-[10px] text-rose-500">unit</span>
          </div>
        </div>

        {/* Card 3: Antrian */}
        <div
          onClick={() => {
            const el = document.getElementById('antrian-prioritas-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-amber-50/70 rounded-2xl p-2.5 border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer max-h-[72px] flex flex-col justify-between"
          title="Unit dalam antrian charger"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-semibold truncate">Antrian</span>
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-amber-800 leading-none">{sortedWaiting.length}</span>
            <span className="text-[10px] text-amber-600">unit</span>
          </div>
        </div>
      </section>

      {/* 2. SATU PANEL RINGKAS "PANTAU DI LAYAR KUNCI" (DEFAULT TERTUTUP, SENTENCE CASE) */}
      <section className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          onClick={() => setShowLiveMonitorDetail(true)}
          title="Ketuk untuk melihat informasi dan simulator layar kunci"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isLiveMonitorOn
              ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}>
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 truncate">
                Pantau di layar kunci
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                isLiveMonitorOn
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isLiveMonitorOn ? 'Aktif' : 'Standby'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Sisa waktu charger tampil langsung tanpa membuka HP
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleLiveMonitor}
          className={`h-11 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
            isLiveMonitorOn
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
          }`}
        >
          {isLiveMonitorOn ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Matikan</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Aktifkan</span>
            </>
          )}
        </button>
      </section>

      {/* 3. KOMPONEN SATU "SLOT CHARGER" (DISATUKAN, TIAP SLOT 1 BARIS RINGKAS 56-64PX) */}
      <section className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs space-y-2.5">
        {/* Header Komponen Slot Charger: Sentence Case & Gear Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Slot Charger</h2>
              <p className="text-xs text-slate-500">
                Terisi {chargingUnits.length} dari {slotsCapacity} colokan
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSlotSettings(true)}
            className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            title="Pengaturan Kapasitas Slot Charger"
            aria-label="Pengaturan Slot"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Atur ({slotsCapacity})</span>
          </button>
        </div>

        {/* Daftar Slot: Tiap Slot Tampil Tepat 1 Baris (Tinggi ~58px) */}
        <div className="space-y-2">
          {slotIndices.map((slotIndex) => {
            const unit = chargingUnits[slotIndex];
            const slotNumber = slotIndex + 1;

            if (unit) {
              // SLOT TERISI: 1 Baris Ringkas
              const timeInfo = getRemainingChargeTime(unit.chargeEndAt, unit.chargeDurationMs);
              return (
                <div
                  key={unit.id}
                  className="bg-sky-50/70 border border-sky-200 rounded-xl p-2.5 flex items-center justify-between gap-2 min-h-[58px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-sky-950">Slot #{slotNumber}</span>
                        <span className="text-xs font-mono font-bold text-slate-900">#{unit.kodeGadai}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">
                        {unit.merkSepeda} ({unit.batteryLevel}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right pr-1">
                      <span className="font-mono text-xs font-bold tabular-nums text-sky-700 block">
                        {timeInfo.formatted}
                      </span>
                      <span className="text-[10px] text-slate-400 block">sisa waktu</span>
                    </div>

                    <button
                      onClick={() => handleFinishCharging(unit.id)}
                      className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                      title="Selesai Di-charge (Baterai Penuh)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCancelActiveCharging(unit)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-all active:scale-95"
                      title="Batalkan (salah input)"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            } else {
              // SLOT KOSONG: 1 Baris Ringkas (Bukan kartu putus-putus besar)
              const nextInQueue = sortedWaiting[slotIndex - chargingUnits.length] || sortedWaiting[0];
              return (
                <div
                  key={`empty-slot-${slotIndex}`}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 min-h-[58px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Slot #{slotNumber}</span>
                      <span className="text-[11px] text-slate-500 block">Tersedia (Kosong)</span>
                    </div>
                  </div>

                  <div>
                    {nextInQueue ? (
                      <button
                        onClick={() => openDurationPickerForStart(nextInQueue.id)}
                        className="h-9 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Pasang #{nextInQueue.kodeGadai}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
                        <span>Pilih Unit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </section>

      {/* 4. ANTRIAN PRIORITAS (DENGAN KARTU PRIORITAS RINGKAS & PENCARIAN) */}
      <section id="antrian-prioritas-section" className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Antrian Prioritas
            </h2>
            <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-sky-100 text-sky-800">
              {sortedWaiting.length} Unit
            </span>
          </div>

          <button
            onClick={handleTriggerAutoQueue}
            className="text-xs text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 active:scale-95 transition-transform"
            title="Sinkronkan unit yang sudah ≥15 hari belum di-charge ke antrian"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            <span>Cek Otomatis (≥15 Hari)</span>
          </button>
        </div>

        {/* Input Pencarian di Antrian */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            placeholder="Cari akad / merk di antrian"
            className="w-full h-11 pl-10 pr-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
          />
          {queueSearchQuery && (
            <button
              onClick={() => setQueueSearchQuery("")}
              className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center rounded-lg"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Daftar Kartu Antrian Prioritas */}
        <div className="space-y-2.5">
          {displayedWaiting.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
              {queueSearchQuery
                ? `Nomor akad "${queueSearchQuery}" tidak ditemukan di dalam antrian.`
                : 'Antrian tunggu saat ini kosong.'}
            </div>
          ) : (
            displayedWaiting.map((unit, index) => {
              const originalIndex = sortedWaiting.findIndex(u => u.id === unit.id);
              const fallbackMasuk = unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
              const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, fallbackMasuk);
              const isOverdue = daysAgo >= 15;

              return (
                <div
                  key={unit.id}
                  className={`bg-white rounded-2xl p-3.5 border transition-all shadow-xs ${
                    isOverdue
                      ? 'border-slate-200 border-l-4 border-l-rose-500'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Baris 1: Nomor Akad + Badge Baterai % */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400">
                        #{originalIndex + 1}
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono tracking-tight">
                        #{unit.kodeGadai}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Prioritas ≥15 hari
                        </span>
                      )}
                    </div>
                    <BatteryIndicator level={unit.batteryLevel} size="sm" />
                  </div>

                  {/* Baris 2: Nama Unit & Nasabah */}
                  <div className="pt-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-slate-900 truncate leading-snug">
                      {unit.merkSepeda}
                    </h4>
                    <p className="text-[12px] text-slate-500 truncate leading-tight mt-0.5">
                      {unit.namaNasabah}
                    </p>
                  </div>

                  {/* Baris 3: Meta & Status */}
                  <div className="pt-1.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                      <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                        Charge {daysAgo} hari lalu
                      </span>
                    </div>

                    <BatteryConditionBadge condition={unit.kondisiBaterai || 'PRIMA'} size="xs" />
                  </div>

                  {/* Baris 4: Aksi Pendek (Pasang ke Slot 44px atau Batalkan) */}
                  <div className="pt-2.5 flex items-center gap-2">
                    {emptySlotsCount > 0 ? (
                      <button
                        onClick={() => openDurationPickerForStart(unit.id)}
                        className="h-11 flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Pasang ke Slot Kosong</span>
                      </button>
                    ) : (
                      <div className="h-11 flex-1 bg-slate-50 text-slate-500 text-xs font-medium rounded-xl border border-slate-200 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Slot Kosong</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleCancelQueue(unit.id, unit.kodeGadai)}
                      className="h-11 px-3 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-semibold rounded-xl transition-all active:scale-95"
                    >
                      Batalkan
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tombol Tambah ke Antrian Manual */}
        <div className="pt-1">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Unit Lain ke Antrian</span>
          </button>
        </div>
      </section>

      {/* 5. BOTTOM SHEET PENGATURAN SLOT CHARGER */}
      {showSlotSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pengaturan Slot Charger</h3>
                  <p className="text-xs text-slate-500">Sesuaikan jumlah colokan fisik di gudang</p>
                </div>
              </div>
              <button
                onClick={() => setShowSlotSettings(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Jumlah Colokan */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-3">
              <span className="text-xs text-slate-600 font-medium">Kapasitas Colokan Aktif:</span>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleAdjustSlots(-1)}
                  disabled={slotsCapacity <= MIN_SLOTS_CAPACITY || slotsCapacity <= chargingUnits.length}
                  className="w-12 h-12 rounded-xl bg-white text-slate-700 flex items-center justify-center font-bold text-base shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
                  title="Kurangi 1 Slot"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="min-w-[80px]">
                  <span className="text-2xl font-black text-slate-900 block font-mono">
                    {slotsCapacity}
                  </span>
                  <span className="text-[11px] text-slate-500">Colokan</span>
                </div>
                <button
                  onClick={() => handleAdjustSlots(1)}
                  disabled={slotsCapacity >= MAX_SLOTS_CAPACITY}
                  className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-base shadow-xs hover:bg-sky-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Tambah 1 Slot"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Peringatan jika pengurangan diblokir saat unit sedang charge */}
              {chargingUnits.length > 0 && slotsCapacity <= chargingUnits.length && (
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs text-left border border-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">
                    Jumlah slot tidak dapat dikurangi di bawah <strong>{chargingUnits.length}</strong> karena unit sedang aktif diisi daya.
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Preset Cepat */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[2, 4, 6].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    if (num < chargingUnits.length) {
                      onNotify({
                        title: "Slot Sedang Terisi",
                        message: `Tidak dapat mengatur ke ${num} slot karena ada ${chargingUnits.length} unit yang sedang aktif diisi.`,
                        type: "warning"
                      });
                      return;
                    }
                    setChargerSlotsCapacity(num);
                    setSlotsCapacity(num);
                  }}
                  className={`h-10 rounded-xl text-xs font-bold border transition-all ${
                    slotsCapacity === num
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {num} Colokan
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSlotSettings(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DETAIL / PREVIEW "PANTAU DI LAYAR KUNCI" (LIGHT THEME, FRIENDLY COPY) */}
      {showLiveMonitorDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pantau di Layar Kunci</h3>
                  <p className="text-xs text-slate-500">Informasi pengisian daya tanpa membuka ponsel</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveMonitorDetail(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed text-slate-700">
                Sisa waktu charger tampil langsung di layar kunci tanpa membuka HP. Petugas gudang cukup menyalakan layar ponsel untuk melihat status dan sisa waktu pengisian.
              </div>

              {/* Status Colokan Aktif Saat Ini */}
              <div className="space-y-2">
                <span className="text-slate-500 text-[11px] font-semibold block">Pratinjau Status Slot:</span>
                {chargingUnits.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400">
                    Tidak ada unit yang sedang di-charge saat ini.
                  </div>
                ) : (
                  chargingUnits.map((u, idx) => {
                    const timeInfo = getRemainingChargeTime(u.chargeEndAt, u.chargeDurationMs);
                    return (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">Slot #{idx + 1}: #{u.kodeGadai}</span>
                          <span className="text-[11px] text-slate-600">{u.merkSepeda} ({u.batteryLevel}%)</span>
                        </div>
                        <span className="font-mono font-bold text-sky-700 text-sm">
                          {timeInfo.formatted}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-900 border border-sky-100 flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">
                  Fitur ini menggunakan integrasi pemutar sistem audio hening untuk mempertahankan tampilan hitung mundur pada layar kunci iPhone dan Android.
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleToggleLiveMonitor}
                className={`flex-1 h-11 font-bold text-xs rounded-xl shadow-xs transition-all ${
                  isLiveMonitorOn
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                }`}
              >
                {isLiveMonitorOn ? 'Matikan Monitor' : 'Aktifkan Monitor'}
              </button>
              <button
                onClick={() => setShowLiveMonitorDetail(false)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL PILIH DURASI CHARGER SEBELUM MULAI */}
      {showDirectStartModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tentukan Durasi Pengisian</h3>
                  <p className="text-xs text-slate-500">Pilih durasi sesuai kondisi dan kapasitas baterai</p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectStartModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
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
                        ? "border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-400"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{preset.label}</span>
                      <span className="text-[11px] text-slate-500">{preset.desc}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                  </button>
                );
              })}

              {/* Kustom Durasi */}
              <button
                type="button"
                onClick={() => setIsCustomDuration(true)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isCustomDuration
                    ? "border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-400"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Durasi Kustom</span>
                  <span className="text-[11px] text-slate-500">Tentukan jam manual (0.5 – 12 Jam)</span>
                </div>
                {isCustomDuration && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
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
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDirectStartModal(false)}
                className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmStartCharging}
                className="flex-1 h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Zap className="w-4 h-4" />
                <span>Mulai Pengisian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL TAMBAH KE ANTRIAN CHARGER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah ke Antrian Charger</h3>
                  <p className="text-xs text-slate-500">Unit ≥15 hari otomatis menjadi prioritas teratas</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
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
                    if (onSelectTab) onSelectTab('aktif');
                  }}
                  className="h-11 px-4 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold border border-sky-200 hover:bg-sky-100 transition-all"
                >
                  Lihat Daftar Unit di Tab Aktif
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnqueueSubmit} className="space-y-3 pt-1">
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
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">-- Pilih Nomor Gadai --</option>
                    {eligibleUnits.map(u => {
                      const fallback = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
                      const days = getDaysSinceLastCharge(u.lastChargedAt, fallback);
                      return (
                        <option key={u.id} value={u.id}>
                          #{u.kodeGadai} - {u.merkSepeda} ({u.namaNasabah}) [{days >= 15 ? `Prioritas ${days} Hari!` : `Baterai ${u.batteryLevel}%`}]
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
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-700 mt-1.5 font-medium">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Unit yang sudah ≥15 hari otomatis ditempatkan di posisi teratas (#1).</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
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

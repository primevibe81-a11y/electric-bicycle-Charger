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
  Settings,
  MapPin,
  Plug
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
  autoEnqueueOverdueUnits,
  updateUnitLocation
} from '../services/storage';
import {
  startLockScreenMonitor,
  stopLockScreenMonitor,
  updateLockScreenMonitor,
  getIsLockScreenMonitorActive
} from '../services/lockScreenMonitor';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import LetakUnitBottomSheet from '../components/LetakUnitBottomSheet';
import Tooltip from '../components/Tooltip';
import { triggerHaptic } from '../services/animationHelpers';

export default function DashboardView({ units, onNotify, onSelectTab, onOpenAiAssistant }) {
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
  const [editLokasiUnit, setEditLokasiUnit] = useState(null);
  const [highlightedUnitId, setHighlightedUnitId] = useState(null);
  const [finishConfirmUnit, setFinishConfirmUnit] = useState(null);
  const [lastPluggedSlotId, setLastPluggedSlotId] = useState(null);

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
      u.namaNasabah.toLowerCase().includes(q) ||
      (u.lokasi && u.lokasi.toLowerCase().includes(q))
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

  // Unit kritis (>= 15 hari) yang BELUM masuk antrian/sedang charge (agar angka kartu ringkasan tidak kembar)
  const unqueuedCriticalUnits = units.filter(u => {
    if (u.statusBarang !== 'AKTIF' && u.statusBarang !== 'LELANG') return false;
    if (u.statusCharger !== 'IDLE') return false;
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
      triggerHaptic('success');
      setLastPluggedSlotId(unitId);
      setTimeout(() => setLastPluggedSlotId(null), 800);
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
      {/* 0. SMART AI SHIFT BRIEFING BANNER (1-Tap Buka Asisten AI Gudang) */}
      <div
        onClick={onOpenAiAssistant}
        className="pressable-card bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-purple-950/30 border border-sky-200/80 dark:border-indigo-900/50 rounded-2xl p-3 flex items-center justify-between gap-2.5 shadow-2xs cursor-pointer hover:border-sky-400 dark:hover:border-indigo-700 transition-all"
        title="Buka Asisten AI Gudang"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Asisten AI Gudang</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900/80 text-sky-700 dark:text-sky-300">
                Shift Briefing
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {needChargeUnits.length} butuh charge • {sortedWaiting.length} antrian • Ketuk untuk aksi cepat &amp; tanya
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {/* 1. RINGKASAN ANGKA PALING ATAS (Ikon di atas, angka besar, label tegas di bawah angka) */}
      <section className="grid grid-cols-3 gap-2">
        {/* Card 1: Butuh Charge */}
        <Tooltip content="Butuh Charge: Unit baterai <60% atau ≥7 hari belum diisi daya" position="bottom" className="w-full">
          <div
            onClick={() => onSelectTab && onSelectTab('aktif')}
            className="w-full bg-white dark:bg-[#151C28] rounded-2xl p-2.5 border border-slate-200/90 dark:border-[#232F42] shadow-xs hover:border-sky-300 dark:hover:border-sky-500 transition-colors cursor-pointer max-h-[72px] min-h-[72px] flex flex-col items-center justify-center gap-0.5 pressable-card"
            title="Butuh Charge"
          >
            <BatteryCharging className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
              {needChargeUnits.length}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              BUTUH CHARGE
            </span>
          </div>
        </Tooltip>

        {/* Card 2: Kritis */}
        <Tooltip content="Kritis ≥15 Hari: Unit kritis belum masuk antrian charge" position="bottom" className="w-full">
          <div
            onClick={() => onSelectTab && onSelectTab('aktif')}
            className="w-full bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-2.5 border border-rose-200 dark:border-rose-900/50 shadow-xs hover:border-rose-400 dark:hover:border-rose-700 transition-colors cursor-pointer max-h-[72px] min-h-[72px] flex flex-col items-center justify-center gap-0.5 pressable-card"
            title="Kritis ≥15 Hari"
          >
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="text-xl font-black text-rose-700 dark:text-rose-300 leading-none tabular-nums">
              {unqueuedCriticalUnits.length}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              KRITIS ≥15H
            </span>
          </div>
        </Tooltip>

        {/* Card 3: Antrian */}
        <Tooltip content="Antrian: Unit dalam antrian charger" position="bottom" className="w-full">
          <div
            onClick={() => {
              const el = document.getElementById('antrian-prioritas-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-2.5 border border-amber-200 dark:border-amber-900/50 shadow-xs hover:border-amber-400 dark:hover:border-amber-700 transition-colors cursor-pointer max-h-[72px] min-h-[72px] flex flex-col items-center justify-center gap-0.5 pressable-card"
            title="Antrian"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xl font-black text-amber-800 dark:text-amber-200 leading-none tabular-nums">
              {sortedWaiting.length}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              ANTRIAN
            </span>
          </div>
        </Tooltip>
      </section>

      {/* 2. PANEL "PANTAU DI LAYAR KUNCI" (TEKS JUDUL & SUBTEKS TEGAS, TANPA IKON 'I') */}
      <section className="bg-white dark:bg-[#151C28] rounded-2xl px-3.5 h-14 min-h-[56px] border border-slate-200/90 dark:border-[#232F42] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-[#151C28] ${
                isLiveMonitorOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              Pantau di Layar Kunci
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Tampilkan sisa waktu di Lock Screen
            </p>
          </div>
        </div>

        {/* Toggle Switch (44x44px Touch Target) */}
        <button
          onClick={handleToggleLiveMonitor}
          aria-label={isLiveMonitorOn ? "Matikan Layar Kunci" : "Aktifkan Layar Kunci"}
          title={isLiveMonitorOn ? "Layar Kunci: Aktif (Klik untuk Matikan)" : "Layar Kunci: Standby (Klik untuk Aktifkan)"}
          className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none pressable shrink-0 ${
            isLiveMonitorOn ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              isLiveMonitorOn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </section>

      {/* 3. KOMPONEN SATU "SLOT CHARGER" (HEADER: COLOKAN + "0/2" + GEAR, TIAP SLOT 1 BARIS) */}
      <section className="bg-white dark:bg-[#151C28] rounded-2xl p-3 border border-slate-200/90 dark:border-[#232F42] shadow-xs space-y-2">
        {/* Header Slot Charger: Ringkas Ikon Colokan + Kapasitas + Gear Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {chargingUnits.length}/{slotsCapacity}
            </span>
          </div>

          <Tooltip content="Pengaturan Kapasitas Slot" position="left">
            <button
              onClick={() => setShowSlotSettings(true)}
              className="w-11 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all active:scale-95"
              aria-label="Pengaturan Slot"
              title="Pengaturan Slot"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Daftar Slot: Tiap Slot Tampil Tepat 1 Baris (Tinggi ~58px) */}
        <div className="space-y-1.5">
          {slotIndices.map((slotIndex) => {
            const unit = chargingUnits[slotIndex];
            const slotNumber = slotIndex + 1;

            if (unit) {
              // SLOT TERISI: 1 Baris Ringkas
              const timeInfo = getRemainingChargeTime(unit.chargeEndAt, unit.chargeDurationMs);
              return (
                <div
                  key={unit.id}
                  className={`bg-sky-50/70 dark:bg-gradient-to-br dark:from-sky-600 dark:to-blue-900 border border-sky-200 dark:border-sky-400/30 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 min-h-[58px] transition-colors text-slate-900 dark:text-white ${
                    lastPluggedSlotId === unit.id ? 'animate-highlight ring-2 ring-sky-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700 animate-pulse shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-sky-200 shrink-0">#{slotNumber}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">#{unit.kodeGadai}</span>
                        <BatteryIndicator level={unit.batteryLevel} isCharging={true} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-sky-100 truncate">{unit.merkSepeda}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-xs font-bold tabular-nums text-sky-700 dark:text-white pr-1">
                      {timeInfo.formatted}
                    </span>

                    <button
                      onClick={() => setFinishConfirmUnit(unit)}
                      className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-2xs active:scale-95"
                      title="Selesai Di-charge"
                      aria-label="Selesai Di-charge"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCancelActiveCharging(unit)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
                      title="Batalkan"
                      aria-label="Batalkan"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            } else {
              // SLOT KOSONG: 1 Baris Ringkas
              const nextInQueue = sortedWaiting[slotIndex - chargingUnits.length] || sortedWaiting[0];
              return (
                <div
                  key={`empty-slot-${slotIndex}`}
                  className="bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 min-h-[58px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">#{slotNumber}</span>
                    <Plug className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>

                  <div>
                    {nextInQueue ? (
                      <button
                        onClick={() => openDurationPickerForStart(nextInQueue.id)}
                        className="h-11 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95"
                        title={`Pasang ke Slot Kosong (#${nextInQueue.kodeGadai})`}
                        aria-label={`Pasang #${nextInQueue.kodeGadai}`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>#{nextInQueue.kodeGadai}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
                        title="Pilih Unit"
                        aria-label="Pilih Unit"
                      >
                        <PlusCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Antrian
            </h2>
            <span className="text-xs font-bold px-2 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-mono">
              {sortedWaiting.length}
            </span>
          </div>

          <Tooltip content="Cek Otomatis (≥15 Hari)" position="left">
            <button
              onClick={handleTriggerAutoQueue}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-2xs"
              title="Cek Otomatis (≥15 Hari)"
              aria-label="Cek Otomatis (≥15 Hari)"
            >
              <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </button>
          </Tooltip>
        </div>

        {/* Input Pencarian di Antrian */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={queueSearchQuery}
            onChange={(e) => setQueueSearchQuery(e.target.value)}
            placeholder="Cari..."
            className="w-full h-11 pl-10 pr-9 bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {queueSearchQuery && (
            <button
              onClick={() => setQueueSearchQuery("")}
              className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-lg"
              title="Hapus pencarian"
              aria-label="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Daftar Kartu Antrian Prioritas: Maksimal 3 Baris Bersih */}
        <div className="space-y-2.5">
          {displayedWaiting.length === 0 ? (
            <div className="bg-white dark:bg-[#151C28] rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              {queueSearchQuery
                ? `Nomor akad "${queueSearchQuery}" tidak ditemukan.`
                : 'Antrian tunggu saat ini kosong.'}
            </div>
          ) : (
            displayedWaiting.map((unit, index) => {
              const originalIndex = sortedWaiting.findIndex(u => u.id === unit.id);
              const fallbackMasuk = unit.jatuhTempoAt ? unit.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
              const daysAgo = getDaysSinceLastCharge(unit.lastChargedAt, fallbackMasuk);
              const isOverdue = daysAgo >= 15;
              const kondisiLabel = BATTERY_CONDITIONS[unit.kondisiBaterai]?.label?.split(' ')[0] || 'Normal';
              const lokasiText = unit.lokasi ? unit.lokasi : 'Lokasi belum diisi';
              const chargeText = daysAgo === 0 ? 'Charge hari ini' : `Charge ${daysAgo} hari lalu`;

              return (
                <div
                  key={unit.id}
                  className={`bg-white dark:bg-[#151C28] rounded-2xl p-3 border transition-colors shadow-xs pressable-card unit-card-optimized ${
                    highlightedUnitId === unit.id ? 'animate-highlight border-sky-400 ring-2 ring-sky-200' : ''
                  } ${
                    isOverdue
                      ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500 animate-critical-pulse'
                      : 'border-slate-200/90 dark:border-[#232F42]'
                  }`}
                >
                  {/* BARIS 1: Nomor Akad (kiri) + Badge Baterai (kanan) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                        #{originalIndex + 1}
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                        #{unit.kodeGadai}
                      </span>
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

                  {/* BARIS 3: Metadata Bersih Berpemisah Titik (Normal • Lokasi belum diisi • Charge 142 hari lalu) + Aksi */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 mt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0 flex-1 truncate">
                      <span className="font-medium shrink-0">{kondisiLabel}</span>
                      <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                      <button
                        type="button"
                        onClick={() => setEditLokasiUnit(unit)}
                        className="truncate hover:underline text-left"
                        title="Ubah letak di gudang"
                      >
                        {lokasiText}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                      <span className={`tabular-nums font-mono shrink-0 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                        {chargeText}
                      </span>
                    </div>

                    {/* Aksi Baris 3: Pasang ke Slot Kosong atau Batalkan */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {emptySlotsCount > 0 ? (
                        <button
                          onClick={() => openDurationPickerForStart(unit.id)}
                          className="h-10 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                          title="Pasang ke Slot Kosong"
                          aria-label="Pasang ke Slot Kosong"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Pasang</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic pr-1">
                          Menunggu
                        </span>
                      )}

                      <button
                        onClick={() => handleCancelQueue(unit.id, unit.kodeGadai)}
                        className="h-10 w-10 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95"
                        title="Batalkan dari antrian"
                        aria-label="Batalkan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pengaturan Slot Charger</h3>
                  <p className="text-xs text-slate-500">Terisi {chargingUnits.length} dari {slotsCapacity} colokan</p>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
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
      {/* 9. BOTTOM SHEET KONFIRMASI PENGEMBALIAN LETAK SETELAH CHARGER */}
      {finishConfirmUnit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-sheet space-y-3.5 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Selesai Pengisian Baterai</h3>
                  <p className="text-xs text-slate-500">
                    Unit #{finishConfirmUnit.kodeGadai} • {finishConfirmUnit.merkSepeda}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFinishConfirmUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                <div className="text-slate-600 font-medium">
                  Pengisian baterai unit telah selesai. Dikembalikan ke letak sebelumnya?
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-slate-800">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold">
                    {finishConfirmUnit.lokasi || 'Letak belum pernah diisi'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const u = finishConfirmUnit;
                    const res = finishChargingUnit(u.id);
                    setFinishConfirmUnit(null);
                    if (res.success) {
                      onNotify({
                        title: "Selesai Di-Charge!",
                        message: res.message,
                        type: "success"
                      });
                    }
                  }}
                  className="h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ya, Letak Sama</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const u = finishConfirmUnit;
                    finishChargingUnit(u.id);
                    setFinishConfirmUnit(null);
                    setEditLokasiUnit(u);
                  }}
                  className="h-11 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Ubah Letak Baru</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFinishConfirmUnit(null)}
                className="w-full h-10 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. BOTTOM SHEET EDIT LETAK UNIT */}
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

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  MapPin,
  AlertTriangle,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  Clock,
  BatteryCharging,
  Calendar,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Key
} from 'lucide-react';
import { getDaysSinceLastCharge, BATTERY_CONDITIONS } from '../services/chargerQueue';
import {
  startChargingUnit,
  getChargerSlotsCapacity,
  getStoredUnits
} from '../services/storage';
import { triggerHaptic } from '../services/animationHelpers';

export default function AsistenAiBottomSheet({
  isOpen,
  onClose,
  units = [],
  onNotify,
  onNavigateToTab,
  currentUser
}) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem('ebike_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll inside chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Perhitungan Data Real-Time untuk Morning Shift Briefing
  const briefingData = useMemo(() => {
    const aktifUnits = units.filter(u => (u.statusBarang || u.statusGadai) === 'AKTIF');
    const lelangUnits = units.filter(u => (u.statusBarang || u.statusGadai) === 'LELANG');
    const waitingUnits = units.filter(u => u.statusCharger === 'WAITING');
    const chargingUnits = units.filter(u => u.statusCharger === 'CHARGING');
    const capacity = getChargerSlotsCapacity();
    const emptySlots = Math.max(0, capacity - chargingUnits.length);

    // Hitung unit kritis & urutkan keterlambatan
    let worstOverdueUnit = null;
    let worstDays = 0;
    let criticalOverdueCount = 0;

    waitingUnits.forEach(u => {
      const fallbackMasuk = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
      const days = getDaysSinceLastCharge(u.lastChargedAt, fallbackMasuk);
      if (days >= 15) criticalOverdueCount++;
      if (days > worstDays) {
        worstDays = days;
        worstOverdueUnit = u;
      }
    });

    const needChargeSoon = units.filter(u => {
      if ((u.statusBarang || u.statusGadai) === 'DITEBUS' || u.statusCharger === 'CHARGING') return false;
      const fallbackMasuk = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
      const days = getDaysSinceLastCharge(u.lastChargedAt, fallbackMasuk);
      return days >= 14;
    }).length;

    const noLocationCount = units.filter(u => (u.statusBarang || u.statusGadai) !== 'DITEBUS' && (!u.lokasi || !u.lokasi.trim())).length;
    const defectCount = units.filter(u => (u.statusBarang || u.statusGadai) !== 'DITEBUS' && u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA').length;

    return {
      aktifCount: aktifUnits.length,
      lelangCount: lelangUnits.length,
      waitingCount: waitingUnits.length,
      chargingCount: chargingUnits.length,
      capacity,
      emptySlots,
      needChargeSoon,
      worstOverdueUnit,
      worstDays,
      criticalOverdueCount,
      noLocationCount,
      defectCount
    };
  }, [units]);

  // Kalimat Briefing Otomatis
  const morningBriefingText = useMemo(() => {
    const { needChargeSoon, waitingCount, worstOverdueUnit, worstDays, lelangCount, emptySlots } = briefingData;
    let worstStr = '';
    if (worstOverdueUnit) {
      worstStr = ` (terparah #${worstOverdueUnit.kodeGadai} telat ${worstDays} hari)`;
    }
    return `Saat ini ada ${needChargeSoon} unit butuh charge segera, ${waitingCount} unit dalam antrian prioritas${worstStr}, dan ${lelangCount} unit siap lelang.${
      emptySlots > 0 ? ` Tersedia ${emptySlots} slot charger kosong yang siap dipasang.` : ' Semua slot charger saat ini sedang aktif.'
    }`;
  }, [briefingData]);

  // QUICK AI ACTION 1: Isi Otomatis Semua Slot Charger Kosong
  const handleAutoFillEmptySlots = () => {
    triggerHaptic('medium');
    const { emptySlots } = briefingData;
    if (emptySlots <= 0) {
      onNotify?.({
        title: 'Semua Slot Penuh',
        message: 'Tidak ada slot charger kosong saat ini. Selesaikan salah satu unit terlebih dahulu.',
        type: 'warning'
      });
      return;
    }

    // Ambil unit teratas dari antrian WAITING
    const waitingUnits = units
      .filter(u => u.statusCharger === 'WAITING')
      .sort((a, b) => {
        const fallA = a.jatuhTempoAt ? a.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
        const fallB = b.jatuhTempoAt ? b.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
        const daysA = getDaysSinceLastCharge(a.lastChargedAt, fallA);
        const daysB = getDaysSinceLastCharge(b.lastChargedAt, fallB);
        return daysB - daysA;
      });

    if (waitingUnits.length === 0) {
      onNotify?.({
        title: 'Antrian Kosong',
        message: 'Tidak ada unit dalam antrian yang siap dipasang ke charger.',
        type: 'info'
      });
      return;
    }

    const unitsToCharge = waitingUnits.slice(0, emptySlots);
    let successCount = 0;
    const assignedNames = [];

    unitsToCharge.forEach(u => {
      const res = startChargingUnit(u.id);
      if (res.success) {
        successCount++;
        assignedNames.push(`#${u.kodeGadai}`);
      }
    });

    if (successCount > 0) {
      onNotify?.({
        title: '⚡ Slot Terisi Otomatis!',
        message: `Berhasil memasang ${successCount} unit (${assignedNames.join(', ')}) ke slot charger.`,
        type: 'success'
      });
      // Berikan respons chat asisten
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai',
          text: `⚡ Berhasil mengisi ${successCount} slot charger kosong dengan antrian teratas: ${assignedNames.join(', ')}. Pengisian daya 3 jam telah dimulai.`
        }
      ]);
    }
  };

  // QUICK AI ACTION 2: Filter Unit Belum Ada Lokasi
  const handleFilterNoLocation = () => {
    triggerHaptic('light');
    onClose();
    onNavigateToTab?.('aktif', { filterType: 'NO_LOCATION' });
  };

  // QUICK AI ACTION 3: Cek Unit Bermasalah / Aki Drop
  const handleFilterDefects = () => {
    triggerHaptic('light');
    onClose();
    onNavigateToTab?.('aktif', { filterType: 'DEFECT' });
  };

  // LOCAL NATURAL LANGUAGE QUERY ENGINE
  const processLocalQuery = (text) => {
    const q = text.toLowerCase().trim();

    // 1. Cek Pertanyaan Seputar Nasabah tertentu
    const nasabahMatch = q.match(/(?:nasabah|nama|pemilik|kontak)\s+([a-zA-Z0-9\s]+)/i);
    const searchTarget = nasabahMatch ? nasabahMatch[1].trim() : q;
    
    // Cari kecocokan nasabah
    const matchedByNasabah = units.filter(u =>
      u.namaNasabah && u.namaNasabah.toLowerCase().includes(searchTarget)
    );

    if (matchedByNasabah.length > 0 && (nasabahMatch || searchTarget.length >= 3)) {
      return {
        reply: `Ditemukan ${matchedByNasabah.length} unit milik nasabah yang cocok dengan "${searchTarget}":`,
        items: matchedByNasabah.slice(0, 5)
      };
    }

    // 2. Cek Berdasarkan Nomor Akad / Kode Gadai
    const akadMatch = q.match(/#?([0-9]{2}_[0-9]+|[0-9]{4,})/i);
    if (akadMatch) {
      const code = akadMatch[1];
      const matched = units.filter(u => u.kodeGadai && u.kodeGadai.toLowerCase().includes(code.toLowerCase()));
      if (matched.length > 0) {
        return {
          reply: `Ditemukan unit akad #${matched[0].kodeGadai}:`,
          items: matched
        };
      }
    }

    // 3. Cek Jumlah / Tipe Sepeda (Merk / Warna)
    const merkList = ['uwinfly', 'exotic', 'selis', 'godzilla', 'viad', 'pacific', 'united', 'polytron', 'volta'];
    const foundMerk = merkList.find(m => q.includes(m));
    if (foundMerk || q.includes('sepeda') || q.includes('merk') || q.includes('warna')) {
      const filtered = units.filter(u => {
        const merk = (u.merkSepeda || '').toLowerCase();
        if (foundMerk && !merk.includes(foundMerk)) return false;
        if (q.includes('merah') && !merk.includes('merah')) return false;
        if (q.includes('hitam') && !merk.includes('hitam')) return false;
        if (q.includes('putih') && !merk.includes('putih')) return false;
        if (q.includes('biru') && !merk.includes('biru')) return false;
        return true;
      });

      return {
        reply: `Ditemukan ${filtered.length} unit yang sesuai dengan kriteria "${text}":`,
        items: filtered.slice(0, 6)
      };
    }

    // 4. Cek Jatuh Tempo Minggu Ini
    if (q.includes('jatuh tempo') || q.includes('tempo')) {
      const now = Date.now();
      const in7Days = now + 7 * 24 * 60 * 60 * 1000;
      const dueSoon = units.filter(u => {
        if ((u.statusBarang || u.statusGadai) !== 'AKTIF') return false;
        return u.jatuhTempoAt && u.jatuhTempoAt >= now && u.jatuhTempoAt <= in7Days;
      });

      return {
        reply: `Ada ${dueSoon.length} unit gadai aktif yang akan jatuh tempo dalam 7 hari ke depan:`,
        items: dueSoon.slice(0, 5)
      };
    }

    // 5. Cek Unit Paling Telat Charge / Kritis
    if (q.includes('telat') || q.includes('kritis') || q.includes('terlama') || q.includes('paling lama')) {
      const sorted = [...units]
        .filter(u => (u.statusBarang || u.statusGadai) !== 'DITEBUS')
        .sort((a, b) => {
          const fallA = a.jatuhTempoAt ? a.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
          const fallB = b.jatuhTempoAt ? b.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
          return getDaysSinceLastCharge(b.lastChargedAt, fallB) - getDaysSinceLastCharge(a.lastChargedAt, fallA);
        });

      return {
        reply: `Berikut 5 unit dengan keterlambatan siklus pengisian baterai paling lama:`,
        items: sorted.slice(0, 5)
      };
    }

    // 6. Cek Unit Belum Ada Lokasi
    if (q.includes('lokasi') || q.includes('letak') || q.includes('rak') || q.includes('posisi')) {
      const noLoc = units.filter(u => (u.statusBarang || u.statusGadai) !== 'DITEBUS' && (!u.lokasi || !u.lokasi.trim()));
      return {
        reply: `Terdapat ${noLoc.length} unit yang posisi rak / letak gudangnya belum dicatat:`,
        items: noLoc.slice(0, 5)
      };
    }

    // 7. Cek Unit Siap Lelang
    if (q.includes('lelang') || q.includes('siap lelang')) {
      const lelang = units.filter(u => (u.statusBarang || u.statusGadai) === 'LELANG');
      return {
        reply: `Terdapat total ${lelang.length} unit dalam status siap lelang:`,
        items: lelang.slice(0, 5)
      };
    }

    // Default Fallback
    return {
      reply: `Saya telah memeriksa basis data gudang (${units.length} unit). Silakan coba tanyakan hal spesifik seperti: "Cek nasabah Munir", "Berapa unit Uwinfly hitam?", "Unit jatuh tempo minggu ini", atau "Unit paling telat charge".`,
      items: []
    };
  };

  // HANDLER KIRIM PERTANYAAN
  const handleSendMessage = async (textToSend) => {
    const messageText = (textToSend || query).trim();
    if (!messageText) return;

    triggerHaptic('light');
    const userMsg = { id: Date.now(), sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsProcessing(true);

    try {
      // Jika user memasukkan Gemini API Key, gunakan Gemini untuk jawaban natural dinamis
      if (geminiApiKey && geminiApiKey.startsWith('AIza')) {
        const compactContext = units.slice(0, 40).map(u => ({
          kode: u.kodeGadai,
          merk: u.merkSepeda,
          nasabah: u.namaNasabah,
          lokasi: u.lokasi || 'Belum diisi',
          baterai: u.batteryLevel,
          kondisi: u.kondisiBaterai || 'PRIMA',
          status: u.statusBarang || u.statusGadai,
          charger: u.statusCharger
        }));

        const promptText = `Anda adalah Asisten AI Gudang Sepeda Listrik Gadai yang ramah, ringkas, dan presisi. Jawab pertanyaan admin secara to the point dalam bahasa Indonesia berdasarkan data berikut:\n` +
          JSON.stringify(compactContext) +
          `\n\nPertanyaan: ${messageText}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (replyText) {
            setMessages(prev => [
              ...prev,
              { id: Date.now() + 1, sender: 'ai', text: replyText, items: [] }
            ]);
            setIsProcessing(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Gemini query failed, fallback to local engine:', err);
    }

    // Fallback: Local Query Engine (100% Offline & Instant)
    setTimeout(() => {
      const result = processLocalQuery(messageText);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: result.reply,
          items: result.items || []
        }
      ]);
      setIsProcessing(false);
    }, 180);
  };

  const handleSaveApiKey = (key) => {
    const trimmed = key.trim();
    setGeminiApiKey(trimmed);
    try {
      localStorage.setItem('ebike_gemini_api_key', trimmed);
    } catch (e) {}
    setShowKeyInput(false);
    onNotify?.({
      title: trimmed ? 'API Key Tersimpan' : 'API Key Dihapus',
      message: trimmed ? 'Asisten kini terhubung dengan Gemini AI.' : 'Menggunakan mesin asisten cerdas lokal offline.',
      type: 'info'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-[430px] max-h-[90vh] bg-white dark:bg-[#151C28] text-slate-900 dark:text-slate-100 rounded-t-3xl shadow-2xl border-t border-sky-100 dark:border-[#232F42] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250"
      >
        {/* Top Drag Handle & Header */}
        <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2.5" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                  <span>Asisten AI Gudang</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {geminiApiKey ? 'Gemini AI' : 'Smart Offline'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Operasional cerdas &amp; briefing harian shift
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center pressable"
                title="Pengaturan API Key Gemini"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center pressable"
                aria-label="Tutup Asisten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Optional Gemini Key Input Dropdown */}
          {showKeyInput && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Gemini API Key (Opsional):</span>
                <span className="text-[10px] text-slate-400">Kosongkan jika ingin mode lokal</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 h-8 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleSaveApiKey(geminiApiKey)}
                  className="h-8 px-3 rounded-lg bg-sky-600 text-white font-bold text-xs"
                >
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* 1. MORNING SHIFT BRIEFING OTOMATIS */}
          <div className="rounded-2xl p-3.5 bg-gradient-to-br from-sky-50 via-indigo-50/40 to-white dark:from-[#1E293B]/80 dark:via-[#161F2E] dark:to-[#111722] border border-sky-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>Morning Shift Briefing</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Data Realtime
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
              "{morningBriefingText}"
            </p>
          </div>

          {/* 2. QUICK AI ACTIONS (1-TAP EKSEKUSI) */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Aksi Cepat AI (1-Tap Eksekusi)
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Tombol Isi Otomatis Charger */}
              <button
                type="button"
                onClick={handleAutoFillEmptySlots}
                disabled={briefingData.emptySlots <= 0 || briefingData.waitingCount === 0}
                className={`pressable w-full h-11 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  briefingData.emptySlots > 0 && briefingData.waitingCount > 0
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 fill-current shrink-0" />
                  <span className="truncate">Isi Otomatis Semua Slot Kosong</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20">
                  {briefingData.emptySlots} Slot Kosong
                </span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                {/* Tombol Filter Belum Ada Lokasi */}
                <button
                  type="button"
                  onClick={handleFilterNoLocation}
                  className="pressable h-10 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate">Tanpa Letak</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    ({briefingData.noLocationCount})
                  </span>
                </button>

                {/* Tombol Cek Unit Bermasalah / Aki Drop */}
                <button
                  type="button"
                  onClick={handleFilterDefects}
                  className="pressable h-10 px-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/40 text-xs font-bold flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Aki Bermasalah</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                    ({briefingData.defectCount})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. TANYA ASISTEN GUDANG */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tanya Asisten Gudang
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                'Cek nasabah Munir',
                'Berapa unit Uwinfly?',
                'Jatuh tempo minggu ini',
                'Unit paling telat charge'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="pressable whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="space-y-2 mt-2 pt-1">
              {messages.length === 0 && (
                <div className="text-center py-4 px-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
                  <Bot className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  Ketik pertanyaan apa saja seputar nasabah, akad, stok unit, atau rak gudang.
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs ${
                      m.sender === 'user'
                        ? 'bg-sky-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  </div>

                  {/* Jika pesan AI membawa daftar unit */}
                  {Array.isArray(m.items) && m.items.length > 0 && (
                    <div className="w-full mt-2 space-y-1.5">
                      {m.items.map((u) => {
                        const fallbackMasuk = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
                        const daysAgo = getDaysSinceLastCharge(u.lastChargedAt, fallbackMasuk);
                        return (
                          <div
                            key={u.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-800 shadow-2xs text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                #{u.kodeGadai}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                {u.batteryLevel}% Baterai
                              </span>
                            </div>
                            <div className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                              {u.merkSepeda} • <span className="text-slate-500 dark:text-slate-400">{u.namaNasabah}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                                {u.lokasi || 'Belum ada letak'}
                              </span>
                              <span>•</span>
                              <span className={daysAgo >= 15 ? 'text-rose-600 font-bold' : ''}>
                                Charge {daysAgo} hari lalu
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">
                  <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                  <span>Asisten sedang menganalisis data gudang...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Bottom Chat Input Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151C28] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tanya asisten (misal: 'Cek nasabah Munir')..."
              className="flex-1 h-11 px-3.5 bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!query.trim() || isProcessing}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                query.trim() && !isProcessing
                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
              title="Kirim Pertanyaan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

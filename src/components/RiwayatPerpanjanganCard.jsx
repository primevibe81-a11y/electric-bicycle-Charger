import React from 'react';
import {
  History,
  Bike,
  User,
  Calendar,
  ArrowRight,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import BatteryConditionBadge from './BatteryConditionBadge';
import ChargeAuditBadge from './ChargeAuditBadge';
import { normalizeHistoryEntry } from '../services/storage';

export default function RiwayatPerpanjanganCard({ unit }) {
  if (!unit) return null;

  const rawHistory = Array.isArray(unit.riwayatKodeGadai) ? unit.riwayatKodeGadai : [];
  if (rawHistory.length === 0) return null;

  // Urutkan riwayat dari yang paling baru
  const historyList = rawHistory.map(entry => normalizeHistoryEntry(entry));

  return (
    <div className="bg-white/95 rounded-3xl p-4 border border-amber-150 shadow-sm hover:border-amber-300 transition-all space-y-3">
      {/* 1. Header: Perubahan Nomor Gadai (Lama -> Baru) */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <History className="w-3 h-3 text-amber-600" />
            <span>Pernah Diperpanjang ({historyList.length}x)</span>
          </span>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {/* Nomor Gadai Sebelumnya */}
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200" title="Nomor Gadai Sebelumnya">
              #{historyList[0].kodeGadaiLama}
            </span>

            <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />

            {/* Nomor Gadai Saat Ini */}
            <span className="font-mono text-sm font-black text-amber-950 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200" title="Nomor Gadai Aktif Saat Ini">
              #{unit.kodeGadai}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            unit.statusBarang === 'AKTIF'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : unit.statusBarang === 'LELANG'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {unit.statusBarang}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Status Saat Ini</span>
        </div>
      </div>

      {/* 2. Detail Barang & Nasabah */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-start gap-1.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
          <Bike className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Nama Barang</span>
            <p className="font-bold text-slate-800 truncate" title={unit.merkSepeda}>
              {unit.merkSepeda}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-1.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
          <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Nama Nasabah</span>
            <p className="font-bold text-slate-800 truncate" title={unit.namaNasabah}>
              {unit.namaNasabah}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Detail Setiap Riwayat Perpanjangan (Fokus pada Catatan di Nomor Sebelumnya) */}
      <div className="space-y-2 pt-1">
        {historyList.map((hist, idx) => {
          const tglFormatted = hist.tglPerpanjang
            ? new Date(hist.tglPerpanjang).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) + ' WIB'
            : '-';

          return (
            <div
              key={idx}
              className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 p-3 rounded-2xl border border-amber-200/70 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  <span>Akad Sebelumnya: <strong className="font-mono">#{hist.kodeGadaiLama}</strong></span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{tglFormatted}</span>
              </div>

              {/* Catatan di Nomor Gadai Sebelumnya */}
              <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block mb-0.5">
                  Catatan Barang di Nomor Sebelumnya:
                </span>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {hist.catatanLama || "Kondisi awal prima, belum ada catatan komplain fisik/baterai."}
                </p>
                {hist.kondisiBateraiLama && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Kondisi baterai saat itu:</span>
                    <BatteryConditionBadge condition={hist.kondisiBateraiLama} size="xs" />
                  </div>
                )}
              </div>

              {/* Catatan Tambahan Perpanjangan (Jika ada) */}
              {hist.catatanPerpanjangan && (
                <div className="text-[11px] text-slate-600 bg-amber-100/50 p-1.5 rounded-lg border border-amber-200/50">
                  <span className="font-semibold text-amber-900">Catatan Mutasi: </span>
                  {hist.catatanPerpanjangan}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Footer Kartu: Audit Baterai Terkini & Tanggal Jatuh Tempo Baru */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1">
          <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} />
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Jatuh Tempo Baru:</span>
          <span className="font-bold text-slate-700">
            {unit.jatuhTempoAt ? new Date(unit.jatuhTempoAt).toLocaleDateString('id-ID') : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

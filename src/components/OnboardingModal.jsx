import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, ChevronRight, X } from 'lucide-react';
import Icon from './Icon';

const STORAGE_KEY = 'ebike_onboarding_minimal_seen_v1';

export default function OnboardingModal({ forceOpen = false, onClose = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }

    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setIsOpen(true);
      }
    } catch (e) {
      // Fallback
    }
  }, [forceOpen]);

  const handleFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {}
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Tampilan Jauh Lebih Bersih',
      subtitle: 'Informasi = Simbol + Angka Penting',
      desc: 'Teks berulang telah disederhanakan menjadi simbol garis yang informatif dan angka. Area pandang kini lebih lega untuk memantau puluhan sepeda listrik sekaligus.',
      visual: (
        <div className="flex items-center justify-center gap-4 py-3">
          <div className="px-3 py-2 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200">
            <Icon name="battery" size={20} color="text-emerald-600" />
            <span className="font-mono font-bold text-sm text-slate-900">100</span>
          </div>
          <div className="px-3 py-2 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200">
            <Icon name="clock" size={20} color="text-slate-600" />
            <span className="font-mono font-bold text-sm text-slate-900">142j</span>
          </div>
          <div className="px-3 py-2 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200">
            <Icon name="pin" size={20} color="text-sky-600" />
            <span className="text-xs font-semibold text-slate-800">Rak B2</span>
          </div>
        </div>
      )
    },
    {
      title: 'Bentuk Pembeda Ramah Buta Warna',
      subtitle: 'Tidak Mengandalkan Warna Semata',
      desc: 'Kondisi baterai dibedakan oleh bentuk geometris yang jelas: Centang Hijau (Prima), Segitiga Kuning (Menurun), dan Oktagon Merah (Kritis).',
      visual: (
        <div className="grid grid-cols-3 gap-2 py-3 text-center">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center gap-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-800">Prima</span>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center gap-1">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-800">Menurun</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col items-center gap-1">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            <span className="text-[10px] font-bold text-rose-800">Kritis</span>
          </div>
        </div>
      )
    },
    {
      title: 'Tekan Lama 0.5 Detik',
      subtitle: 'Penjelasan Instan Sesuai Kebutuhan',
      desc: 'Ragu dengan arti suatu simbol? Cukup sentuh dan tahan simbol tersebut selama 0.5 detik untuk memunculkan nama dan keterangannya. Anda juga bisa membuka Legenda Ikon dari foto profil.',
      visual: (
        <div className="py-3 flex flex-col items-center justify-center">
          <div className="relative p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs animate-pulse">
              <Icon name="plug" size={22} color="text-white" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-sky-700">Tahan 0.5 Detik</span>
              <p className="text-xs font-bold text-slate-900">Muncul Keterangan Simbol</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center relative">
        {/* Tombol Tutup / Lewati */}
        <button
          onClick={handleFinish}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
          aria-label="Lewati panduan"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentStep ? 'w-6 bg-sky-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Visual Box */}
        <div className="my-2 bg-slate-50/80 rounded-2xl p-2 border border-slate-100">
          {current.visual}
        </div>

        {/* Title & Desc */}
        <h3 className="text-base font-extrabold text-slate-900 leading-snug mt-2">
          {current.title}
        </h3>
        <p className="text-xs font-semibold text-sky-600 mt-0.5">
          {current.subtitle}
        </p>
        <p className="text-xs text-slate-600 leading-relaxed mt-2 px-1">
          {current.desc}
        </p>

        {/* Actions */}
        <div className="pt-4 flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="pressable h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
            >
              Kembali
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="pressable flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="pressable flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mengerti & Mulai</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

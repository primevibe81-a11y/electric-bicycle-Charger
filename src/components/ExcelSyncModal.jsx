import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { analyzePawnExcelFiles, applyBatchSyncMutations } from '../services/excelSyncEngine';

export default function ExcelSyncModal({ isOpen, onClose, units = [], onNotify }) {
  const [fileTransaksi, setFileTransaksi] = useState(null);
  const [fileBukuBesar, setFileBukuBesar] = useState(null);
  const [isDraggingTransaksi, setIsDraggingTransaksi] = useState(false);
  const [isDraggingBukuBesar, setIsDraggingBukuBesar] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const inputTransaksiRef = useRef(null);
  const inputBukuBesarRef = useRef(null);

  if (!isOpen) return null;

  const handleDrop = (e, setFile, setDragging) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setFile(file);
        setAnalysisResult(null);
      } else {
        onNotify({
          title: "Format Tidak Sesuai",
          message: "Harap upload file Excel format .xlsx atau .xls",
          type: "warning"
        });
      }
    }
  };

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFile(file);
      setAnalysisResult(null);
    }
  };

  const readBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleAnalyze = async () => {
    if (!fileTransaksi || !fileBukuBesar) {
      onNotify({
        title: "File Belum Lengkap",
        message: "Silakan upload kedua file Excel (File Transaksi dan Buku Besar).",
        type: "warning"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const [bufTransaksi, bufBukuBesar] = await Promise.all([
        readBuffer(fileTransaksi),
        readBuffer(fileBukuBesar)
      ]);

      const res = analyzePawnExcelFiles(bufTransaksi, bufBukuBesar, units);
      if (res.success) {
        setAnalysisResult(res);
        if (res.mutations.length === 0) {
          onNotify({
            title: "Data Sudah Sesuai",
            message: "Tidak ditemukan transaksi mutasi sepeda listrik baru yang belum tercatat.",
            type: "info"
          });
        } else {
          onNotify({
            title: "Analisis Selesai ⚡",
            message: `Ditemukan ${res.counts.total} transaksi mutasi sepeda listrik.`,
            type: "success"
          });
        }
      } else {
        onNotify({
          title: "Gagal Menganalisis",
          message: res.error || "Format kolom Excel tidak sesuai template laporan gadai.",
          type: "warning"
        });
      }
    } catch (err) {
      console.error(err);
      onNotify({
        title: "Kesalahan Pembacaan File",
        message: "Gagal memproses file Excel: " + (err.message || String(err)),
        type: "warning"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyMutations = async () => {
    if (!analysisResult || analysisResult.mutations.length === 0) return;

    setIsApplying(true);
    try {
      const res = await applyBatchSyncMutations(analysisResult.mutations);
      if (res.success) {
        onNotify({
          title: "Sinkronisasi Berhasil! 🎉",
          message: res.message,
          type: "success"
        });
        onClose();
      } else {
        onNotify({
          title: "Sinkronisasi Gagal",
          message: res.message || "Gagal menerapkan perubahan mutasi.",
          type: "warning"
        });
      }
    } catch (err) {
      onNotify({
        title: "Kesalahan Sinkronisasi",
        message: err.message || String(err),
        type: "warning"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const resetAll = () => {
    setFileTransaksi(null);
    setFileBukuBesar(null);
    setAnalysisResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-sky-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 leading-tight">
                Auto-Sinkronisasi Excel
              </h3>
              <p className="text-[11px] text-slate-500">
                Pencocokan Otomatis Laporan Mutasi & Pelunasan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Instruksi Singkat */}
          <div className="p-3 bg-sky-50/80 border border-sky-100 rounded-2xl text-[11px] text-sky-900 leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-sky-800">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Sistem Otomatis Deteksi Mutasi:
            </span>
            Upload <span className="font-bold">File Transaksi</span> (order & jatuh tempo) dan{' '}
            <span className="font-bold">File Buku Besar</span> (pelunasan FBR & bunga). Sistem akan otomatis
            mendeteksi perpanjangan gadai, unit ditebus, dan unit gadai baru.
          </div>

          {/* DROPZONE FILE 1: TRANSAKSI */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-black">
                  1
                </span>
                File Transaksi (*.xlsx)
              </label>
              {fileTransaksi && (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Siap
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingTransaksi(true); }}
              onDragLeave={() => setIsDraggingTransaksi(false)}
              onDrop={(e) => handleDrop(e, setFileTransaksi, setIsDraggingTransaksi)}
              onClick={() => inputTransaksiRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-3.5 text-center cursor-pointer transition-all ${
                fileTransaksi
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : isDraggingTransaksi
                  ? 'bg-sky-100 border-sky-500 scale-[1.01]'
                  : 'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-sky-50/40'
              }`}
            >
              <input
                ref={inputTransaksiRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => handleFileChange(e, setFileTransaksi)}
              />
              {fileTransaksi ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{fileTransaksi.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {(fileTransaksi.size / 1024).toFixed(1)} KB • Klik untuk ganti
                      </p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              ) : (
                <div className="py-2">
                  <UploadCloud className="w-7 h-7 text-sky-500 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-bold text-slate-700">Tarik & Lepas File Transaksi</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">atau klik untuk telusuri (Transaksi_*.xlsx)</p>
                </div>
              )}
            </div>
          </div>

          {/* DROPZONE FILE 2: BUKU BESAR */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-black">
                  2
                </span>
                File Buku Besar (*.xlsx)
              </label>
              {fileBukuBesar && (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Siap
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingBukuBesar(true); }}
              onDragLeave={() => setIsDraggingBukuBesar(false)}
              onDrop={(e) => handleDrop(e, setFileBukuBesar, setIsDraggingBukuBesar)}
              onClick={() => inputBukuBesarRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-3.5 text-center cursor-pointer transition-all ${
                fileBukuBesar
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : isDraggingBukuBesar
                  ? 'bg-sky-100 border-sky-500 scale-[1.01]'
                  : 'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-sky-50/40'
              }`}
            >
              <input
                ref={inputBukuBesarRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => handleFileChange(e, setFileBukuBesar)}
              />
              {fileBukuBesar ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{fileBukuBesar.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {(fileBukuBesar.size / 1024).toFixed(1)} KB • Klik untuk ganti
                      </p>
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              ) : (
                <div className="py-2">
                  <UploadCloud className="w-7 h-7 text-sky-500 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-bold text-slate-700">Tarik & Lepas File Buku Besar</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">atau klik untuk telusuri (Buku_Besar_*.xlsx)</p>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Analisis */}
          {!analysisResult && (
            <button
              onClick={handleAnalyze}
              disabled={!fileTransaksi || !fileBukuBesar || isAnalyzing}
              className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
                fileTransaksi && fileBukuBesar && !isAnalyzing
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/25 hover:from-sky-600 hover:to-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menganalisis Transaksi Mutasi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Mulai Analisis & Validasi Mutasi</span>
                </>
              )}
            </button>
          )}

          {/* HASIL ANALISIS MUTASI */}
          {analysisResult && (
            <div className="space-y-3 pt-1 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">
                  Hasil Deteksi Mutasi ({analysisResult.counts.total})
                </span>
                <button
                  onClick={resetAll}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  Upload Ulang
                </button>
              </div>

              {/* Counters Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Perpanjangan</p>
                  <p className="text-base font-black text-amber-800">{analysisResult.counts.perpanjang}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <p className="text-[10px] font-bold text-blue-700 uppercase">Ditebus</p>
                  <p className="text-base font-black text-blue-800">{analysisResult.counts.tebus}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Gadai Baru</p>
                  <p className="text-base font-black text-emerald-800">{analysisResult.counts.baru}</p>
                </div>
              </div>

              {/* Mutasi List Cards */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                {analysisResult.mutations.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    Semua transaksi di kedua file sudah tercatat sinkron di database.
                  </div>
                ) : (
                  analysisResult.mutations.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md ${
                            m.type === 'PERPANJANG'
                              ? 'bg-amber-100 text-amber-800'
                              : m.type === 'TEBUS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {m.type === 'PERPANJANG' ? `JT: ${m.jatuhTempoBaru || '-'}` : ''}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pt-0.5">
                        {m.type === 'PERPANJANG' ? (
                          <>
                            <span className="text-slate-400 line-through">#{m.oldKodeGadai}</span>
                            <ArrowRight className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-700">#{m.newKodeGadai}</span>
                          </>
                        ) : (
                          <span>#{m.kodeGadai}</span>
                        )}
                        <span className="text-slate-500 font-normal truncate">• {m.merkSepeda}</span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Nasabah: <span className="font-semibold text-slate-700">{m.namaNasabah}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action Terapkan */}
              {analysisResult.mutations.length > 0 && (
                <button
                  onClick={handleApplyMutations}
                  disabled={isApplying}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all hover:from-emerald-700 hover:to-teal-700"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menerapkan ke Database & Storage...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Konfirmasi & Terapkan ({analysisResult.mutations.length} Mutasi)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

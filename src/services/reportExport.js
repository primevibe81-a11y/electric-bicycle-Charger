/**
 * Report Export Service (Excel & PDF with Photo Evidence & Mutation History)
 * Antrean Charger Sepeda Listrik & Gadai
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { getDaysSinceLastCharge, getChargeAuditInfo } from './chargerQueue';
import { normalizeHistoryEntry } from './storage';

/**
 * Format timestamp to Indo date string
 */
function formatIndoDate(ts) {
  if (!ts) return '-';
  try {
    return new Date(Number(ts)).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '-';
  }
}

/**
 * 1. Export Laporan Sepeda Listrik ke Format EXCEL (.xlsx)
 */
export function exportLaporanExcel(units, filterStatus = 'SEMUA', options = {}) {
  let filtered = filterStatus === 'SEMUA'
    ? [...units]
    : units.filter(u => u.statusBarang === filterStatus);

  if (options.sortBy === 'LOKASI_AZ') {
    filtered.sort((a, b) => {
      const locA = (a.lokasi || '').trim().toLowerCase();
      const locB = (b.lokasi || '').trim().toLowerCase();
      if (!locA && locB) return 1;
      if (locA && !locB) return -1;
      return locA.localeCompare(locB);
    });
  }

  const excelRows = filtered.map((u, index) => {
    const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    const audit = getChargeAuditInfo(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);

    // Kumpulkan riwayat nomor sebelumnya
    const rawHist = Array.isArray(u.riwayatKodeGadai) ? u.riwayatKodeGadai : [];
    const previousCodes = rawHist.map(e => {
      const norm = normalizeHistoryEntry(e);
      return `#${norm.kodeGadaiLama}`;
    }).join('; ') || '-';

    // Kumpulkan catatan dari riwayat lama jika ada
    const previousNotes = rawHist.map(e => {
      const norm = normalizeHistoryEntry(e);
      return `[#${norm.kodeGadaiLama}]: ${norm.catatanLama}`;
    }).join(' | ') || '-';

    return {
      'No': index + 1,
      'Nomor Gadai Aktif': u.kodeGadai,
      'Letak Unit (Gudang)': u.lokasi || 'Belum diisi',
      'Riwayat Nomor Gadai Lama': previousCodes,
      'Nama Nasabah': u.namaNasabah,
      'Merk & Model Sepeda': u.merkSepeda,
      'Status Barang': u.statusBarang,
      'Status Charger': u.statusCharger,
      'Kondisi Kesehatan Baterai': u.kondisiBaterai || 'PRIMA',
      'Catatan Khusus Baterai / Masalah': u.catatanBaterai || 'Kondisi normal',
      'Catatan di Nomor Gadai Sebelumnya': previousNotes,
      'Persentase Baterai Saat Ini': `${u.batteryLevel}%`,
      'Terakhir Di-Charge': formatIndoDate(u.lastChargedAt),
      'Hari Belum Di-Charge': `${days} Hari`,
      'Status Audit Peringatan': audit.label,
      'Tanggal Jatuh Tempo': formatIndoDate(u.jatuhTempoAt),
      'Nilai Taksiran / Pinjaman': Number(u.hargaLelang) || 0
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  // Set lebar kolom otomatis agar rapi saat dibuka di Excel
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Nomor Gadai
    { wch: 25 }, // Letak Unit
    { wch: 25 }, // Riwayat Nomor
    { wch: 22 }, // Nama Nasabah
    { wch: 30 }, // Merk Sepeda
    { wch: 15 }, // Status Barang
    { wch: 15 }, // Status Charger
    { wch: 20 }, // Kondisi Baterai
    { wch: 35 }, // Catatan Baterai
    { wch: 35 }, // Catatan Sebelumnya
    { wch: 15 }, // Baterai %
    { wch: 18 }, // Terakhir Charge
    { wch: 18 }, // Hari Belum Charge
    { wch: 22 }, // Status Audit
    { wch: 18 }, // Jatuh Tempo
    { wch: 20 }  // Nilai
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Sepeda Listrik');

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Sepeda_Listrik_Gadai_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return { success: true, count: filtered.length, fileName };
}

/**
 * 2. Generate Laporan Lengkap Sepeda Listrik ke Format PDF (.pdf)
 * Berisi laporan komprehensif, ringkasan populasi, bukti foto fisik, dan riwayat lengkap.
 */
export function generatePdfReport(units, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const filterStatus = options.filterStatus || 'SEMUA';
  let filtered = filterStatus === 'SEMUA'
    ? [...units]
    : units.filter(u => u.statusBarang === filterStatus);

  if (options.sortBy === 'LOKASI_AZ') {
    filtered.sort((a, b) => {
      const locA = (a.lokasi || '').trim().toLowerCase();
      const locB = (b.lokasi || '').trim().toLowerCase();
      if (!locA && locB) return 1;
      if (locA && !locB) return -1;
      return locA.localeCompare(locB);
    });
  }

  const totalAktif = units.filter(u => u.statusBarang === 'AKTIF').length;
  const totalLelang = units.filter(u => u.statusBarang === 'LELANG').length;
  const totalDitebus = units.filter(u => u.statusBarang === 'DITEBUS').length;
  const totalBermasalah = units.filter(u => u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA').length;

  let y = 14;

  // Header Dokumen
  doc.setFillColor(2, 132, 199); // Sky 600
  doc.rect(10, 10, 190, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PT MAKMUR BERSAMA GADAI - PASURUAN KOTA', 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('LAPORAN AUDIT & DOKUMENTASI FISIK SEPEDA LISTRIK GADAI', 15, 24);
  doc.text(`Dicetak: ${todayFormatted}`, 15, 29);

  y = 38;

  // Ringkasan Statistik
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN POPULASI FISIK SEPEDA LISTRIK:', 12, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(12, y, 186, 12, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Unit Fisik di Gudang: ${totalAktif + totalLelang} Unit`, 15, y + 5);
  doc.text(`• Aktif: ${totalAktif}  |  • Lelang: ${totalLelang}  |  • Ditebus: ${totalDitebus}  |  • Baterai Bermasalah: ${totalBermasalah}`, 15, y + 9.5);

  y += 18;

  // Loop Kartu Setiap Unit Sepeda Listrik
  doc.setFont('helvetica', 'normal');

  filtered.forEach((u, i) => {
    // Cek jika halaman hampir habis, buat halaman baru
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    const cardHeight = 44;
    const days = getDaysSinceLastCharge(u.lastChargedAt, u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null);
    const rawHist = Array.isArray(u.riwayatKodeGadai) ? u.riwayatKodeGadai : [];

    // Outer border kartu
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, y, 186, cardHeight, 2, 2, 'FD');

    // Header Card Bar
    const isDefect = u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA';
    if (isDefect) {
      doc.setFillColor(254, 243, 199); // Amber tint
    } else {
      doc.setFillColor(240, 249, 255); // Sky tint
    }
    doc.rect(12, y, 186, 8, 'F');

    // Nomor Gadai & Status
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${u.kodeGadai} - ${u.merkSepeda}`, 15, y + 5.5);

    doc.setFontSize(8);
    doc.text(`Status: [ ${u.statusBarang} ]`, 140, y + 5.5);
    doc.text(`Bat: ${u.batteryLevel}%`, 175, y + 5.5);

    // Kiri: Bukti Foto Fisik Box (Photo Evidence Thumbnail / Watermark Box)
    const photoX = 15;
    const photoY = y + 10;
    const photoW = 34;
    const photoH = 30;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(photoX, photoY, photoW, photoH, 'FD');

    // Silhouette icon & watermark label bukti foto
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('[ BUKTI FOTO FISIK ]', photoX + 3.5, photoY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('DOKUMENTASI UNIT', photoX + 5, photoY + 17);
    doc.text(`GUDANG PASURUAN`, photoX + 5, photoY + 21);
    doc.text(`#${u.kodeGadai}`, photoX + 9, photoY + 26);

    // Kanan: Detail Spesifikasi, Baterai, dan Riwayat
    const detailX = 53;
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');

    doc.text(`Nasabah : ${u.namaNasabah}  |  Letak Gudang: ${u.lokasi || 'Belum diisi'}`, detailX, y + 14);
    doc.text(`Kondisi : ${u.kondisiBaterai || 'PRIMA'} | Belum Charge: ${days} Hari | Jatuh Tempo: ${formatIndoDate(u.jatuhTempoAt)}`, detailX, y + 19);

    // Catatan Masalah / Fisik Khusus
    const catatan = u.catatanBaterai ? u.catatanBaterai.slice(0, 75) : 'Kondisi fisik normal, tidak ada catatan komplain.';
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.setFont('helvetica', 'bold');
    doc.text(`Catatan Fisik/Baterai:`, detailX, y + 25);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(catatan, detailX + 32, y + 25);

    // Riwayat Nomor Gadai Lama & Mutasi
    if (rawHist.length > 0) {
      const histItem = normalizeHistoryEntry(rawHist[0]);
      doc.setTextColor(194, 65, 12); // Orange-700
      doc.setFont('helvetica', 'bold');
      doc.text(`Riwayat Perpanjangan :`, detailX, y + 31);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Pernah bernomor #${histItem.kodeGadaiLama} | Catatan lama: ${histItem.catatanLama.slice(0, 45)}`, detailX + 35, y + 31);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text(`Riwayat Perpanjangan : Unit akad pertama (Belum pernah mutasi nomor)`, detailX, y + 31);
    }

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ID Sistem: ${u.id} | Update: ${formatIndoDate(u.updatedAt)}`, detailX, y + 37);

    y += cardHeight + 4;
  });

  // Footer Pengesahan
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  y += 6;
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Mengetahui / Mengesahkan,', 20, y);
  doc.text('Pasuruan, ' + todayFormatted, 135, y);

  doc.text('Petugas Gudang E-Bike', 20, y + 6);
  doc.text('Kepala Cabang Pasuruan Kota', 135, y + 6);

  doc.line(20, y + 28, 65, y + 28);
  doc.line(135, y + 28, 185, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.text('( Derick / Petugas Gudang )', 20, y + 32);
  doc.text('( Pimpinan Cabang MBG )', 135, y + 32);

  const todayStr = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Lengkap_Sepeda_Listrik_${todayStr}.pdf`;
  doc.save(fileName);

  return { success: true, count: filtered.length, fileName };
}

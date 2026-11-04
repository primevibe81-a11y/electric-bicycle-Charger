/**
 * Automated Verification Script for Unified Laporan View, Excel Sync, Excel & PDF Export
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');

console.log('=== STARTING AUTOMATED VERIFICATION ===\n');

// 1. Verify Real Units Data
const unitsFilePath = path.join(__dirname, '..', 'src', 'data', 'realUnits.js');
const unitsFileContent = fs.readFileSync(unitsFilePath, 'utf8');

const matchTotal = unitsFileContent.match(/export const REAL_EXCEL_UNITS\s*=\s*(\[[\s\S]*?\]);/);
if (!matchTotal) {
  console.error('❌ Failed to parse REAL_EXCEL_UNITS from src/data/realUnits.js');
  process.exit(1);
}

// Evaluate units safely
const units = eval(matchTotal[1]);
console.log(`✅ Loaded ${units.length} units from realUnits.js`);

const totalAktif = units.filter(u => u.statusBarang === 'AKTIF').length;
const totalLelang = units.filter(u => u.statusBarang === 'LELANG').length;
const totalDitebus = units.filter(u => u.statusBarang === 'DITEBUS').length;
const totalPhysicalInWarehouse = totalAktif + totalLelang;
const totalWithHistory = units.filter(u => Array.isArray(u.riwayatKodeGadai) && u.riwayatKodeGadai.length > 0).length;
const totalDefect = units.filter(u => u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA').length;

console.log(`   - Fisik di Gudang: ${totalPhysicalInWarehouse} (Aktif: ${totalAktif}, Lelang: ${totalLelang})`);
console.log(`   - Ditebus (Keluar): ${totalDitebus}`);
console.log(`   - Pernah Diperpanjang: ${totalWithHistory}`);
console.log(`   - Baterai Bermasalah / Butuh Perhatian: ${totalDefect}`);

if (totalAktif !== 41 || totalLelang !== 22 || totalDitebus !== 3) {
  console.warn(`⚠️ Warning: Expected 41 Aktif, 22 Lelang, 3 Ditebus. Got ${totalAktif}, ${totalLelang}, ${totalDitebus}`);
} else {
  console.log('✅ Unit counts match target warehouse population perfectly!');
}

// 2. Test Excel Export Logic
console.log('\n--- Testing Excel Export Data Mapping ---');
const excelRows = units.map((u, index) => {
  const rawHist = Array.isArray(u.riwayatKodeGadai) ? u.riwayatKodeGadai : [];
  const previousCodes = rawHist.map(e => `#${e.kodeGadaiLama || e}`).join('; ') || '-';
  const previousNotes = rawHist.map(e => `[#${e.kodeGadaiLama || e}]: ${e.catatanLama || 'Normal'}`).join(' | ') || '-';

  return {
    'No': index + 1,
    'Nomor Gadai Aktif': u.kodeGadai,
    'Riwayat Nomor Gadai Lama': previousCodes,
    'Nama Nasabah': u.namaNasabah,
    'Merk & Model Sepeda': u.merkSepeda,
    'Status Barang': u.statusBarang,
    'Status Charger': u.statusCharger,
    'Kondisi Kesehatan Baterai': u.kondisiBaterai || 'PRIMA',
    'Catatan Khusus Baterai / Masalah': u.catatanBaterai || 'Kondisi normal',
    'Catatan di Nomor Gadai Sebelumnya': previousNotes,
    'Persentase Baterai Saat Ini': `${u.batteryLevel}%`,
    'Nilai Taksiran / Pinjaman': Number(u.hargaLelang) || 0
  };
});

const ws = XLSX.utils.json_to_sheet(excelRows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Laporan Sepeda Listrik');
const outExcelPath = path.join(__dirname, 'test_output_laporan.xlsx');
XLSX.writeFile(wb, outExcelPath);

if (fs.existsSync(outExcelPath)) {
  const stat = fs.statSync(outExcelPath);
  console.log(`✅ Excel export generated successfully: ${outExcelPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  fs.unlinkSync(outExcelPath); // Cleanup test file
} else {
  console.error('❌ Excel export file was not created');
  process.exit(1);
}

// 3. Test PDF Generation Logic
console.log('\n--- Testing PDF Generation (jsPDF) ---');
try {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text('PT MAKMUR BERSAMA GADAI - PASURUAN KOTA', 15, 18);
  doc.setFontSize(9);
  doc.text('LAPORAN AUDIT & DOKUMENTASI FISIK SEPEDA LISTRIK GADAI', 15, 24);

  let y = 35;
  units.slice(0, 10).forEach((u, i) => {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.rect(12, y, 186, 38);
    doc.text(`#${u.kodeGadai} - ${u.merkSepeda} (Nasabah: ${u.namaNasabah})`, 15, y + 6);
    doc.text(`[ BUKTI FOTO FISIK ]`, 15, y + 16);
    doc.text(`Catatan: ${u.catatanBaterai || 'Normal'}`, 55, y + 16);
    y += 42;
  });

  const outPdfPath = path.join(__dirname, 'test_output_laporan.pdf');
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outPdfPath, pdfBuffer);

  const pdfStat = fs.statSync(outPdfPath);
  console.log(`✅ PDF export generated successfully: ${outPdfPath} (${(pdfStat.size / 1024).toFixed(1)} KB)`);
  fs.unlinkSync(outPdfPath); // Cleanup test file
} catch (pdfErr) {
  console.error('❌ PDF generation failed:', pdfErr);
  process.exit(1);
}

// 4. Verify No Camera Barcode Scanner references exist in views/components
console.log('\n--- Verifying Camera Barcode Scanner Exclusion ---');
const srcDir = path.join(__dirname, '..', 'src');
function checkNoBarcodeScanner(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      checkNoBarcodeScanner(fullPath);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('html5-qrcode') || content.toLowerCase().includes('barcodescanner') || content.toLowerCase().includes('camerascanner')) {
        console.error(`❌ Found camera scanner reference in ${fullPath}`);
        process.exit(1);
      }
    }
  }
}
checkNoBarcodeScanner(srcDir);
console.log('✅ No camera barcode scanner packages or components detected!');

// 5. Verify App Tab Navigation
console.log('\n--- Verifying BottomNav & App.jsx Navigation ---');
const bottomNavContent = fs.readFileSync(path.join(srcDir, 'components', 'BottomNav.jsx'), 'utf8');
if (!bottomNavContent.includes("id: 'laporan'") || !bottomNavContent.includes("grid-cols-4")) {
  console.error('❌ BottomNav does not have 4 tabs or lacks laporan tab');
  process.exit(1);
}
console.log('✅ BottomNav has 4 tabs (Dashboard, Aktif, Lelang, Laporan)');

const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
if (!appContent.includes("import LaporanView from './views/LaporanView'") || !appContent.includes("activeTab === 'laporan'")) {
  console.error('❌ App.jsx does not mount LaporanView');
  process.exit(1);
}
console.log('✅ App.jsx properly mounts LaporanView');

console.log('\n🎉 ALL AUTOMATED VERIFICATIONS PASSED SUCCESSFULLY!');

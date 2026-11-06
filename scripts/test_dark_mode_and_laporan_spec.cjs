const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Automated Tests: 7 Dark Mode & Laporan Layout Inconsistencies...\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

const aktifCode = fs.readFileSync('src/views/AktifView.jsx', 'utf8');
const lelangCode = fs.readFileSync('src/views/LelangView.jsx', 'utf8');
const laporanCode = fs.readFileSync('src/views/LaporanView.jsx', 'utf8');
const batteryIndicatorCode = fs.readFileSync('src/components/BatteryIndicator.jsx', 'utf8');
const bottomSheetCode = fs.readFileSync('src/components/BottomSheet.jsx', 'utf8');

// 1. Judul Halaman di Tab Aktif & Lelang
it('1. Judul halaman di Aktif dan Lelang memiliki text-slate-900 dark:text-white', () => {
  assert.ok(aktifCode.includes('Unit Gadai Aktif') && aktifCode.includes('text-slate-900 dark:text-white'), 'Judul Unit Gadai Aktif harus dark:text-white');
  assert.ok(lelangCode.includes('Manajemen Unit Lelang') && lelangCode.includes('text-slate-900 dark:text-white'), 'Judul Manajemen Unit Lelang harus dark:text-white');
});

// 2. Search & Filter Bar di Tab Aktif & Lelang bebas belang putih
it('2a. Container search & filter di Aktif dan Lelang menggunakan bg-white dark:bg-[#0B0F17]', () => {
  assert.ok(aktifCode.includes('bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800/80'), 'AktifView container search filter harus dark:bg-[#0B0F17]');
  assert.ok(lelangCode.includes('bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800/80'), 'LelangView container search filter harus dark:bg-[#0B0F17]');
});

it('2b. Input search di Aktif dan Lelang menggunakan bg-slate-50 dark:bg-[#151C28]', () => {
  assert.ok(aktifCode.includes('bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232F42] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500'), 'Input search AktifView harus dark mode ready');
  assert.ok(lelangCode.includes('bg-slate-50 dark:bg-[#151C28] border border-slate-200 dark:border-[#232F42] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500'), 'Input search LelangView harus dark mode ready');
});

it('2c. Chip filter tidak aktif dan tombol sortir menggunakan bg-white dark:bg-[#151C28]', () => {
  assert.ok(aktifCode.includes('bg-white dark:bg-[#151C28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#232F42]'), 'Chip filter AktifView harus dark mode ready');
  assert.ok(lelangCode.includes('bg-white dark:bg-[#151C28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#232F42]'), 'Chip filter LelangView harus dark mode ready');
});

// 3. Dark Mode pada Seluruh Kartu Unit & Filter di Halaman Laporan
it('3a. Kartu unit di halaman Laporan berlatar bg-white dark:bg-[#151C28]', () => {
  assert.ok(laporanCode.includes('bg-white dark:bg-[#151C28] rounded-2xl p-3 border transition-colors shadow-xs pressable-card unit-card-optimized border-slate-200/80 dark:border-[#232F42] text-slate-900 dark:text-slate-100'), 'Kartu LaporanView harus dark:bg-[#151C28] dan text-slate-900 dark:text-slate-100');
});

it('3b. Tombol aksi di bawah kartu Laporan (Audit, Perpanjang, Tebus) memiliki gaya Dark Mode sesuai spesifikasi', () => {
  assert.ok(laporanCode.includes('bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'), 'Tombol Audit harus dark mode ready');
  assert.ok(laporanCode.includes('bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'), 'Tombol Perpanjang harus dark mode ready');
  assert.ok(laporanCode.includes('bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'), 'Tombol Tebus harus dark mode ready');
});

// 4. Label Teks pada 3 Kartu Statistik di Laporan
it('4. 3 kartu statistik di halaman Laporan memiliki label teks: FISIK GUDANG, DITEBUS, BERMASALAH', () => {
  assert.ok(laporanCode.includes('FISIK GUDANG'), 'Kartu 1 Laporan harus memiliki label FISIK GUDANG');
  assert.ok(laporanCode.includes('DITEBUS'), 'Kartu 2 Laporan harus memiliki label DITEBUS');
  assert.ok(laporanCode.includes('BERMASALAH'), 'Kartu 3 Laporan harus memiliki label BERMASALAH');
  assert.ok(laporanCode.includes('text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5'), 'Label harus menggunakan kelas uppercase tracking-wider text-slate-500 dark:text-slate-400');
});

// 5. Rapikan Duplikasi Tombol & Ikon Bisu di Laporan
it('5a. Duplikasi tombol Audit di kanan tengah kartu unit Laporan telah dihapus', () => {
  assert.ok(!laporanCode.includes('h-8 px-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold border border-sky-200 transition-colors'), 'Tombol Audit kecil di kanan tengah harus dihapus');
});

it('5b. Emoji ganda pada tombol Salin Ringkasan WA telah dihapus', () => {
  assert.ok(!laporanCode.includes('📋 Salin Ringkasan WA'), 'Emoji 📋 di depan Salin Ringkasan WA harus dihapus');
  assert.ok(laporanCode.includes('Salin Ringkasan WA'), 'Teks Salin Ringkasan WA tetap ada');
});

it('5c. Tombol ekspor & kirim laporan memiliki label teks jelas: PDF Kacab, Excel, Kontak', () => {
  assert.ok(laporanCode.includes('PDF Kacab</span>'), 'Harus ada tombol PDF Kacab');
  assert.ok(laporanCode.includes('Excel</span>'), 'Harus ada tombol Excel');
  assert.ok(laporanCode.includes('Kontak</span>'), 'Harus ada tombol Kontak');
  assert.ok(!laporanCode.includes('📄 PDF Kacab'), 'Tidak boleh ada emoji 📄 di tombol PDF Kacab');
  assert.ok(!laporanCode.includes('📊 Excel'), 'Tidak boleh ada emoji 📊 di tombol Excel');
  assert.ok(!laporanCode.includes('⚙️ Kontak'), 'Tidak boleh ada emoji ⚙️ di tombol Kontak');
});

// 6. Bersihkan Ikon Bisu & Tombol Putih Menyilaukan di Dalam Kartu Unit (Semua Tab)
it('6a. Metadata kartu unit menggunakan pemisah titik (•) dan teks "hari lalu" (bukan "h lalu")', () => {
  assert.ok(aktifCode.includes('Charge ${daysAgo} hari lalu') || aktifCode.includes('Charge hari ini'), 'AktifView harus menggunakan teks Charge X hari lalu');
  assert.ok(lelangCode.includes('Charge ${daysAgo} hari lalu') || lelangCode.includes('Charge hari ini'), 'LelangView harus menggunakan teks Charge X hari lalu');
  assert.ok(laporanCode.includes('Charge ${daysSinceCharge} hari lalu') || laporanCode.includes('Charge hari ini'), 'LaporanView harus menggunakan teks Charge X hari lalu');
  assert.ok(!aktifCode.includes('`${daysAgo}h lalu`'), 'AktifView tidak boleh menyingkat h lalu');
  assert.ok(!lelangCode.includes('`${daysAgo}h lalu`'), 'LelangView tidak boleh menyingkat h lalu');
  assert.ok(!laporanCode.includes('`${daysSinceCharge}h lalu`'), 'LaporanView tidak boleh menyingkat h lalu');
});

it('6b. Tombol sekunder di kartu unit (tombol ... di Aktif, tombol Antrian di Lelang) menggunakan bg-slate-100 dark:bg-slate-800', () => {
  assert.ok(aktifCode.includes('border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'), 'Tombol ... di AktifView harus dark mode ready');
  assert.ok(lelangCode.includes('bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700'), 'Badge antrian di LelangView harus dark mode ready');
});

it('6c. Badge baterai level 100 memiliki tema dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30', () => {
  assert.ok(batteryIndicatorCode.includes('bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'), 'BatteryIndicator harus memiliki dark mode classes untuk level normal');
});

it('6d. BottomSheet global mendukung tema dark:bg-[#151C28]', () => {
  assert.ok(bottomSheetCode.includes('dark:bg-[#151C28]'), 'BottomSheet harus memiliki dark:bg-[#151C28]');
});

console.log(`\n=============================================`);
console.log(`🏁 Total Tests: ${passCount + failCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`=============================================\n`);

if (failCount > 0) {
  process.exit(1);
}

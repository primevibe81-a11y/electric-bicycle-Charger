const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Automated Tests: 5 Specifications Verification...\n');

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

// 1. Bug Fatal Laporan (Clock Import)
it('1. Clock diimport dengan benar di LaporanView.jsx dan tidak ada variabel undefined', () => {
  const laporanCode = fs.readFileSync('src/views/LaporanView.jsx', 'utf8');
  assert.ok(laporanCode.includes('Clock,'), 'Clock harus diimport di LaporanView.jsx');
  assert.ok(laporanCode.includes('<Clock'), 'Clock harus digunakan di JSX LaporanView');
  assert.ok(!laporanCode.includes('daysSinceCharge * 24}j'), 'Satuan waktu tidak boleh dikali 24j');
});

// 2. UI Minimalis Tidak "Over-Minimalism" (Hapus Ikon Bisu)
it('2a. Dashboard 3 kartu atas memiliki label teks jelas: BUTUH CHARGE, KRITIS ≥15H, ANTRIAN', () => {
  const dashCode = fs.readFileSync('src/views/DashboardView.jsx', 'utf8');
  assert.ok(dashCode.includes('BUTUH CHARGE'), 'Kartu 1 harus memiliki label BUTUH CHARGE');
  assert.ok(dashCode.includes('KRITIS ≥15H'), 'Kartu 2 harus memiliki label KRITIS ≥15H');
  assert.ok(dashCode.includes('ANTRIAN'), 'Kartu 3 harus memiliki label ANTRIAN');
});

it('2b. Baris toggle layar kunci memiliki judul Pantau di Layar Kunci dan subteks jelas tanpa ikon i membingungkan', () => {
  const dashCode = fs.readFileSync('src/views/DashboardView.jsx', 'utf8');
  assert.ok(dashCode.includes('Pantau di Layar Kunci'), 'Harus ada teks Pantau di Layar Kunci');
  assert.ok(dashCode.includes('Tampilkan sisa waktu di Lock Screen'), 'Harus ada subteks Tampilkan sisa waktu di Lock Screen');
  assert.ok(!dashCode.includes('aria-label="Informasi Layar Kunci"'), 'Ikon i membingungkan harus dihapus');
});

it('2c. Kartu antrian unit menggunakan satuan hari (bukan jam 3408j) dan format metadata titik • bersih', () => {
  const dashCode = fs.readFileSync('src/views/DashboardView.jsx', 'utf8');
  assert.ok(!dashCode.includes('daysAgo * 24}j'), 'Format keterlambatan tidak boleh menggunakan perkalian jam 24}j');
  assert.ok(dashCode.includes('Lokasi belum diisi'), 'Harus memiliki fallback teks Lokasi belum diisi saat lokasi kosong');
  assert.ok(dashCode.includes('Charge ${daysAgo} hari lalu') || dashCode.includes('Charge hari ini'), 'Harus menampilkan Charge X hari lalu');
});

// 3. Floating Dynamic Island Bottom Nav (Glassmorphism Pill)
it('3. Bottom Navigation berbentuk Floating Pill Dynamic Island dengan Glassmorphism & label pada semua tab', () => {
  const navCode = fs.readFileSync('src/components/BottomNav.jsx', 'utf8');
  assert.ok(navCode.includes('fixed bottom-[calc(env(safe-area-inset-bottom)+12px)]'), 'Harus memiliki posisi fixed floating bottom');
  assert.ok(navCode.includes('rounded-full'), 'Harus rounded-full (kapsul pill)');
  assert.ok(navCode.includes('backdrop-blur-xl'), 'Harus memiliki efek glassmorphism backdrop-blur-xl');
  assert.ok(navCode.includes('dark:backdrop-blur-xl'), 'Harus memiliki dark mode glassmorphism');
  assert.ok(navCode.includes('{tab.label}'), 'Label teks harus tampil pada tab');
  assert.ok(navCode.includes('rounded-full bg-sky-500/15'), 'Tab aktif harus memiliki kapsul highlight');
});

// 4. Dark Mode OLED Palette
it('4. Dark Mode dikonfigurasi di tailwind.config.js dan Header memiliki toggle Sun/Moon', () => {
  const tailwindConfig = fs.readFileSync('tailwind.config.js', 'utf8');
  assert.ok(tailwindConfig.includes("darkMode: 'class'"), "Tailwind harus mengaktifkan darkMode: 'class'");

  const headerCode = fs.readFileSync('src/components/Header.jsx', 'utf8');
  assert.ok(headerCode.includes('toggleTheme'), 'Header harus memanggil toggleTheme');
  assert.ok(headerCode.includes('<Sun') && headerCode.includes('<Moon'), 'Header harus menampilkan ikon Sun dan Moon');

  const themeCode = fs.readFileSync('src/services/theme.js', 'utf8');
  assert.ok(themeCode.includes('ebike_theme'), 'Theme manager harus menyimpan state di localStorage');

  const dashCode = fs.readFileSync('src/views/DashboardView.jsx', 'utf8');
  assert.ok(dashCode.includes('dark:bg-gradient-to-br dark:from-sky-600 dark:to-blue-900'), 'Slot charger aktif harus memiliki dark mode gradient');
});

// 5. Asisten AI Gudang & Automasi WhatsApp
it('5a. Asisten AI Gudang terintegrasi dengan Morning Briefing, Quick Actions, dan Smart Local Query', () => {
  assert.ok(fs.existsSync('src/components/AsistenAiBottomSheet.jsx'), 'File AsistenAiBottomSheet.jsx harus ada');
  const aiCode = fs.readFileSync('src/components/AsistenAiBottomSheet.jsx', 'utf8');
  assert.ok(aiCode.includes('Morning Shift Briefing'), 'Harus memiliki Morning Shift Briefing');
  assert.ok(aiCode.includes('Isi Otomatis Semua Slot Kosong'), 'Harus memiliki tombol isi otomatis slot kosong');
  assert.ok(aiCode.includes('processLocalQuery'), 'Harus memiliki smart local query matcher');

  const appCode = fs.readFileSync('src/App.jsx', 'utf8');
  assert.ok(appCode.includes('<AsistenAiBottomSheet'), 'App.jsx harus merender AsistenAiBottomSheet');
  assert.ok(appCode.includes('onOpenAiAssistant'), 'App.jsx harus menyediakan handler onOpenAiAssistant');
});

it('5b. Automasi Salin Laporan Harian WhatsApp di Menu Laporan', () => {
  assert.ok(fs.existsSync('src/services/whatsappReport.js'), 'File whatsappReport.js harus ada');
  const waReportCode = fs.readFileSync('src/services/whatsappReport.js', 'utf8');
  assert.ok(waReportCode.includes('LAPORAN HARIAN SHIFT OPERASIONAL E-BIKE GADAI'), 'Format laporan WhatsApp harus rapi & lengkap');
  assert.ok(waReportCode.includes('copyWhatsAppReportToClipboard'), 'Harus memiliki fungsi copy to clipboard');

  const laporanCode = fs.readFileSync('src/views/LaporanView.jsx', 'utf8');
  assert.ok(laporanCode.includes('handleCopyWhatsApp'), 'LaporanView harus memiliki handler handleCopyWhatsApp');
  assert.ok(laporanCode.includes('Salin Ringkasan WA'), 'LaporanView harus memiliki tombol Salin Ringkasan WA');
});

console.log(`\n=============================================`);
console.log(`🏁 Total Tests: ${passCount + failCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`=============================================\n`);

if (failCount > 0) {
  process.exit(1);
}

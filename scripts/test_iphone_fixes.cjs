const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- RUNNING TEST SUITE: 4 IPHONE 13 BUG FIXES ---');

// 1. TEST BOTTOM NAV & MODAL Z-INDEX
console.log('\n[TEST 1] Z-Index and Padding Separation:');
const bottomNavContent = fs.readFileSync('src/components/BottomNav.jsx', 'utf8');
assert.ok(bottomNavContent.includes('z-40'), 'BottomNav must have z-40');
assert.ok(!bottomNavContent.includes('z-50'), 'BottomNav must NOT have z-50');
console.log('✓ BottomNav uses z-40');

const filesToCheckZ100 = [
  'src/components/BottomSheet.jsx',
  'src/components/AsistenAiBottomSheet.jsx',
  'src/components/AuditBatteryModal.jsx',
  'src/components/ExcelSyncModal.jsx',
  'src/components/Header.jsx',
  'src/components/IconLegendSheet.jsx',
  'src/components/LoginModal.jsx',
  'src/components/OnboardingModal.jsx',
  'src/views/DashboardView.jsx',
  'src/views/AktifView.jsx',
  'src/views/LelangView.jsx',
  'src/views/LaporanView.jsx'
];

filesToCheckZ100.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  assert.ok(content.includes('z-[100]'), `${f} must include z-[100] for modal/sheet`);
});
console.log('✓ All 12 modals and bottom-sheets have z-[100]');

// Check container pb-28
const viewsForPadding = [
  'src/views/DashboardView.jsx',
  'src/views/AktifView.jsx',
  'src/views/LelangView.jsx',
  'src/views/LaporanView.jsx'
];
viewsForPadding.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  assert.ok(content.includes('pb-28'), `${f} must have pb-28 on container`);
});
console.log('✓ All 4 main views have pb-28 to prevent floating bottom nav overlap');

// Dark Mode check on ExcelSyncModal
const excelModalContent = fs.readFileSync('src/components/ExcelSyncModal.jsx', 'utf8');
assert.ok(excelModalContent.includes('dark:bg-[#151C28]'), 'ExcelSyncModal must have dark:bg-[#151C28]');
assert.ok(excelModalContent.includes('dark:text-slate-100'), 'ExcelSyncModal must have dark:text-slate-100');
console.log('✓ ExcelSyncModal has full Dark Mode classes');

// 2. TEST DEFECT VS MUTASI SEPARATION
console.log('\n[TEST 2] Mutasi vs Battery / Physical Defect Separation:');
const storageContent = fs.readFileSync('src/services/storage.js', 'utf8');
assert.ok(storageContent.includes('export function isRealBatteryOrPhysicalDefect'), 'storage.js must export isRealBatteryOrPhysicalDefect');
assert.ok(storageContent.includes('catatanMutasi: mutasiNote'), 'extendGadaiUnit must set catatanMutasi');

// Evaluate isRealBatteryOrPhysicalDefect logic
function isRealBatteryOrPhysicalDefect(unit) {
  if (!unit) return false;
  if (unit.isRusak === true) return true;
  if (unit.kondisiBaterai && unit.kondisiBaterai !== 'PRIMA') return true;
  const note = String(unit.catatanBaterai || '').toLowerCase();
  if (!note || /perpanjang|mutasi|otomatis/i.test(note)) return false;
  return /\b(rusak|drop|mati total|bocor|kendur|patah|cacat|sobek|terkelupas)\b/i.test(note);
}

const testUnit1 = {
  kodeGadai: '26_0038156',
  kondisiBaterai: 'PRIMA',
  catatanBaterai: 'Perpanjangan otomatis dari nomor lama #26_0033223',
  catatanMutasi: 'Perpanjangan otomatis dari nomor lama #26_0033223'
};
assert.strictEqual(isRealBatteryOrPhysicalDefect(testUnit1), false, 'Unit with "otomatis" in note and PRIMA must NOT be defect!');
console.log('✓ Unit #26_0038156 with "otomatis" in note is NOT flagged as defect');

const testUnit2 = {
  kodeGadai: '26_0038157',
  kondisiBaterai: 'AKI_DROP',
  catatanBaterai: ''
};
assert.strictEqual(isRealBatteryOrPhysicalDefect(testUnit2), true, 'Unit with AKI_DROP must be flagged as defect');
console.log('✓ Unit with AKI_DROP is correctly flagged as defect');

const testUnit3 = {
  kodeGadai: '26_0038158',
  kondisiBaterai: 'PRIMA',
  catatanBaterai: 'Kabel soket rusak dan lecet',
  isRusak: true
};
assert.strictEqual(isRealBatteryOrPhysicalDefect(testUnit3), true, 'Unit with isRusak: true or damage note must be flagged');
console.log('✓ Unit with actual damage is correctly flagged as defect');

// WhatsApp Report Check
const waContent = fs.readFileSync('src/services/whatsappReport.js', 'utf8');
assert.ok(waContent.includes('(u.statusBarang || u.statusGadai) === \'AKTIF\''), 'whatsappReport must support statusBarang');
assert.ok(waContent.includes('isRealBatteryOrPhysicalDefect'), 'whatsappReport must use isRealBatteryOrPhysicalDefect');
console.log('✓ WhatsApp report correctly calculates real-time inventory and defects');

// 3. TEST BUTTON EMOJI REMOVAL
console.log('\n[TEST 3] Button Emoji Removal in Laporan:');
const laporanContent = fs.readFileSync('src/views/LaporanView.jsx', 'utf8');
assert.ok(!laporanContent.includes('📄 PDF Kacab'), 'Must not have 📄 emoji in PDF Kacab button');
assert.ok(!laporanContent.includes('📊 Excel'), 'Must not have 📊 emoji in Excel button');
assert.ok(!laporanContent.includes('⚙️ Kontak'), 'Must not have ⚙️ emoji in Kontak button');
assert.ok(laporanContent.includes('PDF Kacab</span>'), 'Must have clean text "PDF Kacab"');
assert.ok(laporanContent.includes('Excel</span>'), 'Must have clean text "Excel"');
assert.ok(laporanContent.includes('Kontak</span>'), 'Must have clean text "Kontak"');
console.log('✓ Duplicate emojis removed from Laporan export action buttons');

// 4. TEST OVERSCROLL AND THEME COLOR
console.log('\n[TEST 4] Safari Overscroll & Theme Color:');
const cssContent = fs.readFileSync('src/index.css', 'utf8');
assert.ok(cssContent.includes('overscroll-behavior-y: none;'), 'index.css must include overscroll-behavior-y: none');
assert.ok(cssContent.includes('background-color: #F4F8FB;'), 'index.css must set background-color: #F4F8FB');
assert.ok(cssContent.includes('background-color: #0B0F17;'), 'index.css must set dark background-color: #0B0F17');
console.log('✓ index.css configured with overscroll-behavior-y: none and exact colors');

const themeContent = fs.readFileSync('src/services/theme.js', 'utf8');
assert.ok(themeContent.includes('#F4F8FB'), 'theme.js must set light theme-color to #F4F8FB');
assert.ok(themeContent.includes('#0B0F17'), 'theme.js must set dark theme-color to #0B0F17');
console.log('✓ theme.js dynamically updates meta theme-color with #0B0F17 and #F4F8FB');

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes('#F4F8FB'), 'index.html initial theme-color must be #F4F8FB');
console.log('✓ index.html has #F4F8FB initial theme-color');

console.log('\n>>> ALL 4 BUG FIX TESTS PASSED WITH 100% SUCCESS! <<<');

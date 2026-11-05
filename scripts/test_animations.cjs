/**
 * Automated test suite for Lapisan Animasi & Optimasi iPhone 13 (iOS Safari / WebKit)
 * Tests:
 * 1. Animation Design Tokens in index.css
 * 2. .pressable, .pressable-card, -webkit-tap-highlight-color, touch-action
 * 3. Instant tab switching & iOS momentum scroll reset via useLayoutEffect (Anti-Ghosting)
 * 4. Sliding Blue Pill Bottom Nav (backdrop-blur retained exclusively on BottomNav)
 * 5. Reusable BottomSheet with Drag Handle & Gestures
 * 6. Battery Indicator scaleX entrance
 * 7. Direct stats rendering without CountUp jitter on views
 * 8. GPU optimization: unit-card-optimized, solid backgrounds replacing blur on headers & cards
 * 9. prefers-reduced-motion media query overrides
 * 10. Micro-interactions: Charge button checkmark feedback & Cloud sync pulse
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Automated Tests: Optimasi Animasi & Performa iPhone 13 (iOS Safari)...\n');

let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

const rootDir = path.resolve(__dirname, '..');

// 1. Check CSS Variables in index.css
it('1. Design token animasi didefinisikan lengkap di :root (index.css)', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('--dur-press: 90ms'), 'Harus ada --dur-press: 90ms');
  assert(css.includes('--dur-fast: 150ms'), 'Harus ada --dur-fast: 150ms');
  assert(css.includes('--dur-base: 220ms'), 'Harus ada --dur-base: 220ms');
  assert(css.includes('--dur-sheet: 300ms'), 'Harus ada --dur-sheet: 300ms');
  assert(css.includes('--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1)'), 'Harus ada --ease-out');
  assert(css.includes('--ease-in: cubic-bezier(0.4, 0, 1, 1)'), 'Harus ada --ease-in');
  assert(css.includes('--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)'), 'Harus ada --ease-spring');
});

// 2. Check Global Tap and Pressable Styles
it('2. Global tap highlight & touch action serta kelas .pressable dan .pressable-card', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('-webkit-tap-highlight-color: transparent'), 'Harus ada -webkit-tap-highlight-color: transparent');
  assert(css.includes('touch-action: manipulation'), 'Harus ada touch-action: manipulation');
  assert(css.includes('.pressable'), 'Harus ada selector .pressable');
  assert(css.includes('scale(0.97)'), '.pressable harus mengecil scale(0.97)');
  assert(css.includes('.pressable-card'), 'Harus ada selector .pressable-card');
  assert(css.includes('opacity: 0.05'), '.pressable-card harus ada overlay gelap 5% saat aktif');
});

// 3. Anti-Ghosting & Momentum Scroll Reset (App.jsx)
it('3. Perpindahan tab instan (anti-ghosting) & reset momentum scroll iOS via useLayoutEffect', () => {
  const appCode = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
  assert(!appCode.includes('startViewTransition'), 'App.jsx tidak boleh menggunakan startViewTransition yang memicu ghosting di iOS');
  assert(appCode.includes('useLayoutEffect'), 'App.jsx harus menggunakan useLayoutEffect untuk reset scroll sebelum paint');
  assert(appCode.includes("behavior: 'instant'"), 'App.jsx harus memanggil scrollTo instant untuk membatalkan momentum scroll iOS');
  assert(!appCode.includes('viewTransitionName:'), 'Elemen main tidak boleh memiliki viewTransitionName');
});

// 4. Bottom Nav Sliding Indicator & backdrop-blur exclusivity
it('4. Bottom Navigation memiliki sliding pill indicator & satu-satunya pemegang backdrop-blur', () => {
  const navCode = fs.readFileSync(path.join(rootDir, 'src/components/BottomNav.jsx'), 'utf8');
  assert(navCode.includes('backdrop-blur'), 'BottomNav harus mempertahankan backdrop-blur');
  assert(navCode.includes('transform: `translateX(${activeIndex * 100}%)`'), 'Harus ada transform sliding pill translateX');
  assert(navCode.includes('triggerHaptic'), 'Harus memicu haptic feedback saat tab ditekan');

  // Pastikan sticky bars di view lain tidak memakai backdrop-blur
  const aktifCode = fs.readFileSync(path.join(rootDir, 'src/views/AktifView.jsx'), 'utf8');
  const lelangCode = fs.readFileSync(path.join(rootDir, 'src/views/LelangView.jsx'), 'utf8');
  const laporanCode = fs.readFileSync(path.join(rootDir, 'src/views/LaporanView.jsx'), 'utf8');
  assert(!aktifCode.includes('backdrop-blur'), 'AktifView tidak boleh memakai backdrop-blur');
  assert(!lelangCode.includes('backdrop-blur'), 'LelangView tidak boleh memakai backdrop-blur');
  assert(!laporanCode.includes('backdrop-blur'), 'LaporanView tidak boleh memakai backdrop-blur');
});

// 5. Reusable BottomSheet with Gestures
it('5. Komponen BottomSheet mendukung touch drag handle, velocity check, & accessibility', () => {
  const sheetCode = fs.readFileSync(path.join(rootDir, 'src/components/BottomSheet.jsx'), 'utf8');
  assert(sheetCode.includes('handleTouchStart'), 'Harus ada touch start handler');
  assert(sheetCode.includes('handleTouchMove'), 'Harus ada touch move handler');
  assert(sheetCode.includes('handleTouchEnd'), 'Harus ada touch end handler');
  assert(sheetCode.includes('velocity > 0.5'), 'Harus mendeteksi swipe cepat / flick downwards > 0.5px/ms');
  assert(sheetCode.includes('sheetHeight * 0.3'), 'Harus memiliki ambang batas drag > 30% tinggi');
  assert(sheetCode.includes("overflow = 'hidden'"), 'Harus mengunci scroll body');
  assert(sheetCode.includes("e.key === 'Escape'"), 'Harus menutup sheet saat tombol Escape ditekan');
});

// 6. Battery Indicator scaleX entrance
it('6. BatteryIndicator menggunakan animasi scaleX dan transform-origin left', () => {
  const batteryCode = fs.readFileSync(path.join(rootDir, 'src/components/BatteryIndicator.jsx'), 'utf8');
  assert(batteryCode.includes('battery-fill-anim'), 'Harus ada kelas battery-fill-anim');

  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('transform-origin: left;'), 'Keyframes batteryScaleX harus transform-origin left');
  assert(css.includes('@keyframes batteryScaleX'), 'Harus ada @keyframes batteryScaleX');
});

// 7. Direct stats rendering without CountUp jitter
it('7. Statistik angka di Dashboard dan Laporan langsung dirender instan tanpa CountUp', () => {
  const dashCode = fs.readFileSync(path.join(rootDir, 'src/views/DashboardView.jsx'), 'utf8');
  const lapCode = fs.readFileSync(path.join(rootDir, 'src/views/LaporanView.jsx'), 'utf8');

  assert(!dashCode.includes('<CountUp'), 'DashboardView tidak boleh menggunakan CountUp');
  assert(!lapCode.includes('<CountUp'), 'LaporanView tidak boleh menggunakan CountUp');
  assert(dashCode.includes('tabular-nums'), 'DashboardView harus menggunakan font tabular-nums');
  assert(lapCode.includes('tabular-nums'), 'LaporanView harus menggunakan font tabular-nums');
});

// 8. Card rendering optimization (content-visibility & unit-card-optimized)
it('8. Optimalisasi rendering kartu: content-visibility: auto dan limit 20 kartu', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('content-visibility: auto'), 'index.css harus mendefinisikan content-visibility: auto');
  assert(css.includes('unit-card-optimized'), 'index.css harus menyediakan kelas .unit-card-optimized');

  const aktifCode = fs.readFileSync(path.join(rootDir, 'src/views/AktifView.jsx'), 'utf8');
  assert(aktifCode.includes('unit-card-optimized'), 'AktifView harus menerapkan unit-card-optimized pada kartu');
  assert(aktifCode.includes('displayLimit'), 'AktifView harus menerapkan pembatasan jumlah render awal kartu');

  const lapCode = fs.readFileSync(path.join(rootDir, 'src/views/LaporanView.jsx'), 'utf8');
  assert(lapCode.includes('unit-card-optimized'), 'LaporanView harus menerapkan unit-card-optimized pada kartu');
  assert(lapCode.includes('displayLimit'), 'LaporanView harus menerapkan pembatasan jumlah render awal kartu');
});

// 9. Accessibility: prefers-reduced-motion
it('9. Overrides untuk prefers-reduced-motion didefinisikan lengkap di index.css', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'Harus ada media query prefers-reduced-motion');
  assert(css.includes('animation: none !important;'), 'Animasi kompleks dimatikan');
});

// 10. Micro-interactions: Charge button checkmark feedback & Cloud sync pulse
it('10. Micro-interactions tombol Charge sukses & Network status pulse', () => {
  const aktifCode = fs.readFileSync(path.join(rootDir, 'src/views/AktifView.jsx'), 'utf8');
  assert(aktifCode.includes('chargingSuccessUnitId'), 'AktifView harus memiliki state umpan balik tombol charge');

  const networkCode = fs.readFileSync(path.join(rootDir, 'src/components/NetworkStatusBadge.jsx'), 'utf8');
  assert(networkCode.includes('animate-cloud-pulse'), 'NetworkStatusBadge harus memicu animate-cloud-pulse saat sync sukses');
});

console.log('\n=============================================');
console.log(`🏁 Total Tests: ${passCount + failCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('=============================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

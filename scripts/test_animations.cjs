/**
 * Automated test suite for Lapisan Animasi & Micro-interactions
 * Tests:
 * 1. Animation Design Tokens in index.css
 * 2. .pressable, .pressable-card, -webkit-tap-highlight-color, touch-action
 * 3. View Transitions API CSS & App.jsx transitions + scroll memory
 * 4. Sliding Blue Pill Bottom Nav & active scale/pop
 * 5. Reusable BottomSheet with Drag Handle & Gestures
 * 6. Battery Indicator scaleX entrance
 * 7. CountUp component implementation & reduced motion checks
 * 8. Stagger styling helper & isolation from background sync
 * 9. prefers-reduced-motion media query overrides
 * 10. Micro-interactions: Charge button checkmark feedback & Cloud sync pulse
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Automated Tests: Lapisan Animasi & Micro-interactions...\n');

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
  assert(css.includes('--stagger: 35ms'), 'Harus ada --stagger: 35ms');
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

// 3. View Transitions API and Fallback in App.jsx
it('3. View Transitions API CSS styles dan navigasi arah di App.jsx', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('::view-transition-old(main-content)'), 'Harus ada ::view-transition-old(main-content)');
  assert(css.includes('::view-transition-new(main-content)'), 'Harus ada ::view-transition-new(main-content)');
  assert(css.includes('data-transition-direction="forward"'), 'Harus ada CSS selector arah forward');
  assert(css.includes('data-transition-direction="backward"'), 'Harus ada CSS selector arah backward');

  const appCode = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
  assert(appCode.includes('startViewTransition'), 'App.jsx harus mendukung document.startViewTransition');
  assert(appCode.includes('scrollPositions'), 'App.jsx harus menyimpan memori posisi scroll tiap tab');
  assert(appCode.includes('isTransitioningRef'), 'App.jsx harus mencegah transisi ganda saat sedang berjalan');
  assert(appCode.includes("mainRef.current.scrollTo({ top: 0, behavior: 'smooth' })"), 'Menekan tab aktif harus scroll halus ke atas');
});

// 4. Bottom Nav Sliding Indicator
it('4. Bottom Navigation memiliki sliding pill indicator & active pop', () => {
  const navCode = fs.readFileSync(path.join(rootDir, 'src/components/BottomNav.jsx'), 'utf8');
  assert(navCode.includes('transform: `translateX(${activeIndex * 100}%)`'), 'Harus ada transform sliding pill translateX');
  assert(navCode.includes('nav-icon-active'), 'Harus menerapkan .nav-icon-active pada ikon aktif');
  assert(navCode.includes('badge-pop'), 'Harus memicu .badge-pop saat nilai badge berubah');
  assert(navCode.includes('triggerHaptic'), 'Harus memicu haptic feedback saat tab ditekan');
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
  assert(sheetCode.includes("overscrollBehavior = 'contain'"), 'Harus mengunci overscrollBehavior body');
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

// 7. CountUp Component
it('7. Komponen CountUp menggunakan requestAnimationFrame dan tabular-nums', () => {
  const countUpCode = fs.readFileSync(path.join(rootDir, 'src/components/CountUp.jsx'), 'utf8');
  assert(countUpCode.includes('requestAnimationFrame'), 'Harus menggunakan requestAnimationFrame');
  assert(countUpCode.includes('tabular-nums'), 'Harus ada class font tabular-nums');
  assert(countUpCode.includes('isReducedMotion()'), 'Harus memeriksa preferensi reduced motion');
});

// 8. Stagger Helper & Card Stagger in Views
it('8. Card stagger diterapkan pada 6 kartu pertama di 4 view utama', () => {
  const helperCode = fs.readFileSync(path.join(rootDir, 'src/services/animationHelpers.js'), 'utf8');
  assert(helperCode.includes('getStaggerStyle'), 'Harus mengekspor getStaggerStyle');
  assert(helperCode.includes('index >= 6'), 'Hanya menstagger 6 kartu pertama (guard index >= 6)');

  const dashboardCode = fs.readFileSync(path.join(rootDir, 'src/views/DashboardView.jsx'), 'utf8');
  assert(dashboardCode.includes('getStaggerStyle'), 'DashboardView harus menggunakan getStaggerStyle');

  const aktifCode = fs.readFileSync(path.join(rootDir, 'src/views/AktifView.jsx'), 'utf8');
  assert(aktifCode.includes('getStaggerStyle'), 'AktifView harus menggunakan getStaggerStyle');

  const lelangCode = fs.readFileSync(path.join(rootDir, 'src/views/LelangView.jsx'), 'utf8');
  assert(lelangCode.includes('getStaggerStyle'), 'LelangView harus menggunakan getStaggerStyle');

  const laporanCode = fs.readFileSync(path.join(rootDir, 'src/views/LaporanView.jsx'), 'utf8');
  assert(laporanCode.includes('getStaggerStyle'), 'LaporanView harus menggunakan getStaggerStyle');
});

// 9. Accessibility: prefers-reduced-motion
it('9. Overrides untuk prefers-reduced-motion didefinisikan lengkap di index.css', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'Harus ada media query prefers-reduced-motion');
  assert(css.includes('animation: none !important;'), 'Animasi kompleks dimatikan');
  assert(css.includes('simpleFade 100ms'), 'Transisi disederhanakan ke crossfade 100ms');
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

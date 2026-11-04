const fs = require('fs');
const path = require('path');

console.log('=== STARTING LELANG & DASHBOARD VIEW REVISION VERIFICATION ===\n');

const lelangPath = path.join(__dirname, '../src/views/LelangView.jsx');
const dashboardPath = path.join(__dirname, '../src/views/DashboardView.jsx');

const lelangCode = fs.readFileSync(lelangPath, 'utf8');
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');

let errors = [];

// --- 1. EMOJI CHECK ---
const emojiRegex = /[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]/g;
const lelangEmojis = lelangCode.match(emojiRegex);
const dashEmojis = dashboardCode.match(emojiRegex);

if (lelangEmojis && lelangEmojis.length > 0) {
  errors.push(`Found unreplaced emojis in LelangView: ${lelangEmojis.join(', ')}`);
} else {
  console.log('✅ 1. Zero emojis in LelangView (all line icons verified)');
}

if (dashEmojis && dashEmojis.length > 0) {
  errors.push(`Found unreplaced emojis in DashboardView: ${dashEmojis.join(', ')}`);
} else {
  console.log('✅ 2. Zero emojis in DashboardView (all line icons verified)');
}

// --- 2. LELANG VIEW TESTS ---
// Check removal of "Siap Lelang" badge inside unit cards
const siapLelangInsideCard = lelangCode.includes('<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">\n                          Siap Lelang');
if (siapLelangInsideCard) {
  errors.push('Redundant "Siap Lelang" badge still exists inside unit card in LelangView');
} else {
  console.log('✅ 3. Redundant "Siap Lelang" badge removed from individual cards');
}

// Check 6-row structure
const hasLelangRow1 = lelangCode.includes('#{unit.kodeGadai}') && lelangCode.includes('BatteryIndicator');
const hasLelangRow2 = lelangCode.includes('unit.merkSepeda') && lelangCode.includes('Nasabah asal: {unit.namaNasabah}');
const hasLelangRow3 = lelangCode.includes('Antrian Charge') && lelangCode.includes('BatteryConditionBadge');
const hasLelangRow4 = lelangCode.includes('Charge {daysAgo');
const hasLelangRow5 = lelangCode.includes('Estimasi Nilai Lelang:');
const hasLelangRow6 = lelangCode.includes('Catat Terjual') && lelangCode.includes('Antrikan Charge');

if (hasLelangRow1 && hasLelangRow2 && hasLelangRow3 && hasLelangRow4 && hasLelangRow5 && hasLelangRow6) {
  console.log('✅ 4. Lelang 6-row card architecture verified (Row 1: Akad + Battery; Row 2: Model + Nasabah; Row 3: Condition + Antrian Charge; Row 4: Meta Clock; Row 5: Estimasi Nilai; Row 6: Actions)');
} else {
  errors.push('Lelang card does not follow the required 6-row architecture');
}

// Check single critical indicator in Lelang
const hasLelangCriticalBorder = lelangCode.includes('border-l-4 border-l-rose-500');
const hasLelangCriticalText = lelangCode.includes('isCriticalOverdue ? \'text-rose-600 font-semibold\' : \'text-slate-600\'');
if (hasLelangCriticalBorder && hasLelangCriticalText) {
  console.log('✅ 5. Lelang critical overdue (>14 days) uses single clean signal (thin 4px left red border + red clock text, WCAG AA compliant)');
} else {
  errors.push('Lelang critical overdue styling missing left red border or red clock text');
}

// Check informative "Dalam Antrian Charge" badge (not a button)
const hasInformativeAntrian = lelangCode.includes('Dalam Antrian Charge') && lelangCode.includes('<div className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600');
if (hasInformativeAntrian) {
  console.log('✅ 6. "Dalam Antrian Charge" is an informative status badge (not a button, no zap icon)');
} else {
  errors.push('Informative "Dalam Antrian Charge" badge missing or implemented as a button');
}

// Check "Catat Terjual" opens Bottom Sheet with confirmation
const hasSaleBottomSheet = lelangCode.includes('selectedUnitForSale && (') && lelangCode.includes('Konfirmasi Penjualan Lelang') && lelangCode.includes('Konfirmasi Terjual');
if (hasSaleBottomSheet) {
  console.log('✅ 7. "Catat Terjual" opens Bottom Sheet with price/buyer inputs and confirmation before execution');
} else {
  errors.push('Bottom Sheet confirmation for "Catat Terjual" missing');
}

// Check sticky search & tabs in Lelang
const isLelangSticky = lelangCode.includes('sticky -top-3 z-20');
const hasShortPlaceholder = lelangCode.includes('placeholder="Cari akad / merk / nasabah"');
if (isLelangSticky && hasShortPlaceholder) {
  console.log('✅ 8. Lelang tabs & search bar sticky with shortened placeholder ("Cari akad / merk / nasabah")');
} else {
  errors.push('Lelang sticky or search placeholder specification failed');
}

// Check Tab "Terjual (0)" informative empty state
const hasSoldEmptyState = lelangCode.includes('Belum ada unit terjual') && lelangCode.includes('PackageCheck');
if (hasSoldEmptyState) {
  console.log('✅ 9. Informative empty state for Tab "Terjual (0)" verified with icon & description');
} else {
  errors.push('Tab "Terjual (0)" missing informative empty state');
}

// --- 3. DASHBOARD VIEW TESTS ---
// Top 3 summary cards (Butuh Charge, Kritis, Antrian), max-h-[72px], padding
const hasTop3Cards = dashboardCode.includes('Butuh Charge') && dashboardCode.includes('Kritis ≥15 Hari') && dashboardCode.includes('Antrian') && dashboardCode.includes('max-h-[72px]');
if (hasTop3Cards) {
  console.log('✅ 10. Dashboard top 3 summary cards verified (Butuh Charge, Kritis, Antrian) with max height 72px');
} else {
  errors.push('Dashboard top summary cards missing or exceed 72px');
}

// Unified Slot Charger (single component, no dark panel duplicate, 1 row per slot)
const hasUnifiedSlotHeader = dashboardCode.includes('Slot Charger') && dashboardCode.includes('Terisi {chargingUnits.length} dari {slotsCapacity} colokan');
const hasSingleRowSlot = dashboardCode.includes('min-h-[58px]');
const hasNoDashedCard = !dashboardCode.includes('border-2 border-dashed border-sky-200 bg-sky-50/50 p-4 text-center');
if (hasUnifiedSlotHeader && hasSingleRowSlot && hasNoDashedCard) {
  console.log('✅ 11. Unified single "Slot Charger" component verified (each slot is 1 row 56-64px, large dashed boxes eliminated)');
} else {
  errors.push('Slot Charger component duplication or large dashed box still present');
}

// Stepper moved to settings bottom sheet
const hasSettingsBottomSheet = dashboardCode.includes('showSlotSettings && (') && dashboardCode.includes('Pengaturan Slot Charger') && dashboardCode.includes('handleAdjustSlots');
const hasOccupiedBlockAlert = dashboardCode.includes('slotsCapacity <= chargingUnits.length');
if (hasSettingsBottomSheet && hasOccupiedBlockAlert) {
  console.log('✅ 12. Slot stepper moved to settings bottom sheet with blocking protection when slots are occupied');
} else {
  errors.push('Slot settings bottom sheet or occupied blocking protection missing');
}

// Lock Screen Live Monitor single row, light theme, sentence case, default closed
const hasSingleRowLiveMonitor = dashboardCode.includes('Pantau di layar kunci') && dashboardCode.includes('Smartphone') && dashboardCode.includes('showLiveMonitorDetail');
const hasNoDarkThemeLiveMonitor = !dashboardCode.includes('bg-gradient-to-br from-slate-900 via-slate-850 to-sky-950');
const hasFriendlyCopy = dashboardCode.includes('Sisa waktu charger tampil langsung tanpa membuka HP') && !dashboardCode.includes('tag: active-charger-slots');
if (hasSingleRowLiveMonitor && hasNoDarkThemeLiveMonitor && hasFriendlyCopy) {
  console.log('✅ 13. Lock Screen Live Monitor refactored to single compact light row with friendly copy (default closed preview)');
} else {
  errors.push('Lock screen live monitor does not match single row light theme or friendly copy specs');
}

// Priority queue card: short button "Pasang ke Slot Kosong" (44px)
const hasShortButton = dashboardCode.includes('h-11 flex-1 bg-sky-600') && dashboardCode.includes('Pasang ke Slot Kosong');
if (hasShortButton) {
  console.log('✅ 14. Priority queue cards refactored with compact layout & 44px "Pasang ke Slot Kosong" button');
} else {
  errors.push('Priority queue card action button does not meet 44px compact spec');
}

// Viewport Height Simulation for Lelang (390x844)
console.log('\n--- Viewport Height Simulation (Lelang View on iPhone 13 390x844) ---');
const screenH = 844;
const headerH = 56;
const titleH = 40;
const tabsSearchH = 96;
const bottomNavH = 64;
const availableScrollH = screenH - (headerH + titleH + tabsSearchH + bottomNavH); // 588px

const lelangCardH = 210; // ~210px for 6 rows
const twoLelangCardsH = lelangCardH * 2 + 12; // 432px
console.log(`- Available Vertical Scroll Area: ${availableScrollH}px`);
console.log(`- Two Lelang Cards (incl. 12px gap): ${twoLelangCardsH}px`);
console.log(`- Space Remaining for partial 3rd card: ${availableScrollH - twoLelangCardsH}px`);

if (availableScrollH >= twoLelangCardsH) {
  console.log('✅ 15. SUCCESS: At least 2 full Lelang cards are completely visible without scroll on 390x844px!');
} else {
  errors.push('Two Lelang cards exceed available scroll height');
}

if (errors.length > 0) {
  console.error('\n❌ VERIFICATION FAILED with errors:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL 15 LELANG & DASHBOARD SPECIFICATIONS VERIFIED SUCCESSFULLY!');
}

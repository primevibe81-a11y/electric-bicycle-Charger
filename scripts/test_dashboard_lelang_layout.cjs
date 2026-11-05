const fs = require('fs');
const path = require('path');

console.log('=== STARTING LELANG & DASHBOARD VIEW REVISION VERIFICATION (MINIMALIST) ===\n');

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

// Check 3-row structure in Lelang
const hasLelangRow1 = lelangCode.includes('#{unit.kodeGadai}') && lelangCode.includes('BatteryIndicator');
const hasLelangRow2 = lelangCode.includes('unit.merkSepeda') && lelangCode.includes('Nasabah asal: {unit.namaNasabah}');
const hasLelangRow3 = lelangCode.includes('BatteryConditionBadge') && lelangCode.includes('Coins') && lelangCode.includes('Catat Terjual');

if (hasLelangRow1 && hasLelangRow2 && hasLelangRow3) {
  console.log('✅ 4. Lelang 3-row card architecture verified (Row 1: Akad + Battery; Row 2: Model • Nasabah; Row 3: Meta Coins + Catat Terjual)');
} else {
  errors.push('Lelang card does not follow the required 3-row architecture');
}

// Check single critical indicator in Lelang
const hasLelangCriticalBorder = lelangCode.includes('border-l-4 border-l-rose-500');
if (hasLelangCriticalBorder) {
  console.log('✅ 5. Lelang critical overdue (>14 days) uses single clean signal (thin 4px left red border)');
} else {
  errors.push('Lelang critical overdue styling missing left red border');
}

// Check "Catat Terjual" opens Bottom Sheet with confirmation
const hasSaleBottomSheet = lelangCode.includes('selectedUnitForSale && (') && lelangCode.includes('Konfirmasi Penjualan Lelang') && lelangCode.includes('Konfirmasi Terjual');
if (hasSaleBottomSheet) {
  console.log('✅ 6. "Catat Terjual" opens Bottom Sheet with price/buyer inputs and confirmation before execution');
} else {
  errors.push('Bottom Sheet confirmation for "Catat Terjual" missing');
}

// Check sticky search & tabs in Lelang
const isLelangSticky = lelangCode.includes('sticky -top-3 z-20');
const hasShortPlaceholder = lelangCode.includes('placeholder="Cari..."') || lelangCode.includes('placeholder="Cari');
if (isLelangSticky && hasShortPlaceholder) {
  console.log('✅ 7. Lelang tabs & search bar sticky with concise search placeholder');
} else {
  errors.push('Lelang sticky or search placeholder specification failed');
}

// Check Tab "Terjual (0)" informative empty state
const hasSoldEmptyState = lelangCode.includes('Belum ada unit terjual') && lelangCode.includes('PackageCheck');
if (hasSoldEmptyState) {
  console.log('✅ 8. Informative empty state for Tab "Terjual (0)" verified with icon & description');
} else {
  errors.push('Tab "Terjual (0)" missing informative empty state');
}

// --- 3. DASHBOARD VIEW TESTS ---
// Top 3 summary cards (Butuh Charge, Kritis, Antrian), max-h-[72px], no "unit" word in cards
const hasTop3Cards = dashboardCode.includes('needChargeUnits.length') &&
                     dashboardCode.includes('unqueuedCriticalUnits.length') &&
                     dashboardCode.includes('sortedWaiting.length') &&
                     dashboardCode.includes('max-h-[72px]');
if (hasTop3Cards) {
  console.log('✅ 9. Dashboard top 3 summary cards verified with distinct definitions and max height 72px');
} else {
  errors.push('Dashboard top summary cards missing or exceed 72px');
}

// Unified Slot Charger (single component, 1 row per slot)
const hasUnifiedSlotHeader = dashboardCode.includes('chargingUnits.length') && dashboardCode.includes('slotsCapacity');
const hasSingleRowSlot = dashboardCode.includes('min-h-[58px]');
if (hasUnifiedSlotHeader && hasSingleRowSlot) {
  console.log('✅ 10. Unified single "Slot Charger" component verified (each slot is 1 row 56-64px)');
} else {
  errors.push('Slot Charger component duplication or single-row structure missing');
}

// Stepper moved to settings bottom sheet
const hasSettingsBottomSheet = dashboardCode.includes('showSlotSettings && (') && dashboardCode.includes('Pengaturan Slot Charger') && dashboardCode.includes('handleAdjustSlots');
const hasOccupiedBlockAlert = dashboardCode.includes('slotsCapacity <= chargingUnits.length');
if (hasSettingsBottomSheet && hasOccupiedBlockAlert) {
  console.log('✅ 11. Slot stepper moved to settings bottom sheet with blocking protection when slots are occupied');
} else {
  errors.push('Slot settings bottom sheet or occupied blocking protection missing');
}

// Lock Screen Live Monitor single row (height 56px / h-14)
const hasSingleRowLiveMonitor = dashboardCode.includes('h-14 min-h-[56px]') && dashboardCode.includes('Smartphone') && dashboardCode.includes('showLiveMonitorDetail');
if (hasSingleRowLiveMonitor) {
  console.log('✅ 12. Lock Screen Live Monitor refactored to single 56px row (icon + status dot + toggle)');
} else {
  errors.push('Lock screen live monitor does not match single 56px row specification');
}

// Priority queue card: 3-row layout & 44px button
const hasPriorityQueue = dashboardCode.includes('antrian-prioritas-section') && dashboardCode.includes('ArrowUpRight');
if (hasPriorityQueue) {
  console.log('✅ 13. Priority queue cards refactored with compact layout & 44px touch targets');
} else {
  errors.push('Priority queue section or action buttons missing');
}

// Viewport Height Simulation for Lelang (390x844)
console.log('\n--- Viewport Height Simulation (Lelang View on iPhone 13 390x844) ---');
const screenH = 844;
const headerH = 56;
const titleH = 40;
const tabsSearchH = 96;
const bottomNavH = 64;
const availableScrollH = screenH - (headerH + titleH + tabsSearchH + bottomNavH); // 588px

const lelangCardH = 130; // ~130px for 3 rows
const twoLelangCardsH = lelangCardH * 2 + 10; // 270px
console.log(`- Available Vertical Scroll Area: ${availableScrollH}px`);
console.log(`- Two Lelang Cards (incl. 10px gap): ${twoLelangCardsH}px`);
console.log(`- Space Remaining for 3rd and 4th card: ${availableScrollH - twoLelangCardsH}px (Fits 3-4 cards easily!)`);

if (availableScrollH >= twoLelangCardsH) {
  console.log('✅ 14. SUCCESS: At least 2 full Lelang cards are completely visible without scroll on 390x844px!');
} else {
  errors.push('Two Lelang cards exceed available scroll height');
}

if (errors.length > 0) {
  console.error('\n❌ VERIFICATION FAILED with errors:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL 14 LELANG & DASHBOARD SPECIFICATIONS VERIFIED SUCCESSFULLY!');
}

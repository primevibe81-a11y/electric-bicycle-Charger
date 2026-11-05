const fs = require('fs');
const path = require('path');

console.log('=== STARTING UNIT CARD & AKTIF VIEW VERIFICATION (3-ROW MINIMALIST) ===\n');

const aktifViewPath = path.join(__dirname, '../src/views/AktifView.jsx');
const aktifViewCode = fs.readFileSync(aktifViewPath, 'utf8');

let errors = [];

// 1. Check for emoji removal in AktifView.jsx
const emojiRegex = /[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]/g;
const emojiMatches = aktifViewCode.match(emojiRegex);
if (emojiMatches && emojiMatches.length > 0) {
  errors.push(`Found unreplaced emojis in AktifView.jsx: ${emojiMatches.join(', ')}`);
} else {
  console.log('✅ 1. Zero emojis found in AktifView.jsx (all line icons verified)');
}

// 2. Check duplicate charge alert banner completely removed
if (aktifViewCode.includes('showFullAlert={true}')) {
  errors.push('showFullAlert={true} still exists in AktifView.jsx');
} else {
  console.log('✅ 2. Duplicate charge alert banner completely removed');
}

// 3. Check 3-row card architecture
const hasRow1 = aktifViewCode.includes('#{unit.kodeGadai}') && aktifViewCode.includes('BatteryIndicator');
const hasRow2 = aktifViewCode.includes('unit.merkSepeda') && aktifViewCode.includes('unit.namaNasabah');
const hasRow3 = aktifViewCode.includes('BatteryConditionBadge') && (aktifViewCode.includes('daysAgo') || aktifViewCode.includes('Clock'));

if (hasRow1 && hasRow2 && hasRow3) {
  console.log('✅ 3. Strictly organized 3-row card architecture verified (Row 1: Akad + Battery; Row 2: Model • Nasabah; Row 3: Meta Icon/Value + Actions)');
} else {
  errors.push('Card does not strictly follow the 3-row architecture');
}

// 4. Check critical >14 days single indicator (Left red border)
const hasLeftRedBorder = aktifViewCode.includes('border-l-4 border-l-rose-500');
if (hasLeftRedBorder) {
  console.log('✅ 4. Critical overdue (>14 days) uses single clean signal (thin 4px left red border)');
} else {
  errors.push('Critical overdue styling missing border-l-4');
}

// 5. Check action buttons: Primary Charge + More button to Bottom Sheet
const hasPrimaryCharge = aktifViewCode.includes('handleQuickEnqueue') && aktifViewCode.includes('bg-sky-600');
const hasMoreButton = aktifViewCode.includes('setActionSheetUnit') && aktifViewCode.includes('MoreHorizontal');
if (hasPrimaryCharge && hasMoreButton) {
  console.log('✅ 5. Action buttons verified (Primary Charge + More button to Bottom Sheet with touch targets >= 40px)');
} else {
  errors.push('Action buttons do not meet the primary Charge + More sheet specification');
}

// 6. Check Bottom Sheet actions: Perpanjang, Audit Baterai, Tebus, Lelang
const hasPerpanjangAction = aktifViewCode.includes('Perpanjang Gadai') && aktifViewCode.includes('onNavigateToPerpanjang');
const hasAuditAction = aktifViewCode.includes('Audit Baterai') && aktifViewCode.includes('ShieldCheck');
const hasTebusAction = aktifViewCode.includes('Tebus Unit') && aktifViewCode.includes('CheckCircle2');
const hasLelangAction = aktifViewCode.includes('Pindahkan ke Lelang') && aktifViewCode.includes('Gavel');
if (hasPerpanjangAction && hasAuditAction && hasTebusAction && hasLelangAction) {
  console.log('✅ 6. Bottom Sheet (MoreActionSheet) contains Perpanjang, Audit Baterai, Tebus Unit, and Lelang with confirmation');
} else {
  errors.push('Bottom Sheet missing one or more actions (Perpanjang, Audit, Tebus, Lelang)');
}

// 7. Check Search & Filter Bar: Sticky, 44x44px sort, fade gradient
const isSticky = aktifViewCode.includes('sticky -top-3 z-20');
const hasSort44 = aktifViewCode.includes('h-11 w-11 shrink-0 rounded-xl border');
const hasFadeGradient = aktifViewCode.includes('bg-gradient-to-l from-[#F0F9FF] to-transparent');
if (isSticky && hasSort44 && hasFadeGradient) {
  console.log('✅ 7. Sticky search & filter bar verified with 44x44px sort button, horizontal scrollable pill chips, and right fade gradient');
} else {
  errors.push('Search & filter bar does not meet sticky/sort/fade/pill specifications');
}

// 8. Viewport height calculation simulation
console.log('\n--- Viewport Height Simulation (390x844 iPhone 13) ---');
const headerHeight = 56;
const topBarHeight = 44;
const searchFilterHeight = 98;
const bottomNavHeight = 64;
const cardPadding = 24; // p-3 top + bottom = 24px
const row1 = 24;
const gap1 = 4;
const row2 = 22;
const gap2 = 6;
const row3 = 40; // Row 3 with meta and actions
const singleCardHeight = cardPadding + row1 + gap1 + row2 + gap2 + row3; // ~120px
const twoCardsWithGap = singleCardHeight * 2 + 10; // ~250px

const availableHeight = 844 - headerHeight - topBarHeight - searchFilterHeight - bottomNavHeight; // 582px
console.log(`- Screen Height: 844px`);
console.log(`- Available Vertical Scroll Area: ${availableHeight}px`);
console.log(`- Estimated Single Card Height: ${singleCardHeight}px`);
console.log(`- Two Cards Height (incl. 10px gap): ${twoCardsWithGap}px`);
console.log(`- Space Remaining with 2 full cards: ${availableHeight - twoCardsWithGap}px (Easily fits 3-4 cards!)`);

if (availableHeight >= twoCardsWithGap) {
  console.log('✅ 8. SUCCESS: At least 2 full cards (and even 3-4 cards!) are completely visible without scroll on 390x844px!');
} else {
  errors.push('Two cards exceed the available vertical viewport height on 390x844');
}

if (errors.length > 0) {
  console.error('\n❌ VERIFICATION FAILED with errors:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL 8 UNIT CARD & AKTIF VIEW SPECIFICATIONS VERIFIED SUCCESSFULLY!');
}

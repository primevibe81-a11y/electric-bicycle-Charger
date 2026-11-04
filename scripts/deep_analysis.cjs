const XLSX = require('xlsx');
const path = require('path');
const os = require('os');
const fs = require('fs');

const downloads = path.join(os.homedir(), 'Downloads');
const f1 = path.join(downloads, 'Transaksi 02-11-2026 - 04-11-2026.xlsx');
const f2 = path.join(downloads, 'Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx');

// 1. Parse File 1: Transaksi
const wb1 = XLSX.readFile(f1);
const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
const rows1 = XLSX.utils.sheet_to_json(sheet1);

console.log('=== FILE 1: TRANSAKSI (02-11-2026 s/d 04-11-2026) ===');
console.log('Total baris:', rows1.length);

// Filter sepeda listrik in File 1
const ebikeRows1 = rows1.filter(r => {
  const cat = String(r['Kategori'] || '').toUpperCase();
  const sub = String(r['Sub Kategori'] || '').toUpperCase();
  const name = String(r['Nama Barang'] || '').toUpperCase();
  return cat.includes('SEPEDA') || sub.includes('SEPEDA') || name.includes('SEPEDA') || name.includes('LISTRIK') || name.includes('UWINFLY') || name.includes('GODA') || name.includes('EXOTIC');
});

console.log('Unit terkait Sepeda / Sepeda Listrik di File 1:', ebikeRows1.length);
ebikeRows1.forEach((r, idx) => {
  console.log(`[File1 - #${idx+1}] No: ${r['Nomer Gadai']} | Cust: ${r['Nama Customer']} | SubKat: ${r['Sub Kategori']} | Barang: ${r['Nama Barang']} | TglOrder: ${r['Tanggal Order']} | Status: ${r['Status']} | Pelunasan: ${r['Tanggal Pelunasan']} ${r['Waktu Pelunasan'] || ''}`);
});

// 2. Parse File 2: Buku Besar
const wb2 = XLSX.readFile(f2);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
// In Buku Besar, header starts at row with 'Tanggal' or similar
const rawRows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
console.log('\n=== FILE 2: BUKU BESAR (02-11-2026 s/d 04-11-2026) ===');
console.log('Total raw rows:', rawRows2.length);

let headerIdx = -1;
for (let i = 0; i < Math.min(15, rawRows2.length); i++) {
  const row = rawRows2[i];
  if (row && row.some(cell => String(cell).toLowerCase().includes('tanggal') || String(cell).toLowerCase().includes('deskripsi'))) {
    headerIdx = i;
    break;
  }
}

console.log('Header found at row index:', headerIdx);
const headers2 = rawRows2[headerIdx].map(h => String(h || '').trim());
console.log('Headers:', headers2);

const rows2 = [];
for (let i = headerIdx + 1; i < rawRows2.length; i++) {
  const r = rawRows2[i];
  if (!r || r.length === 0) continue;
  const obj = {};
  headers2.forEach((h, colIdx) => {
    obj[h] = r[colIdx];
  });
  rows2.push(obj);
}

console.log('Parsed Buku Besar rows:', rows2.length);

// Filter transactions in Buku Besar related to Sepeda / Sepeda Listrik
const ebikeRows2 = rows2.filter(r => {
  const desc = String(r['Deskripsi'] || '').toUpperCase();
  return desc.includes('SEPEDA') || desc.includes('LISTRIK') || desc.includes('UWINFLY') || desc.includes('U-WINFLY') || desc.includes('U WINFLY') || desc.includes('GODA') || desc.includes('EXOTIC');
});

console.log('Transaksi Sepeda / Sepeda Listrik di Buku Besar:', ebikeRows2.length);
ebikeRows2.forEach((r, idx) => {
  console.log(`[BukuBesar - #${idx+1}] Tgl: ${r['Tanggal']} | Cust: ${r['Nama Customer']} | Ref: ${r['Ref No']} | Jurnal: ${r['No Jurnal']} | Deskripsi: ${r['Deskripsi']} | Debit: ${r['Debit']} | Credit: ${r['Credit']}`);
});

// 3. Load existing 65 units from src/data/realUnits.js
const realUnitsPath = path.join(__dirname, '..', 'src', 'data', 'realUnits.js');
let realUnits = [];
if (fs.existsSync(realUnitsPath)) {
  const content = fs.readFileSync(realUnitsPath, 'utf8');
  const match = content.match(/export const realUnits = (\[[\s\S]*?\]);/);
  if (match) {
    try {
      realUnits = eval(match[1]);
      console.log('\n=== REAL UNITS DI SISTEM SEKARANG ===');
      console.log('Total unit tersimpan saat ini:', realUnits.length);
    } catch (e) {
      console.log('Failed to eval realUnits:', e.message);
    }
  }
}

// Save detailed analysis to JSON for comprehensive inspection
fs.writeFileSync(path.join(__dirname, 'analysis_result.json'), JSON.stringify({
  ebikeRows1,
  ebikeRows2,
  allRows1Count: rows1.length,
  allRows2Count: rows2.length
}, null, 2));

console.log('\nAnalysis completed and written to scripts/analysis_result.json');

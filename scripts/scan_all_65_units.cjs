const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

// 1. Get all 65 units
const realUnitsContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'realUnits.js'), 'utf8');
const matchUnits = realUnitsContent.match(/export const REAL_EXCEL_UNITS = (\[[\s\S]*?\]);/);
const existingUnits = eval(matchUnits[1]);
console.log('Total existing units in app:', existingUnits.length);

const downloads = path.join(os.homedir(), 'Downloads');
const f1 = path.join(downloads, 'Transaksi 02-11-2026 - 04-11-2026.xlsx');
const f2 = path.join(downloads, 'Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx');

const wb1 = XLSX.readFile(f1);
const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);

const wb2 = XLSX.readFile(f2);
const raw2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1 });
const headers2 = raw2[6].map(h => String(h || '').trim());
const rows2 = [];
for (let i = 7; i < raw2.length; i++) {
  const r = raw2[i];
  if (!r || r.length === 0) continue;
  const o = {};
  headers2.forEach((h, idx) => o[h] = r[idx]);
  rows2.push(o);
}

console.log('Total rows in Transaksi (F1):', rows1.length);
console.log('Total rows in Buku Besar (F2):', rows2.length);

console.log('\n================ MATCHING ALL 65 UNITS AGAINST BUKU BESAR ================');
let matchedCount = 0;
existingUnits.forEach((u, i) => {
  const code = u.kodeGadai;
  const inBB = rows2.filter(r => r['Ref No'] === code || String(r['Deskripsi']).includes(code));
  if (inBB.length > 0) {
    matchedCount++;
    console.log(`\n[#${matchedCount}] Unit #${code} - ${u.namaNasabah} (${u.merkSepeda}) | Status di app: ${u.statusBarang}`);
    inBB.forEach(j => {
      console.log(`   -> BB: Tgl ${j['Tanggal']} | Jurnal ${j['No Jurnal']} | Debit: ${j['Debit']} | Credit: ${j['Credit']} | Desc: ${j['Deskripsi']}`);
    });
  }
});
console.log('\nTotal 65 units that have movements in Buku Besar:', matchedCount);

console.log('\n================ MATCHING ALL 65 UNITS AGAINST TRANSAKSI 02-04 NOV ================');
let matchedF1Count = 0;
existingUnits.forEach((u, i) => {
  const code = u.kodeGadai;
  const inF1 = rows1.filter(r => r['Nomer Gadai'] === code);
  if (inF1.length > 0) {
    matchedF1Count++;
    console.log(`\n[#${matchedF1Count}] Unit #${code} in Transaksi F1: Status=${inF1[0]['Status']} | Order=${inF1[0]['Tanggal Order']} | Pelunasan=${inF1[0]['Tanggal Pelunasan']}`);
  }
});
console.log('Total 65 units found directly in Transaksi F1:', matchedF1Count);

// Also find all e-bikes in Transaksi 02-04 Nov that are NOT in existing 65 units!
console.log('\n================ NEW E-BIKES IN TRANSAKSI 02-04 NOV NOT IN 65 UNITS ================');
const existingCodesSet = new Set(existingUnits.map(u => u.kodeGadai));
const newEbikesInF1 = rows1.filter(r => {
  const txt = `${r['Kategori']} ${r['Sub Kategori']} ${r['Nama Barang']}`.toUpperCase();
  const isEbike = txt.includes('SEPEDA') && (txt.includes('LISTRIK') || txt.includes('UWINFLY') || txt.includes('GODA'));
  return isEbike && !existingCodesSet.has(r['Nomer Gadai']);
});

newEbikesInF1.forEach((r, idx) => {
  console.log(`[New E-Bike #${idx+1}] No: ${r['Nomer Gadai']} | Cust: ${r['Nama Customer']} | Barang: ${r['Nama Barang']} | Pinjaman: ${r['Jumlah Pinjaman']} | Order: ${r['Tanggal Order']} | JT: ${r['Tanggal Jatuh Tempo']}`);
});

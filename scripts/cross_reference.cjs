const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

// 1. Load realUnits.js
const realUnitsContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'realUnits.js'), 'utf8');
const matchUnits = realUnitsContent.match(/export const REAL_EXCEL_UNITS = (\[[\s\S]*?\]);/);
let existingUnits = [];
if (matchUnits) {
  existingUnits = eval(matchUnits[1]);
}
console.log('=== DATA EXISTING SEBELUMNYA (realUnits.js) ===');
console.log('Total Unit:', existingUnits.length);
console.log('Status Barang:', {
  AKTIF: existingUnits.filter(u => u.statusBarang === 'AKTIF').length,
  LELANG: existingUnits.filter(u => u.statusBarang === 'LELANG').length,
  DITEBUS: existingUnits.filter(u => u.statusBarang === 'DITEBUS').length
});

const existingMap = new Map();
existingUnits.forEach(u => existingMap.set(u.kodeGadai, u));

// 2. Load File 1: Transaksi 02-11-2026 - 04-11-2026.xlsx
const downloads = path.join(os.homedir(), 'Downloads');
const f1 = path.join(downloads, 'Transaksi 02-11-2026 - 04-11-2026.xlsx');
const wb1 = XLSX.readFile(f1);
const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);

// 3. Load File 2: Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx
const f2 = path.join(downloads, 'Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx');
const wb2 = XLSX.readFile(f2);
const raw2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1 });
let hIdx = 6;
const headers2 = raw2[hIdx].map(h => String(h || '').trim());
const rows2 = [];
for (let i = hIdx + 1; i < raw2.length; i++) {
  const r = raw2[i];
  if (!r || r.length === 0) continue;
  const o = {};
  headers2.forEach((h, idx) => o[h] = r[idx]);
  rows2.push(o);
}

// 4. Also check original file: Transaksi 01-01-2026 - 02-11-2026.xlsx if present
const f0 = path.join(downloads, 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
let rows0 = [];
if (fs.existsSync(f0)) {
  const wb0 = XLSX.readFile(f0);
  rows0 = XLSX.utils.sheet_to_json(wb0.Sheets[wb0.SheetNames[0]]);
  console.log('\n=== FILE ORIGINAL SEBELUMNYA (Transaksi 01-01-2026 - 02-11-2026.xlsx) ===');
  console.log('Total baris:', rows0.length);
}

// Check every single transaction in File 1 that is SEPEDA LISTRIK
console.log('\n=== DETAIL TRANSAKSI SEPEDA LISTRIK PADA FILE 1 (TRANSAKSI 02-11-2026 - 04-11-2026) ===');
const f1Ebikes = rows1.filter(r => {
  const txt = `${r['Kategori']} ${r['Sub Kategori']} ${r['Nama Barang']}`.toUpperCase();
  return txt.includes('SEPEDA') && (txt.includes('LISTRIK') || txt.includes('UWINFLY') || txt.includes('GODA'));
});
f1Ebikes.forEach(e => {
  console.log({
    NomerGadai: e['Nomer Gadai'],
    NamaCustomer: e['Nama Customer'],
    NamaBarang: e['Nama Barang'],
    Pinjaman: e['Jumlah Pinjaman'],
    TglOrder: e['Tanggal Order'],
    TglJatuhTempo: e['Tanggal Jatuh Tempo'],
    Status: e['Status'],
    TglPelunasan: e['Tanggal Pelunasan']
  });
});

// Check every single transaction in File 2 (Buku Besar) that is SEPEDA LISTRIK
console.log('\n=== DETAIL TRANSAKSI SEPEDA LISTRIK PADA FILE 2 (BUKU BESAR 02-11-2026 - 04-11-2026) ===');
const f2Ebikes = rows2.filter(r => {
  const txt = String(r['Deskripsi'] || '').toUpperCase();
  return txt.includes('SEPEDA') && (txt.includes('LISTRIK') || txt.includes('UWINFLY') || txt.includes('U-WINFLY') || txt.includes('GODA'));
});

// Group by Ref No / Nomer Gadai
const f2ByRef = {};
f2Ebikes.forEach(r => {
  const ref = r['Ref No'];
  if (!f2ByRef[ref]) f2ByRef[ref] = [];
  f2ByRef[ref].push(r);
});

Object.keys(f2ByRef).forEach(ref => {
  const entries = f2ByRef[ref];
  console.log(`\n>> Ref No: ${ref} (Total Jurnal: ${entries.length})`);
  entries.forEach(e => {
    console.log(`   Tgl: ${e['Tanggal']} | Jurnal: ${e['No Jurnal']} | Cust: ${e['Nama Customer']} | Deskripsi: ${e['Deskripsi']} | Debit: ${e['Debit']} | Credit: ${e['Credit']}`);
  });

  // Check if this ref exists in existingUnits
  if (existingMap.has(ref)) {
    const ex = existingMap.get(ref);
    console.log(`   [STATUS DI SISTEM SAAT INI]: Ada di existing! Status: ${ex.statusBarang}, Nasabah: ${ex.namaNasabah}, Merk: ${ex.merkSepeda}`);
  } else {
    console.log(`   [STATUS DI SISTEM SAAT INI]: TIDAK DITEMUKAN di existingUnits!`);
  }
});

// Also check ALL 65 existingUnits: are any of them mentioned in File 1 or File 2?
console.log('\n=== CROSS-CHECK 65 UNIT EXISTING DENGAN FILE 1 & FILE 2 ===');
existingUnits.forEach(u => {
  const code = u.kodeGadai;
  // Check File 1
  const inF1 = rows1.filter(r => r['Nomer Gadai'] === code);
  // Check File 2
  const inF2 = rows2.filter(r => r['Ref No'] === code);

  if (inF1.length > 0 || inF2.length > 0) {
    console.log(`\nUnit #${code} (${u.merkSepeda} - ${u.namaNasabah}) DITEMUKAN mutasi/transaksi:`);
    if (inF1.length > 0) {
      console.log(`  -> File 1 (Transaksi): Status=${inF1[0]['Status']}, TglOrder=${inF1[0]['Tanggal Order']}, TglLunas=${inF1[0]['Tanggal Pelunasan']}`);
    }
    if (inF2.length > 0) {
      inF2.forEach(j => {
        console.log(`  -> File 2 (Buku Besar): ${j['No Jurnal']} | ${j['Deskripsi']} | Debit=${j['Debit']} Credit=${j['Credit']}`);
      });
    }
  }
});

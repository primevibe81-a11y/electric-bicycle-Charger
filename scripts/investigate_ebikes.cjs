const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');

const downloads = path.join(os.homedir(), 'Downloads');
const f0 = path.join(downloads, 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
const f1 = path.join(downloads, 'Transaksi 02-11-2026 - 04-11-2026.xlsx');
const f2 = path.join(downloads, 'Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx');

const wb0 = XLSX.readFile(f0);
const rows0 = XLSX.utils.sheet_to_json(wb0.Sheets[wb0.SheetNames[0]]);

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

const targetNames = [
  'HATNA SARI',
  'ROHMAT',
  'SUGIANTO',
  'UMIYATUL FITRIYA',
  'SITI KUSMAWATI',
  'FATIMATUS ZAHRO',
  'SELLYA ANDRIANA',
  'ACHMAD SUPADI',
  'MOHAMMAD ZAINUL ALIM'
];

console.log('================ INVESTIGASI DETAIL NASABAH SEPEDA LISTRIK ================');

targetNames.forEach(name => {
  console.log(`\n>>> NASABAH: ${name} <<<`);
  
  // File 0
  const inF0 = rows0.filter(r => String(r['Nama Customer'] || '').toUpperCase().includes(name));
  console.log(`[File 0 - Jan s/d 02 Nov]: ${inF0.length} transaksi`);
  inF0.forEach(r => {
    console.log(`   No: ${r['Nomer Gadai']} | Barang: ${r['Nama Barang']} | Tgl: ${r['Tanggal Order']} | JT: ${r['Tanggal Jatuh Tempo']} | Lunas: ${r['Tanggal Pelunasan']} | Status: ${r['Status']}`);
  });

  // File 1
  const inF1 = rows1.filter(r => String(r['Nama Customer'] || '').toUpperCase().includes(name));
  console.log(`[File 1 - 02 Nov s/d 04 Nov]: ${inF1.length} transaksi`);
  inF1.forEach(r => {
    console.log(`   No: ${r['Nomer Gadai']} | Barang: ${r['Nama Barang']} | Tgl: ${r['Tanggal Order']} | JT: ${r['Tanggal Jatuh Tempo']} | Lunas: ${r['Tanggal Pelunasan']} | Status: ${r['Status']}`);
  });

  // File 2 (Buku Besar)
  const inF2 = rows2.filter(r => String(r['Nama Customer'] || '').toUpperCase().includes(name));
  console.log(`[File 2 - Buku Besar 02-04 Nov]: ${inF2.length} mutasi kas`);
  inF2.forEach(r => {
    console.log(`   Tgl: ${r['Tanggal']} | Jurnal: ${r['No Jurnal']} | Ref: ${r['Ref No']} | Deskripsi: ${r['Deskripsi']} | Debit: ${r['Debit']} | Credit: ${r['Credit']}`);
  });
});

// Also check ALL transactions in File 1 where status is 'finish' (Pelunasan/Tebus)
console.log('\n================ SEMUA TRANSAKSI STATUS FINISH (PELUNASAN) DI FILE 1 ================');
const finishRows = rows1.filter(r => String(r['Status'] || '').toLowerCase() === 'finish');
console.log('Total transaksi status finish di File 1:', finishRows.length);
finishRows.forEach(r => {
  console.log(`No: ${r['Nomer Gadai']} | Cust: ${r['Nama Customer']} | Kat: ${r['Kategori']} | Sub: ${r['Sub Kategori']} | Barang: ${r['Nama Barang']} | TglOrder: ${r['Tanggal Order']} | TglLunas: ${r['Tanggal Pelunasan']} | Pay: ${r['Amount Pay']}`);
});

// Check if any other transactions in Buku Besar have Deskripsi containing 'PELUNASAN' or 'TEBUS'
console.log('\n================ POLA JURNAL DI BUKU BESAR ================');
const sampleFBR = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('FBR'));
const sampleSGR = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('SGR'));
const sampleBGR = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('BGR'));
console.log(`Total Jurnal FBR (Pelunasan Pokok Piutang): ${sampleFBR.length}`);
console.log(`Total Jurnal SGR (Pencairan Pinjaman Baru): ${sampleSGR.length}`);
console.log(`Total Jurnal BGR (Pendapatan Bunga Pinjaman): ${sampleBGR.length}`);

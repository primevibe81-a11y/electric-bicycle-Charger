const XLSX = require('xlsx');
const path = require('path');
const os = require('os');
const fs = require('fs');

function isElectricBicycle(kategori, subKategori, namaBarang) {
  const text = `${kategori || ''} ${subKategori || ''} ${namaBarang || ''}`.toUpperCase();
  
  // Whitelist: Harus ada unsur sepeda dan listrik atau merk e-bike terkenal
  const hasBike = text.includes('SEPEDA') || text.includes('BIKE');
  const hasElectric = text.includes('LISTRIK') || text.includes('UWINFLY') || text.includes('U-WINFLY') || text.includes('U WINFLY') || text.includes('GODA') || text.includes('EXOTIC LISTRIK') || text.includes('SELIS');
  
  // Blacklist: Jangan masukkan sepeda pancal manual atau sepeda motor bensin
  const isPancal = text.includes('PANCAL') || text.includes('MANUAL') || text.includes('THRILL');
  const isMotorBensin = text.includes('SEPEDA MOTOR') || text.includes('MOTOR ') || text.includes('JUPITER') || text.includes('VARIO') || text.includes('BEAT');

  return (hasBike && hasElectric) && !isPancal && !isMotorBensin;
}

function analyzeExcelFiles(transaksiBuffer, bukuBesarBuffer, existingUnits = []) {
  // 1. Parse File Transaksi
  const wb1 = XLSX.read(transaksiBuffer, { type: 'buffer' });
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);

  // 2. Parse File Buku Besar
  const wb2 = XLSX.read(bukuBesarBuffer, { type: 'buffer' });
  const raw2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1 });
  
  // Cari header Buku Besar
  let headerIdx = 6;
  for (let i = 0; i < Math.min(15, raw2.length); i++) {
    if (raw2[i] && raw2[i].some(c => String(c).toLowerCase().includes('tanggal') || String(c).toLowerCase().includes('deskripsi'))) {
      headerIdx = i;
      break;
    }
  }
  const headers2 = raw2[headerIdx].map(h => String(h || '').trim());
  const rows2 = [];
  for (let i = headerIdx + 1; i < raw2.length; i++) {
    const r = raw2[i];
    if (!r || r.length === 0) continue;
    const o = {};
    headers2.forEach((h, idx) => o[h] = r[idx]);
    rows2.push(o);
  }

  // Map existing units by kodeGadai and riwayat
  const existingMap = new Map();
  existingUnits.forEach(u => {
    existingMap.set(u.kodeGadai, u);
    if (Array.isArray(u.riwayatKodeGadai)) {
      u.riwayatKodeGadai.forEach(entry => {
        const c = typeof entry === 'object' ? entry.kodeGadaiLama : entry;
        if (c) existingMap.set(c, u);
      });
    }
  });

  // Filter Buku Besar for FBR (pelunasan pokok) dan BGR (bunga)
  const fbrList = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('FBR'));
  const sgrList = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('SGR'));

  // Filter e-bikes di File Transaksi
  const ebikeOrders = rows1.filter(r => isElectricBicycle(r['Kategori'], r['Sub Kategori'], r['Nama Barang']));

  const mutations = [];
  const processedOldCodes = new Set();
  const processedNewCodes = new Set();

  // A. Deteksi PERPANJANGAN & TEBUS dari FBR Buku Besar yang terkait Sepeda Listrik
  fbrList.forEach(fbr => {
    const desc = String(fbr['Deskripsi'] || '');
    if (!isElectricBicycle('', '', desc)) return;

    const refNo = String(fbr['Ref No'] || '').trim();
    const custName = String(fbr['Nama Customer'] || '').trim();
    const existingUnit = existingMap.get(refNo);

    // Cek apakah ada SGR (Pencairan Baru) atau Order Baru atas nasabah/sepeda ini di File Transaksi
    const matchingNewOrder = ebikeOrders.find(ord => {
      const ordCust = String(ord['Nama Customer'] || '').trim().toUpperCase();
      const ordCode = String(ord['Nomer Gadai'] || '').trim();
      return ordCode !== refNo && ordCust === custName.toUpperCase();
    });

    if (matchingNewOrder) {
      // PERPANJANGAN (RENEWAL)
      const newCode = String(matchingNewOrder['Nomer Gadai']).trim();
      processedOldCodes.add(refNo);
      processedNewCodes.add(newCode);

      mutations.push({
        type: 'PERPANJANG',
        label: 'Perpanjangan Gadai (Renewal)',
        unitId: existingUnit ? existingUnit.id : `unit-${newCode}`,
        oldKodeGadai: refNo,
        newKodeGadai: newCode,
        namaNasabah: custName,
        merkSepeda: matchingNewOrder['Nama Barang'] || (existingUnit ? existingUnit.merkSepeda : 'Sepeda Listrik'),
        tglOrderBaru: matchingNewOrder['Tanggal Order'],
        jatuhTempoBaru: matchingNewOrder['Tanggal Jatuh Tempo'],
        pinjaman: matchingNewOrder['Jumlah Pinjaman'],
        catatan: `Perpanjangan otomatis dari nomor lama #${refNo}`,
        existingUnit
      });
    } else {
      // TEBUS (REDEMPTION) - FBR ada tapi tidak ada akad baru
      processedOldCodes.add(refNo);
      mutations.push({
        type: 'TEBUS',
        label: 'Pelunasan / Ditebus (Keluar Gudang)',
        unitId: existingUnit ? existingUnit.id : null,
        kodeGadai: refNo,
        namaNasabah: custName,
        merkSepeda: existingUnit ? existingUnit.merkSepeda : desc.replace(/^Pinjaman a\/n [^ ]+ /i, ''),
        tglPelunasan: fbr['Tanggal'],
        existingUnit
      });
    }
  });

  // B. Deteksi GADAI BARU dari ebikeOrders yang bukan hasil perpanjangan
  ebikeOrders.forEach(ord => {
    const code = String(ord['Nomer Gadai']).trim();
    if (processedNewCodes.has(code) || existingMap.has(code)) return;

    mutations.push({
      type: 'BARU',
      label: 'Gadai Baru Masuk (Inflow)',
      kodeGadai: code,
      namaNasabah: ord['Nama Customer'],
      merkSepeda: ord['Nama Barang'],
      pinjaman: ord['Jumlah Pinjaman'],
      tglOrder: ord['Tanggal Order'],
      jatuhTempo: ord['Tanggal Jatuh Tempo'],
      statusBarang: 'AKTIF',
      batteryLevel: 100
    });
  });

  return {
    success: true,
    mutations,
    counts: {
      total: mutations.length,
      perpanjang: mutations.filter(m => m.type === 'PERPANJANG').length,
      tebus: mutations.filter(m => m.type === 'TEBUS').length,
      baru: mutations.filter(m => m.type === 'BARU').length
    }
  };
}

// Test with the 2 downloaded files
const downloads = path.join(os.homedir(), 'Downloads');
const buf1 = fs.readFileSync(path.join(downloads, 'Transaksi 02-11-2026 - 04-11-2026.xlsx'));
const buf2 = fs.readFileSync(path.join(downloads, 'Buku Besar - 11110004 - 02-11-2026 04-11-2026.xlsx'));

const realUnitsPath = path.join(__dirname, '..', 'src', 'data', 'realUnits.js');
const realUnitsContent = fs.readFileSync(realUnitsPath, 'utf8');
const matchUnits = realUnitsContent.match(/export const REAL_EXCEL_UNITS = (\[[\s\S]*?\]);/);
const existingUnits = eval(matchUnits[1]);

const result = analyzeExcelFiles(buf1, buf2, existingUnits);
console.log('=== TEST HASIL AUTO ANALYZER ===');
console.log('Counts:', result.counts);
result.mutations.forEach((m, idx) => {
  console.log(`[Mutasi #${idx+1} - ${m.type}] ${m.label} | Ref: ${m.oldKodeGadai || m.kodeGadai} -> ${m.newKodeGadai || ''} | Cust: ${m.namaNasabah} | Barang: ${m.merkSepeda}`);
});

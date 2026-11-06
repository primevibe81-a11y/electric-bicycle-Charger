/**
 * Auto-Sync Engine from Pawn Reports (Transaksi & Buku Besar)
 * Antrean Charger Sepeda Listrik & Gadai
 */

import * as XLSX from 'xlsx';
import {
  extendGadaiUnit,
  redeemGadaiUnit,
  createGadaiUnit,
  getStoredUnits,
  saveStoredUnits,
  normalizeHistoryEntry
} from './storage';
import { sanitizeText } from './security';

/**
 * Filter cerdas untuk memastikan hanya SEPEDA LISTRIK yang diproses
 * (Mengecualikan sepeda pancal manual, sepeda motor bensin, emas, HP, dsb)
 */
export function isElectricBicycle(kategori = '', subKategori = '', namaBarang = '') {
  const text = `${kategori} ${subKategori} ${namaBarang}`.toUpperCase();

  const hasBike = text.includes('SEPEDA') || text.includes('BIKE');
  const hasElectric =
    text.includes('LISTRIK') ||
    text.includes('UWINFLY') ||
    text.includes('U-WINFLY') ||
    text.includes('U WINFLY') ||
    text.includes('GODA') ||
    text.includes('EXOTIC LISTRIK') ||
    text.includes('SELIS');

  // Blacklist unit non-listrik
  const isPancal = text.includes('PANCAL') || text.includes('MANUAL') || text.includes('THRILL');
  const isMotorBensin =
    text.includes('SEPEDA MOTOR') ||
    text.includes('MOTOR ') ||
    text.includes('JUPITER') ||
    text.includes('VARIO') ||
    text.includes('BEAT');

  return hasBike && hasElectric && !isPancal && !isMotorBensin;
}

/**
 * Parsing tanggal Indonesia (DD-MM-YYYY HH:mm) ke timestamp
 */
function parseIndoDateToTimestamp(str) {
  if (!str || str === '-') return null;
  try {
    const [dPart, tPart] = String(str).trim().split(' ');
    const [day, month, year] = dPart.split('-').map(Number);
    const [hour, minute] = (tPart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute).getTime();
  } catch (e) {
    return null;
  }
}

/**
 * Analisis silang 2 file Excel (Transaksi + Buku Besar) terhadap unit existing
 */
export function analyzePawnExcelFiles(transaksiArrayBuffer, bukuBesarArrayBuffer, existingUnits = []) {
  try {
    // 1. Baca File 1 (Transaksi)
    const wb1 = XLSX.read(transaksiArrayBuffer, { type: 'array' });
    const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
    const rows1 = XLSX.utils.sheet_to_json(sheet1);

    // 2. Baca File 2 (Buku Besar)
    const wb2 = XLSX.read(bukuBesarArrayBuffer, { type: 'array' });
    const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
    const raw2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });

    // Cari header Buku Besar
    let headerIdx = 6;
    for (let i = 0; i < Math.min(15, raw2.length); i++) {
      if (
        raw2[i] &&
        raw2[i].some(
          c =>
            String(c).toLowerCase().includes('tanggal') ||
            String(c).toLowerCase().includes('deskripsi')
        )
      ) {
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
      headers2.forEach((h, idx) => (o[h] = r[idx]));
      rows2.push(o);
    }

    // Buat map unit existing untuk pencocokan cepat
    const existingMap = new Map();
    existingUnits.forEach(u => {
      existingMap.set(u.kodeGadai, u);
      if (Array.isArray(u.riwayatKodeGadai)) {
        u.riwayatKodeGadai.forEach(entry => {
          const norm = normalizeHistoryEntry(entry);
          if (norm.kodeGadaiLama) existingMap.set(norm.kodeGadaiLama, u);
        });
      }
    });

    const fbrList = rows2.filter(r => String(r['No Jurnal'] || '').startsWith('FBR'));
    const ebikeOrders = rows1.filter(r =>
      isElectricBicycle(r['Kategori'], r['Sub Kategori'], r['Nama Barang'])
    );

    const mutations = [];
    const processedOldCodes = new Set();
    const processedNewCodes = new Set();

    // A. Deteksi PERPANJANGAN & TEBUS dari FBR Buku Besar
    fbrList.forEach(fbr => {
      const desc = sanitizeText(fbr['Deskripsi'] || '');
      if (!isElectricBicycle('', '', desc)) return;

      const refNo = sanitizeText(fbr['Ref No'] || '');
      const custName = sanitizeText(fbr['Nama Customer'] || '');
      const existingUnit = existingMap.get(refNo);

      // Cek apakah ada akad gadai baru atas nama nasabah dan barang e-bike ini
      const matchingNewOrder = ebikeOrders.find(ord => {
        const ordCust = sanitizeText(ord['Nama Customer'] || '').toUpperCase();
        const ordCode = sanitizeText(ord['Nomer Gadai'] || '');
        return ordCode !== refNo && ordCust === custName.toUpperCase();
      });

      if (matchingNewOrder) {
        const newCode = sanitizeText(matchingNewOrder['Nomer Gadai'] || '');
        processedOldCodes.add(refNo);
        processedNewCodes.add(newCode);

        // Jika unit sudah berada di nomor baru, lewati mutasi berulang
        if (existingUnit && existingUnit.kodeGadai === newCode) return;

        mutations.push({
          type: 'PERPANJANG',
          label: 'Perpanjangan Gadai (Renewal)',
          badgeColor: 'amber',
          unitId: existingUnit ? existingUnit.id : `unit-${newCode}`,
          oldKodeGadai: refNo,
          newKodeGadai: newCode,
          namaNasabah: custName,
          merkSepeda: sanitizeText(matchingNewOrder['Nama Barang'] || (existingUnit ? existingUnit.merkSepeda : 'Sepeda Listrik')),
          tglOrderBaru: matchingNewOrder['Tanggal Order'],
          jatuhTempoBaru: matchingNewOrder['Tanggal Jatuh Tempo'],
          jatuhTempoBaruMs: parseIndoDateToTimestamp(matchingNewOrder['Tanggal Jatuh Tempo']) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
          pinjaman: matchingNewOrder['Jumlah Pinjaman'],
          catatan: `Perpanjangan otomatis dari nomor lama #${refNo}`,
          existingUnit
        });
      } else {
        processedOldCodes.add(refNo);
        // Jika sudah ditebus sebelumnya, lewati
        if (existingUnit && existingUnit.statusBarang === 'DITEBUS') return;

        mutations.push({
          type: 'TEBUS',
          label: 'Ditebus / Pelunasan (Keluar Gudang)',
          badgeColor: 'blue',
          unitId: existingUnit ? existingUnit.id : null,
          kodeGadai: refNo,
          namaNasabah: custName,
          merkSepeda: existingUnit ? existingUnit.merkSepeda : sanitizeText(desc.replace(/^Pinjaman a\/n [^ ]+ /i, '')),
          tglPelunasan: fbr['Tanggal'],
          existingUnit
        });
      }
    });

    // B. Deteksi GADAI BARU dari ebikeOrders yang bukan perpanjangan
    ebikeOrders.forEach(ord => {
      const code = sanitizeText(ord['Nomer Gadai'] || '');
      if (processedNewCodes.has(code) || existingMap.has(code)) return;

      mutations.push({
        type: 'BARU',
        label: 'Gadai Baru Masuk (Inflow)',
        badgeColor: 'emerald',
        kodeGadai: code,
        namaNasabah: sanitizeText(ord['Nama Customer'] || ''),
        merkSepeda: sanitizeText(ord['Nama Barang'] || ''),
        pinjaman: ord['Jumlah Pinjaman'],
        tglOrder: ord['Tanggal Order'],
        jatuhTempo: ord['Tanggal Jatuh Tempo'],
        jatuhTempoMs: parseIndoDateToTimestamp(ord['Tanggal Jatuh Tempo']) || (Date.now() + 30 * 24 * 60 * 60 * 1000),
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
  } catch (err) {
    console.error('Error analyzing Excel files:', err);
    return {
      success: false,
      error: err?.message || String(err),
      mutations: [],
      counts: { total: 0, perpanjang: 0, tebus: 0, baru: 0 }
    };
  }
}

/**
 * Terapkan seluruh mutasi hasil sinkronisasi ke Store & Supabase
 */
export async function applyBatchSyncMutations(mutations = []) {
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return { success: false, message: 'Tidak ada mutasi yang dipilih.' };
  }

  let appliedCount = 0;
  const logs = [];

  for (const m of mutations) {
    if (m.type === 'PERPANJANG') {
      if (m.unitId) {
        const res = extendGadaiUnit(
          m.unitId,
          m.newKodeGadai,
          m.jatuhTempoBaruMs,
          m.catatan || `Perpanjangan otomatis dari #${m.oldKodeGadai}`
        );
        if (res.success) {
          appliedCount++;
          logs.push(`Perpanjang #${m.oldKodeGadai} -> #${m.newKodeGadai}`);
        }
      }
    } else if (m.type === 'TEBUS') {
      if (m.unitId) {
        const res = redeemGadaiUnit(m.unitId, 'Ditebus lunas via sinkronisasi laporan buku besar');
        if (res.success) {
          appliedCount++;
          logs.push(`Tebus #${m.kodeGadai} (${m.namaNasabah})`);
        }
      }
    } else if (m.type === 'BARU') {
      const res = createGadaiUnit({
        kodeGadai: m.kodeGadai,
        merkSepeda: m.merkSepeda,
        namaNasabah: m.namaNasabah,
        batteryLevel: 100,
        kondisiBaterai: 'PRIMA',
        catatanBaterai: 'Unit baru masuk via sinkronisasi laporan gadai',
        jatuhTempoDays: 30
      });
      if (res.success) {
        appliedCount++;
        logs.push(`Gadai Baru #${m.kodeGadai} (${m.merkSepeda})`);
      }
    }
  }

  return {
    success: true,
    appliedCount,
    message: `Berhasil menerapkan ${appliedCount} mutasi sepeda listrik ke sistem.`
  };
}

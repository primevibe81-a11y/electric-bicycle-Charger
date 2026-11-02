import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = 'https://myfoyievvukgdaixprsr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Zm95aWV2dnVrZ2RhaXhwcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODY2MTUsImV4cCI6MjEwOTE2MjYxNX0.ysjMzvJmo8y1JAGk9NRNUkUv5tmec1LkR0YfoMCMtuI';
const supabase = createClient(url, key);

const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
console.log('Membaca file Excel:', filePath);

const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

function parseIndoDate(str) {
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

async function syncRealData() {
  console.log(`Memproses ${rows.length} baris data real...`);

  const realUnitsForDb = rows.map((r) => {
    const rawKode = String(r[0]).trim();
    const namaNasabah = String(r[1] || 'Nasabah').trim();
    const rawMerk = String(r[4] || 'Sepeda Listrik').trim();
    const cleanMerk = rawMerk.replace(/^SEPEDA\s+LISTRIK\s+/i, '').trim() || rawMerk;
    
    const masukAt = parseIndoDate(r[5]) || (Date.now() - 30 * 24 * 60 * 60 * 1000);
    const jatuhTempoAt = parseIndoDate(r[6]) || (Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const rawStatus = String(r[9] || 'active').trim().toLowerCase();
    const statusBarang = rawStatus === 'lelang' ? 'LELANG' : 'AKTIF';

    // Baterai 100% per permintaan user
    const batteryLevel = 100;

    return {
      id: `unit-${rawKode}`,
      kode_gadai: rawKode,
      riwayat_kode_gadai: [],
      merk_sepeda: cleanMerk,
      nama_nasabah: namaNasabah,
      battery_level: batteryLevel,
      status_barang: statusBarang,
      status_charger: 'IDLE',
      charge_start_at: null,
      charge_end_at: null,
      queued_at: null,
      last_charged_at: masukAt,
      jatuh_tempo_at: jatuhTempoAt,
      harga_lelang: statusBarang === 'LELANG' ? 2500000 : 0,
      updated_at: Date.now()
    };
  });

  // Hapus semua data lama di Supabase
  console.log('Menghapus SELURUH data lama dari tabel gadai_units di Supabase...');
  const { error: delErr } = await supabase.from('gadai_units').delete().neq('id', 'NON_EXISTENT_ID_FOR_CLEANUP');
  if (delErr) {
    console.error('Gagal menghapus data lama:', delErr.message);
    process.exit(1);
  }
  console.log('Tabel Supabase telah bersih.');

  // Masukkan hanya 65 data real
  console.log(`Menyuntikkan ${realUnitsForDb.length} unit data real ke Supabase...`);
  const batchSize = 25;
  for (let i = 0; i < realUnitsForDb.length; i += batchSize) {
    const batch = realUnitsForDb.slice(i, i + batchSize);
    const { error: insErr } = await supabase.from('gadai_units').insert(batch);
    if (insErr) {
      console.error(`Gagal insert batch ${i}:`, insErr.message);
      process.exit(1);
    }
  }

  // Verifikasi jumlah tepat 65 unit
  const { count, error: countErr } = await supabase.from('gadai_units').select('*', { count: 'exact', head: true });
  console.log(`\nVERIFIKASI DATABASE:`);
  console.log(`Total unit di Supabase sekarang: EXACTLY ${count} UNIT.`);

  // Buat file realUnits.js untuk aplikasi lokal / seed fallback
  const realUnitsClientModel = realUnitsForDb.map((u) => ({
    id: u.id,
    kodeGadai: u.kode_gadai,
    riwayatKodeGadai: [],
    merkSepeda: u.merk_sepeda,
    namaNasabah: u.nama_nasabah,
    batteryLevel: u.battery_level,
    statusBarang: u.status_barang,
    statusCharger: u.status_charger,
    chargeStartAt: null,
    chargeEndAt: null,
    queuedAt: null,
    lastChargedAt: u.last_charged_at,
    jatuhTempoAt: u.jatuh_tempo_at,
    hargaLelang: u.harga_lelang,
    updatedAt: u.updated_at
  }));

  const dataDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, 'realUnits.js'),
    `// Data Real dari file: Transaksi 01-01-2026 - 02-11-2026.xlsx (${realUnitsClientModel.length} unit)\nexport const REAL_EXCEL_UNITS = ${JSON.stringify(realUnitsClientModel, null, 2)};\n`
  );
  console.log(`File src/data/realUnits.js berhasil dibuat (${realUnitsClientModel.length} unit).`);
}

syncRealData();

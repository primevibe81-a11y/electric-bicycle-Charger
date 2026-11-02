import xlsx from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const url = 'https://myfoyievvukgdaixprsr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Zm95aWV2dnVrZ2RhaXhwcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODY2MTUsImV4cCI6MjEwOTE2MjYxNX0.ysjMzvJmo8y1JAGk9NRNUkUv5tmec1LkR0YfoMCMtuI';
const supabase = createClient(url, key);

const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
console.log('Loading Excel from:', filePath);

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

async function runImport() {
  console.log(`Membaca ${rows.length} baris dari Excel...`);

  const unitsToInsert = rows.map((r, idx) => {
    const rawKode = String(r[0]).trim();
    const namaNasabah = String(r[1] || 'Nasabah').trim();
    const rawMerk = String(r[4] || 'Sepeda Listrik').trim();
    const cleanMerk = rawMerk.replace(/^SEPEDA\s+LISTRIK\s+/i, '').trim() || rawMerk;
    
    const masukAt = parseIndoDate(r[5]) || (Date.now() - 30 * 24 * 60 * 60 * 1000);
    const jatuhTempoAt = parseIndoDate(r[6]) || (Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const rawStatus = String(r[9] || 'active').trim().toLowerCase();
    const statusBarang = rawStatus === 'lelang' ? 'LELANG' : 'AKTIF';

    // Per user request: untuk sekarang biarkan semua baterai 100%
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
      last_charged_at: masukAt, // Catat waktu awal masuk sebagai referensi awal charger audit
      jatuh_tempo_at: jatuhTempoAt,
      harga_lelang: statusBarang === 'LELANG' ? 2500000 : 0,
      updated_at: Date.now()
    };
  });

  console.log(`Mengunggah ${unitsToInsert.length} data sepeda listrik ke database Supabase...`);
  
  // Upsert in batches of 25 to be safe
  const batchSize = 25;
  for (let i = 0; i < unitsToInsert.length; i += batchSize) {
    const batch = unitsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('gadai_units').upsert(batch, { onConflict: 'kode_gadai' });
    if (error) {
      console.error(`Error pada batch ${i} - ${i + batch.length}:`, error.message);
      process.exit(1);
    }
    console.log(`Batch ${i + 1} - ${Math.min(i + batchSize, unitsToInsert.length)} berhasil di-upsert.`);
  }

  // Count total in Supabase
  const { count, error: countErr } = await supabase.from('gadai_units').select('*', { count: 'exact', head: true });
  console.log(`\nSELESAI! Total unit di Supabase sekarang: ${count} unit.`);
}

runImport();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = 'https://myfoyievvukgdaixprsr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Zm95aWV2dnVrZ2RhaXhwcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODY2MTUsImV4cCI6MjEwOTE2MjYxNX0.ysjMzvJmo8y1JAGk9NRNUkUv5tmec1LkR0YfoMCMtuI';
const supabase = createClient(url, key);

function dbToModel(row) {
  return {
    id: row.id,
    kodeGadai: row.kode_gadai,
    riwayatKodeGadai: Array.isArray(row.riwayat_kode_gadai) ? row.riwayat_kode_gadai : [],
    merkSepeda: row.merk_sepeda,
    namaNasabah: row.nama_nasabah,
    batteryLevel: Number(row.battery_level) ?? 100,
    statusBarang: row.status_barang,
    statusCharger: row.status_charger,
    chargeStartAt: row.charge_start_at ? Number(row.charge_start_at) : null,
    chargeEndAt: row.charge_end_at ? Number(row.charge_end_at) : null,
    chargeDurationMs: row.charge_duration_ms ? Number(row.charge_duration_ms) : 10800000,
    kondisiBaterai: row.kondisi_baterai || 'PRIMA',
    catatanBaterai: row.catatan_baterai || '',
    queuedAt: row.queued_at ? Number(row.queued_at) : null,
    lastChargedAt: row.last_charged_at ? Number(row.last_charged_at) : null,
    jatuhTempoAt: row.jatuh_tempo_at ? Number(row.jatuh_tempo_at) : null,
    hargaLelang: Number(row.harga_lelang) || 0,
    updatedAt: Number(row.updated_at) || Date.now()
  };
}

async function updateRealUnitsFile() {
  const { data, error } = await supabase.from('gadai_units').select('*').order('updated_at', { ascending: false });
  if (error) {
    console.error('Error fetch Supabase:', error);
    return;
  }

  const modelUnits = data.map(dbToModel);
  const fileContent = `// Data Real Tersinkronisasi per 04-11-2026 (${modelUnits.length} unit: 41 Aktif, 22 Lelang, 3 Ditebus)
export const REAL_EXCEL_UNITS = ${JSON.stringify(modelUnits, null, 2)};
`;

  const targetPath = path.join(__dirname, '..', 'src', 'data', 'realUnits.js');
  fs.writeFileSync(targetPath, fileContent, 'utf8');
  console.log(`Berhasil menulis ${modelUnits.length} unit ke ${targetPath}`);
}

updateRealUnitsFile();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = 'https://myfoyievvukgdaixprsr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Zm95aWV2dnVrZ2RhaXhwcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODY2MTUsImV4cCI6MjEwOTE2MjYxNX0.ysjMzvJmo8y1JAGk9NRNUkUv5tmec1LkR0YfoMCMtuI';
const supabase = createClient(url, key);

async function executeSync() {
  console.log('=== MEMULAI SINKRONISASI DATABASE SUPABASE ===');

  // 1. Update Hatna Sari: 26_0035787 -> 26_0038119 (Perpanjangan dari Lelang ke Aktif)
  const historyHatna = [
    {
      kodeGadaiLama: '26_0035787',
      tglPerpanjang: 1793712840000, // 03-11-2026 20:14
      catatanLama: 'Perpanjangan dari lelang lama (akad 23-09-2026). Baterai normal 100%.',
      kondisiBateraiLama: 'PRIMA'
    }
  ];

  console.log('1. Mengupdate unit Hatna Sari (26_0035787 -> 26_0038119)...');
  const { data: updateHatna, error: errHatna } = await supabase
    .from('gadai_units')
    .update({
      kode_gadai: '26_0038119',
      riwayat_kode_gadai: historyHatna,
      status_barang: 'AKTIF',
      jatuh_tempo_at: 1796317200000, // 04-12-2026 00:00:00 WIB
      catatan_baterai: 'Perpanjangan aktif dari nomor lama #26_0035787',
      updated_at: Date.now()
    })
    .eq('kode_gadai', '26_0035787')
    .select();

  if (errHatna) {
    console.error('Error update Hatna Sari:', errHatna);
  } else {
    console.log('Sukses update Hatna Sari:', updateHatna);
  }

  // 2. Tambah unit baru Rohmat: 26_0038042 (Gadai Baru Uwinfly Biru)
  console.log('\n2. Memasukkan unit baru Rohmat (26_0038042)...');
  const newUnitRohmat = {
    id: 'unit-26_0038042',
    kode_gadai: '26_0038042',
    riwayat_kode_gadai: [],
    merk_sepeda: 'UWINFLY BIRU',
    nama_nasabah: 'ROHMAT',
    battery_level: 100,
    status_barang: 'AKTIF',
    status_charger: 'IDLE',
    charge_start_at: null,
    charge_end_at: null,
    queued_at: null,
    last_charged_at: 1793617260000, // 02-11-2026 18:01:00 WIB
    jatuh_tempo_at: 1796230800000, // 03-12-2026 00:00:00 WIB
    harga_lelang: 0,
    kondisi_baterai: 'PRIMA',
    catatan_baterai: 'Unit baru masuk gadai 02-11-2026',
    charge_duration_ms: 10800000,
    updated_at: Date.now()
  };

  const { data: insertRohmat, error: errRohmat } = await supabase
    .from('gadai_units')
    .upsert(newUnitRohmat, { onConflict: 'kode_gadai' })
    .select();

  if (errRohmat) {
    console.error('Error insert Rohmat:', errRohmat);
  } else {
    console.log('Sukses insert Rohmat:', insertRohmat);
  }

  // 3. Update 3 unit yang DITEBUS
  console.log('\n3. Mengupdate 3 unit yang telah ditebus (keluar gudang)...');
  const redeemedCodes = [
    { code: '26_0037627', name: 'Fatimatus Zahro' },
    { code: '26_0035555', name: 'Sugianto' },
    { code: '26_0033387', name: 'Siti Kusmawati' }
  ];

  for (const item of redeemedCodes) {
    const { data: updateRedeemed, error: errRedeemed } = await supabase
      .from('gadai_units')
      .update({
        status_barang: 'DITEBUS',
        status_charger: 'IDLE',
        charge_start_at: null,
        charge_end_at: null,
        queued_at: null,
        catatan_baterai: `Ditebus lunas oleh nasabah pada periode 02-04 Nov 2026. Barang keluar dari gudang.`,
        updated_at: Date.now()
      })
      .eq('kode_gadai', item.code)
      .select();

    if (errRedeemed) {
      console.error(`Error update tebus ${item.code}:`, errRedeemed);
    } else {
      console.log(`Sukses update status DITEBUS untuk #${item.code} (${item.name})`);
    }
  }

  // 4. Verifikasi Total Unit & Komposisi Status di Supabase
  console.log('\n=== VERIFIKASI AKHIR DATABASE SUPABASE ===');
  const { data: allUnits, error: errAll } = await supabase
    .from('gadai_units')
    .select('kode_gadai, status_barang, merk_sepeda, nama_nasabah, riwayat_kode_gadai');

  if (errAll) {
    console.error('Error query final Supabase:', errAll);
  } else {
    console.log('Total baris di Supabase saat ini:', allUnits.length);
    const summary = {
      AKTIF: allUnits.filter(u => u.status_barang === 'AKTIF').length,
      LELANG: allUnits.filter(u => u.status_barang === 'LELANG').length,
      DITEBUS: allUnits.filter(u => u.status_barang === 'DITEBUS').length,
      TERJUAL_LELANG: allUnits.filter(u => u.status_barang === 'TERJUAL_LELANG').length
    };
    console.log('Komposisi Status Barang di Supabase:', summary);
    console.log('Fisik Sepeda Listrik di Gudang (AKTIF + LELANG):', summary.AKTIF + summary.LELANG);

    // Verifikasi Hatna Sari
    const hatna = allUnits.find(u => u.kode_gadai === '26_0038119');
    console.log('Verifikasi Hatna Sari:', hatna);
    // Verifikasi Rohmat
    const rohmat = allUnits.find(u => u.kode_gadai === '26_0038042');
    console.log('Verifikasi Rohmat:', rohmat);
  }
}

executeSync();

import { createClient } from '@supabase/supabase-js';

const url = 'https://myfoyievvukgdaixprsr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15Zm95aWV2dnVrZ2RhaXhwcnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODY2MTUsImV4cCI6MjEwOTE2MjYxNX0.ysjMzvJmo8y1JAGk9NRNUkUv5tmec1LkR0YfoMCMtuI';

const supabase = createClient(url, key);

const SEED_DATA = [
  {
    id: "unit-101",
    kode_gadai: "202611001",
    riwayat_kode_gadai: [],
    merk_sepeda: "U-Winfly D7S",
    nama_nasabah: "Budi Santoso",
    battery_level: 25,
    status_barang: "AKTIF",
    status_charger: "CHARGING",
    charge_start_at: Date.now() - 42 * 60 * 1000,
    charge_end_at: Date.now() + (3 * 60 - 42) * 60 * 1000,
    queued_at: null,
    last_charged_at: null,
    jatuh_tempo_at: Date.now() + 14 * 24 * 60 * 60 * 1000,
    harga_lelang: 0,
    updated_at: Date.now(),
  },
  {
    id: "unit-102",
    kode_gadai: "202611002",
    riwayat_kode_gadai: ["202610889"],
    merk_sepeda: "Exotic Cooltech 2.0",
    nama_nasabah: "Siti Rahma",
    battery_level: 12,
    status_barang: "AKTIF",
    status_charger: "WAITING",
    charge_start_at: null,
    charge_end_at: null,
    queued_at: Date.now() - 15 * 60 * 1000,
    last_charged_at: null,
    jatuh_tempo_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    harga_lelang: 0,
    updated_at: Date.now(),
  },
  {
    id: "unit-103",
    kode_gadai: "202611003",
    riwayat_kode_gadai: [],
    merk_sepeda: "Godwin G5 New",
    nama_nasabah: "Ahmad Fauzi",
    battery_level: 38,
    status_barang: "AKTIF",
    status_charger: "WAITING",
    charge_start_at: null,
    charge_end_at: null,
    queued_at: Date.now() - 30 * 60 * 1000,
    last_charged_at: null,
    jatuh_tempo_at: Date.now() + 21 * 24 * 60 * 60 * 1000,
    harga_lelang: 0,
    updated_at: Date.now(),
  },
  {
    id: "unit-104",
    kode_gadai: "202611004",
    riwayat_kode_gadai: [],
    merk_sepeda: "Selis Butterfly Trike",
    nama_nasabah: "Hendra Wijaya",
    battery_level: 65,
    status_barang: "AKTIF",
    status_charger: "IDLE",
    charge_start_at: null,
    charge_end_at: null,
    queued_at: null,
    last_charged_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
    jatuh_tempo_at: Date.now() + 18 * 24 * 60 * 60 * 1000,
    harga_lelang: 0,
    updated_at: Date.now(),
  },
  {
    id: "unit-105",
    kode_gadai: "202611005",
    riwayat_kode_gadai: [],
    merk_sepeda: "Pacific Nuri",
    nama_nasabah: "Dewi Lestari",
    battery_level: 15,
    status_barang: "LELANG",
    status_charger: "IDLE",
    charge_start_at: null,
    charge_end_at: null,
    queued_at: null,
    last_charged_at: null,
    jatuh_tempo_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
    harga_lelang: 2850000,
    updated_at: Date.now(),
  },
  {
    id: "unit-106",
    kode_gadai: "202611006",
    riwayat_kode_gadai: ["202609012"],
    merk_sepeda: "Viar Uno 2",
    nama_nasabah: "Agus Pratama",
    battery_level: 100,
    status_barang: "DITEBUS",
    status_charger: "IDLE",
    charge_start_at: null,
    charge_end_at: null,
    queued_at: null,
    last_charged_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    jatuh_tempo_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
    harga_lelang: 0,
    updated_at: Date.now(),
  }
];

async function seed() {
  console.log("Memeriksa tabel gadai_units...");
  const { data, error } = await supabase.from('gadai_units').select('id');
  if (error) {
    console.error("Gagal membaca tabel:", error.message);
    process.exit(1);
  }

  console.log("Memasukkan data seed ke Supabase...");
  const { error: upsertErr } = await supabase.from('gadai_units').upsert(SEED_DATA);
  if (upsertErr) {
    console.error("Gagal insert data:", upsertErr.message);
    process.exit(1);
  }

  console.log("BERHASIL! 6 unit data awal telah masuk ke Supabase.");
}

seed();

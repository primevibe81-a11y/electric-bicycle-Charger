# Rencana Pengembangan Aplikasi Web Antrian Charger Sepeda Listrik & Manajemen Gadai (iPhone 13 Mobile-First) — Blueprint Eksekusi Agent Antigravity (Biaya Rp 0)

Dokumen ini adalah spesifikasi teknis lengkap (*Agent-Ready Blueprint*) untuk membangun aplikasi web manajemen antrian charger sepeda listrik dan siklus barang gadai yang dioptimalkan khusus untuk **iPhone 13 (390 × 844 px)** dengan **biaya operasional Rp 0 (100% Free Tier)**.

## 1. Tech Stack Paling Optimal dengan Biaya Rp 0 (Zero-Cost Architecture)

Seluruh komponen teknologi dipilih agar **tidak memerlukan kartu kredit**, bebas biaya bulanan selamanya, cepat dieksekusi oleh AI Agent di Antigravity, serta berjalan mulus di Safari iOS iPhone 13:

| Lapisan (Layer) | Teknologi Pilihan (100% Gratis) | Alasan Teknis & Keunggulan untuk Agent Antigravity | Kuota Gratis (Free Tier) |
| :--- | :--- | :--- | :--- |
| **Core Framework & Bundler** | **React 18 + Vite (TypeScript / JS)** | Ekosistem komponen paling stabil untuk AI coding agent, *build time* instan (<2 detik), ukuran *bundle* sangat kecil untuk mobile. | Open Source (Rp 0 selamanya) |
| **UI Styling & Ikon** | **Tailwind CSS v3.4 + Lucide React** | Agent dapat langsung menulis *utility classes* untuk gradien biru muda (`bg-gradient-to-b from-sky-50 via-sky-100 to-sky-200`) dan *safe-area* iPhone 13 tanpa konflik CSS. | Open Source (Rp 0 selamanya) |
| **State Management & Local Persistence** | **Zustand (`persist` middleware)** | Sangat ringan (~1 KB), otomatis menyimpan state ke `localStorage` perangkat iPhone 13 sebagai *offline fallback* instan tanpa boilerplate Redux. | Open Source (Rp 0 selamanya) |
| **Realtime Database & Sync (Multi-Device)** | **Supabase Free Tier (PostgreSQL + Realtime WebSockets)** *(Beserta Mode LocalStorage Murni)* | Menyediakan *Realtime Postgres Changes* via WebSockets agar perubahan antrian charger & status gadai langsung muncul real-time tanpa refresh dan **tanpa perlu kartu kredit**. | 500 MB Database, 2 juta pesan Realtime/bulan, 5 GB Bandwidth (Rp 0) |
| **Autentikasi** | **Hardcoded Source-Code Auth (`src/config/auth.ts`)** | Sesuai kebutuhan: daftar akun & PIN 6 digit disimpan langsung di *source code* + validasi sesi di `localStorage` (0 biaya database auth). | Rp 0 (Berjalan 100% di sisi klien) |
| **PWA & Push Notification iOS** | **`vite-plugin-pwa` + Web Push API + Web Audio API** | Menghasilkan `manifest.json` dan *Service Worker* otomatis agar bisa di-*Add to Home Screen* di iPhone 13 dan membunyikan alarm suara + notifikasi saat timer 3 jam selesai. | Standar Web Browser (Rp 0) |
| **Cloud Hosting & HTTPS** | **Vercel (Hobby Plan) / Cloudflare Pages** | Wajib menggunakan HTTPS agar fitur PWA & Web Notification di iOS Safari diizinkan oleh Apple. Deploy otomatis dari Git atau CLI dalam 30 detik. | 100 GB Bandwidth/bulan, SSL/HTTPS otomatis (Rp 0) |

### Strategi Dual-Storage (Supabase Realtime + LocalStorage Fallback)
Agar aplikasi langsung berfungsi 100% saat pertama kali dijalankan oleh Agent di Antigravity **bahkan sebelum Anda memasukkan API Key Supabase**:
* Jika variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` belum diisi di `.env`, aplikasi otomatis berjalan menggunakan **LocalStorage + BroadcastChannel API** (data tersimpan aman di memori iPhone 13 Anda dan sinkron antar-tab secara real-time).
* Jika variabel `.env` Supabase diisi, aplikasi otomatis menyinkronkan antrian charger dan status barang gadai ke cloud Supabase secara real-time.

## 2. Spesifikasi Visual & Optimasi Layar iPhone 13 (Mobile-First)

Aplikasi dirancang menggunakan pendekatan **Progressive Web App (PWA) Mobile-First** agar dapat dipasang langsung ke *Home Screen* iPhone 13 (iOS Safari) dan tampil layaknya aplikasi native tanpa bilah alamat browser.

| Komponen Desain | Spesifikasi Teknis iPhone 13 | Implementasi CSS / Tailwind |
| :--- | :--- | :--- |
| **Resolusi Target** | Viewport `390px × 844px` (Rasio 19.5:9) | Kontainer utama `max-w-[430px] mx-auto min-h-[100dvh] relative overflow-x-hidden` |
| **Safe Area iOS** | Notch atas (`47px`) & Home Indicator bawah (`34px`) | `pt-[env(safe-area-inset-top)]` dan `pb-[calc(env(safe-area-inset-bottom)+5rem)]` |
| **Palet Gradient Utama** | Nuansa bersih *Light Blue Gradient* | Background utama: `linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 55%, #BAE6FD 100%)` |
| **Aksen & Kartu Aktif** | Biru elektrik lembut & permukaan *Glassmorphism* | Header/Card Charger: `linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)`, Card barang: `bg-white/85 backdrop-blur-md border border-sky-100 shadow-sm` |
| **Indikator Status Baterai** | Kode warna semantik kontras tinggi | Kritis `<20%`: `#EF4444` (Merah), Sedang `20%–60%`: `#F59E0B` (Amber), Penuh/Siap `>60%`: `#10B981` (Hijau) |
| **Tipografi & Touch Target** | Font sistem iOS (`-apple-system, SF Pro Display`) | Ukuran font `<input>` wajib minimal `text-base` (`16px`) untuk mencegah *auto-zoom* Safari iOS saat mengetik nomor gadai; tinggi tombol minimal `48px` (`h-12`) |
| **Navigasi Utama** | *Fixed Bottom Navigation Bar* (5 Tab) | Posisi tetap di bawah layar (`fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto`), nyaman dijangkau satu ibu jari (*thumb-friendly zone*) |

### Konfigurasi Meta Tag & PWA Khusus iPhone 13 (`index.html`)
Agar aplikasi mendukung layar penuh dan notifikasi di iOS 16.4+, sertakan konfigurasi `<head>` berikut:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="E-Bike Gadai">
<meta name="theme-color" content="#E0F2FE">
<link rel="manifest" href="/manifest.json">
```

## 3. Sistem Autentikasi Hardcoded (Dari Source Code)

Sesuai kebutuhan operasional internal yang cepat dan ringan tanpa biaya database pengguna, kredensial disimpan langsung di dalam *source code* (`src/config/auth.js`) dan dikombinasikan dengan penyimpanan sesi di `localStorage`.

### Struktur Modul Autentikasi (`src/config/auth.js`)
```javascript
// Kredensial disimpan langsung di dalam source code
export const ALLOWED_USERS = [
  {
    username: "admin",
    pinCode: "135790", // PIN 6 digit agar cepat diketik di numpad iPhone 13
    role: "admin_gudang",
    displayName: "Petugas Gudang Utama"
  },
  {
    username: "kasir",
    pinCode: "246810",
    role: "kasir_gadai",
    displayName: "Kasir Cabang"
  }
];

const SESSION_KEY = "ebike_gadai_auth_session";

export function loginWithSourceAuth(username, pinCode) {
  const matchedUser = ALLOWED_USERS.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.pinCode === pinCode.trim()
  );

  if (!matchedUser) {
    return { success: false, message: "Username atau PIN salah." };
  }

  const sessionPayload = {
    username: matchedUser.username,
    role: matchedUser.role,
    displayName: matchedUser.displayName,
    loginAt: Date.now(),
    expiresAt: Date.now() + 12 * 60 * 60 * 1000 // Sesi aktif 12 jam
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
  return { success: true, user: sessionPayload };
}

export function getActiveSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function logoutSession() {
  localStorage.removeItem(SESSION_KEY);
}
```

### Antarmuka Login iPhone 13
* Menggunakan keypad numerik (`inputmode="numeric" pattern="[0-9]*"`) untuk input PIN sehingga keyboard angka besar iOS langsung muncul otomatis.
* Dilengkapi fitur *auto-redirect* ke menu **Dashboard Charger** segera setelah PIN 6 digit valid.

## 4. Aturan Bisnis & Algoritma Antrian Charger Sepeda Listrik

Inti dari aplikasi ini adalah mengatur giliran pengisian daya sepeda listrik berdasarkan **Kode Unik Angka Nomor Gadai** dengan batasan ketat:

1. **Identitas Unit (`kodeGadai`)**: Hanya menerima deretan angka unik dari nomor bukti gadai (contoh: `2026110045`). Validasi regex: `/^\d+$/`.
2. **Slot Sedang Di-Charge (`CHARGING`)**:
   * Maksimal 1 unit yang berada di slot sedang di-charge per jalur charger aktif.
   * Setiap unit memiliki durasi waktu pengisian tetap selama **3 jam (10.800 detik / 180 menit)** sejak sesi pengisian dimulai (`chargeEndAt = chargeStartAt + 10800000`).
   * Menampilkan *progress bar* biru muda dinamis, persentase estimasi pengisian, dan *countdown timer* real-time (`JJ:MM:DD`).
   * Ketika tombol **"Selesai / Cabut Charger"** ditekan (atau waktu 3 jam habis dan dikonfirmasi), status charger unit berubah menjadi `IDLE`, `batteryLevel` diperbarui menjadi `100%`, dan unit urutan `#1` di antrian otomatis ditawarkan/dinaikkan ke slot `CHARGING`.
3. **Kapasitas Maksimal Antrian (`WAITING`)**:
   * Maksimal unit yang berada di dalam daftar tunggu antrian adalah **2 unit** (`MAX_QUEUE_LIMIT = 2`).
   * Jika antrian sudah berisi 2 unit (`waitingQueue.length >= 2`), tombol **"Tambah ke Antrian"** otomatis terkunci (*disabled*) dan menampilkan pesan: *"Antrian penuh (Maksimal 2 unit). Tunggu salah satu unit selesai di-charge."*
4. **Prioritas Urutan Antrian Berdasarkan Baterai Terendah**:
   * Setiap kali unit dimasukkan ke antrian, petugas memasukkan persentase baterai awal (`batteryLevel`, contoh: `15%`).
   * Daftar antrian (maksimal 2 unit) diurutkan secara otomatis menggunakan komparator:
     1. **Persentase baterai paling rendah selalu berada di posisi paling atas (`Urutan #1`)**. Contoh: Jika Antrian #1 saat ini memiliki baterai `35%`, lalu masuk unit baru dengan baterai `12%`, maka unit `12%` otomatis naik menjadi **Antrian #1** dan unit `35%` bergeser menjadi **Antrian #2**.
     2. Jika persentase baterai sama persis, unit yang didaftarkan lebih dulu (`queuedAt` lebih awal) ditempatkan di atas.

### Logika Pengurutan & Validasi Antrian (`src/services/chargerQueue.js`)
```javascript
export const MAX_QUEUE_LIMIT = 2;
export const CHARGE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Jam (10.800.000 ms)

/**
 * Mengurutkan antrian dengan prioritas baterai paling rendah di paling atas (#1)
 */
export function sortWaitingQueue(waitingUnits) {
  return [...waitingUnits].sort((a, b) => {
    if (Number(a.batteryLevel) !== Number(b.batteryLevel)) {
      return Number(a.batteryLevel) - Number(b.batteryLevel); // Ascending: 12% di atas 35%
    }
    return (a.queuedAt || 0) - (b.queuedAt || 0); // Tie-breaker: waktu masuk antrian
  });
}

/**
 * Validasi apakah unit baru boleh masuk ke antrian (Maksimal 2 unit)
 */
export function canEnqueueUnit(waitingUnits) {
  return waitingUnits.length < MAX_QUEUE_LIMIT;
}

/**
 * Menghitung sisa waktu charger dari timestamp chargeEndAt
 */
export function getRemainingChargeTime(chargeEndAt) {
  const remainingMs = Math.max(0, chargeEndAt - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((CHARGE_DURATION_MS - remainingMs) / CHARGE_DURATION_MS) * 100))
  );

  return {
    remainingMs,
    isFinished: remainingMs === 0,
    formatted: `${hours}:${minutes}:${seconds}`,
    progressPercent
  };
}
```

## 5. Rincian 5 Menu Wajib & Alur Kerja

Seluruh menu utama diakses melalui **Bottom Navigation Bar** di bagian bawah layar iPhone 13:

| Urutan Tab | Nama Menu | Ikon & Fungsi Utama | Aksi & Komponen di Dalam Menu |
| :--- | :--- | :--- | :--- |
| **Tab 1** | **Dashboard** | Pantau unit sedang di-charge & antrian prioritas | • **Panel Unit Sedang Di-Charge (1 Slot Aktif, 3 Jam)**: Kartu gradien biru muda dengan hitung mundur 3 jam (`02:45:12`), kode gadai angka, indikator baterai awal, dan tombol *Selesai Charge / Naikkan Antrian #1*.<br>• **Panel Antrian Prioritas (Maks 2/2)**: Menampilkan maksimal 2 kartu unit tunggu yang otomatis berurut dari baterai terendah di posisi #1.<br>• **Modal Tambah ke Charger / Antrian**: Pilih cepat dari daftar barang *Aktif* atau *Lelang* dengan input persentase baterai saat ini. |
| **Tab 2** | **Aktif** | Daftar sepeda listrik berstatus gadai aktif | • **Form Tambah Unit Gadai Baru**: Input Nomor Gadai (khusus angka, `inputmode="numeric"`), Merk/Tipe Sepeda Listrik, Nama Nasabah, Persentase Baterai Saat Ini (`0-100%`), dan Tanggal Jatuh Tempo.<br>• **Filter & Pencarian Cepat**: Cari nomor gadai dengan numpad.<br>• **Tombol Aksi Cepat pada Kartu**: *Masukkan Antrian Charge*, *Perpanjang*, *Tebus*, atau *Pindah ke Lelang*. |
| **Tab 3** | **Tebus** | Proses pelunasan & pengambilan unit oleh nasabah | • **Pencarian Kode Gadai Aktif**: Pilih atau ketik angka kode gadai yang akan ditebus.<br>• **Pembersihan Antrian Otomatis**: Jika unit yang ditebus sedang berada di slot charger atau antrian tunggu, sistem otomatis mengeluarkannya dari charger/antrian.<br>• **Konfirmasi & Riwayat Tebus**: Mengubah status barang menjadi `DITEBUS`, mencatat waktu tebus, dan menampilkan daftar riwayat barang yang telah ditebus. |
| **Tab 4** | **Perpanjang** | Input nomor gadai baru untuk perpanjangan masa gadai | • **Pilih Nomor Gadai Lama**: Menampilkan detail unit aktif yang ingin diperpanjang.<br>• **Input Nomor Gadai Baru (Wajib Angka Unik)**: Mengganti kode unik angka lama dengan nomor akad gadai baru, menyimpan nomor lama ke array `riwayatKodeGadai`, serta memperbarui tanggal jatuh tempo baru.<br>• **Sinkronisasi Real-Time ke Antrian Charger**: Jika sepeda sedang mengantri atau sedang di-charge, nomor gadai pada kartu Dashboard Charger otomatis berubah ke nomor gadai baru tanpa mereset sisa waktu timer 3 jam. |
| **Tab 5** | **Lelang** | Manajemen unit lewat jatuh tempo yang siap dilelang | • **Daftar Unit Masuk Lelang**: Menampilkan sepeda listrik yang telah jatuh tempo atau dipindahkan ke status `LELANG`.<br>• **Kontrol Perawatan Baterai Lelang**: Unit berstatus `LELANG` tetap dapat dimasukkan ke antrian charger agar baterai sepeda tidak rusak selama menunggu laku.<br>• **Aksi Lelang Terjual**: Mencatat nominal laku lelang/catatan pembeli dan mengubah status menjadi `TERJUAL_LELANG`. |

### Diagram Alur Siklus Status Barang & Mutasi Nomor Gadai
```text
[Input Barang Baru] 
       │
       ▼
┌──────────────┐    Perpanjang (Input No. Gadai Baru)    ┌──────────────────────────┐
│ STATUS AKTIF │ ──────────────────────────────────────► │ Tetap AKTIF dengan       │
│ (Kode: 1001) │ ◄────────────────────────────────────── │ Kode Baru (Contoh: 2005) │
└──────┬───────┘    Riwayat kode lama (1001) tersimpan   └──────────────────────────┘
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   DITEBUS    │          │    LELANG    │          │ ANTRIAN /    │
│ (Unit Keluar)│          │ (Jatuh Tempo)│          │ CHARGER 3 JAM│
└──────────────┘          └──────┬───────┘          └──────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │TERJUAL LELANG│
                          └──────────────┘
```

## 6. Skema Database Gratis (Supabase SQL & Struktur State)

Jika Anda ingin mengaktifkan sinkronisasi cloud antar-HP secara gratis di Supabase, cukup jalankan *script* SQL berikut di **Supabase SQL Editor** (opsional, aplikasi tetap berjalan otomatis dengan `localStorage` jika tidak menggunakan Supabase):

```sql
create table public.gadai_units (
  id text primary key,
  kode_gadai text unique not null,
  riwayat_kode_gadai jsonb default '[]'::jsonb,
  merk_sepeda text not null,
  nama_nasabah text not null,
  battery_level integer not null default 20,
  status_barang text not null default 'AKTIF', -- 'AKTIF' | 'DITEBUS' | 'LELANG' | 'TERJUAL_LELANG'
  status_charger text not null default 'IDLE', -- 'IDLE' | 'WAITING' | 'CHARGING'
  charge_start_at bigint,
  charge_end_at bigint,
  queued_at bigint,
  last_charged_at bigint,
  jatuh_tempo_at bigint,
  harga_lelang bigint,
  updated_at bigint not null
);

-- Aktifkan Realtime WebSockets gratis untuk tabel gadai_units
alter publication supabase_realtime add table public.gadai_units;
```

## 7. Sistem Notifikasi Real-Time di iPhone 13 (Rp 0 Tanpa Layanan Berbayar)

Agar tidak memerlukan layanan SMS/WhatsApp Gateway berbayar, sistem notifikasi real-time menggunakan 3 lapis teknologi web bawaan yang **100% gratis**:

1. **In-App Real-Time Banner & Toast Alert**:
   * Muncul otomatis di bagian atas layar iPhone 13 (di bawah *notch*) setiap kali:
     * Sesi charger 3 jam selesai (`00:00:00`).
     * Sisa waktu charger tinggal 10 menit.
     * Urutan antrian berubah karena masuknya unit baru dengan baterai lebih rendah.
     * Nomor gadai diperpanjang atau status barang berubah.
2. **Synthesized Web Audio Alarm (`AudioContext`)**:
   * Tanpa perlu file `.mp3` eksternal, aplikasi menggunakan `window.AudioContext` untuk membunyikan nada peringatan *chime* lembut saat waktu charge 3 jam habis.
3. **Native iOS Web Notification API (`Service Worker`)**:
   * Menyediakan tombol **"Aktifkan Notifikasi iPhone"** di header Dashboard yang memanggil `Notification.requestPermission()`. Saat aplikasi di-*Add to Home Screen* di iOS 16.4+, notifikasi *"⚡ Charger Selesai untuk Kode Gadai [Nomor]!"* akan muncul langsung di *Notification Center / Lock Screen* iPhone 13.

## 8. Instruksi Eksekusi Langsung untuk Agent di Antigravity

Saat Anda memberikan file `plan.md` ini ke Agent di Antigravity, Agent harus mengeksekusi tahapan berikut secara berurutan sampai aplikasi siap dijalankan:

1. **Inisialisasi Proyek**:
   * Buat aplikasi berbasis **React + Vite + Tailwind CSS + Lucide React** (atau *Single-File/Modular Vite App*) dengan konfigurasi viewport iPhone 13 (`390 × 844 px`) dan tema *Light Blue Gradient*.
2. **Implementasi Modul Inti**:
   * Buat `src/config/auth.js` untuk autentikasi *hardcoded* dari *source code* (akun `admin` PIN `135790` dan `kasir` PIN `246810`).
   * Buat *state store* reaktif (`src/services/storage.js`) yang mendukung *persistence* `localStorage`, sinkronisasi real-time antar-tab (`BroadcastChannel`), dan *hook* opsional ke Supabase Realtime.
   * Sertakan *seed data* awal (1 unit sedang di-charge, 2 unit di antrian dengan baterai berbeda untuk mendemonstrasikan *auto-sort* baterai terendah di atas, serta beberapa unit berstatus Aktif dan Lelang) agar aplikasi langsung siap diuji begitu dibuka.
3. **Implementasi 5 Menu Wajib & Validasi Ketat**:
   * Pastikan input kode gadai dan baterai menggunakan `inputmode="numeric"` dan `font-size: 16px`.
   * Pastikan batas antrian maksimal **2 unit** dan durasi charger **3 jam per unit** dengan *countdown timer* real-time yang berjalan setiap detik.
   * Pastikan menu **Perpanjang** mengganti nomor gadai lama dengan nomor gadai angka baru, menyimpan nomor lama ke riwayat, dan langsung memperbarui nomor gadai di kartu antrian charger.
4. **Verifikasi Build & Preview**:
   * Jalankan *development server* dan pastikan tidak ada error kompilasi maupun *layout overflow* pada layar ukuran `390 × 844 px`.

---

## 9. Fitur Lock Screen Live Monitor untuk iPhone 13 (MediaSession & Service Worker)

Fitur inovatif ini memungkinkan petugas gudang memantau langsung status **Slot #1** dan **Slot #2** beserta sisa waktu pengisian detik demi detik langsung dari **Lock Screen iPhone 13**, **Dynamic Island**, maupun **Apple Watch** tanpa perlu membuka kunci ponsel (*hands-free monitoring*).

### Arsitektur Teknis Lock Screen Live Monitor:
1. **Silent Audio Loop Background Engine (`navigator.mediaSession`)**:
   * Mengenerate file audio hening berformat WAV PCM secara *in-memory* tanpa dependensi file eksternal (`data:audio/wav;base64,...`).
   * Memanfaatkan kebijakan *background audio playback* iOS Safari agar aplikasi tetap aktif mengeksekusi *countdown timer* saat layar iPhone 13 mati atau terkunci.
   * Memperbarui `navigator.mediaSession.metadata` secara reaktif:
     * **Title**: `⚡ Slot #1: #[NoGadai] ([Sisa Waktu JJ:MM:DD])`
     * **Artist**: `⚡ Slot #2: #[NoGadai] ([Sisa Waktu JJ:MM:DD]) • E-Bike Gadai`
     * **Album**: `Live Monitor Antrean Charger ([X] Slot Aktif)`
2. **Persistent Lock Screen Notification via Service Worker (`tag: 'active-charger-slots'`)**:
   * Menggunakan Service Worker PWA (`sw.js`) dengan memanggil `registration.showNotification(...)`.
   * Memasang properti unik `tag: 'active-charger-slots'` dan `renotify: false`, sehingga notifikasi diperbarui di tempat (*in-place update*) di Lock Screen iPhone 13 tanpa memicu getaran atau bunyi berulang.
   * Menampilkan ringkasan Slot #1 dan Slot #2 secara elegan di Notification Center iOS.
3. **Dashboard Live Control Widget**:
   * Kartu kontrol khusus di bagian atas Dashboard dengan toggle aktif/nonaktif.
   * Simulator *preview visual* Lock Screen iPhone 13 yang merefleksikan tampilan kartu Now Playing dan Notifikasi.


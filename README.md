# Antrean Charger Sepeda Listrik & Manajemen Gadai (iPhone 13 Mobile-First)

Aplikasi web manajemen antrean pengisian daya (*charger*) sepeda listrik dan siklus barang gadai yang dioptimalkan khusus untuk **iPhone 13 (390 × 844 px)** dengan pendekatan **Mobile-First PWA** dan arsitektur biaya Rp 0 (*Zero-Cost*).

## 🚀 Fitur Utama

1. **Dashboard Charger & Antrean Prioritas**:
   - **1 Slot Charger Aktif (Durasi Tetap 3 Jam)**: Dilengkapi *countdown timer* real-time (`JJ:MM:DD`), progress bar biru muda dinamis, dan tombol cabut charger (baterai otomatis penuh 100%).
   - **Antrean Prioritas Otomatis (Maksimal 2 Unit)**: Tombol tambah antrian terkunci otomatis saat kapasitas penuh. Sistem otomatis menempatkan unit dengan **persentase baterai terendah di Urutan #1**.
   - **Promosi Otomatis**: Unit antrean #1 otomatis dinaikkan ke slot charger saat unit sebelumnya selesai atau ditebus.

2. **Manajemen Unit Gadai Aktif**:
   - Formulir pendaftaran unit baru (Nomor Gadai angka murni, merk sepeda, nama nasabah, baterai %, jatuh tempo).
   - Pencarian cepat dan 4 aksi instan (*Charge*, *Perpanjang*, *Tebus*, *Lelang*).

3. **Penebusan Unit (Tebus)**:
   - Formulir pelunasan unit aktif nasabah.
   - **Pembersihan Antrean Otomatis**: Jika unit yang ditebus sedang di-charge atau dalam antrean, sistem otomatis mengeluarkannya dan memajukan antrean berikutnya.
   - Tabel riwayat penebusan.

4. **Perpanjangan Masa Gadai (Perpanjang)**:
   - Input nomor bukti gadai baru (wajib deretan angka unik).
   - Menyimpan nomor lama ke riwayat nomor gadai.
   - **Sinkronisasi Real-Time**: Nomor gadai pada kartu Dashboard langsung ter-update otomatis tanpa mereset sisa waktu timer 3 jam.

5. **Manajemen Lelang**:
   - Menampung unit sepeda listrik yang lewat masa jatuh tempo.
   - **Perawatan Baterai Lelang**: Unit lelang tetap dapat dimasukkan ke antrean charger secara berkala agar sel baterai tidak drop.
   - Form pencatatan penjualan lelang beserta riwayatnya.

6. **Autentikasi Kredensial Hardcoded**:
   - `admin` (PIN: `135790`) — Petugas Gudang Utama
   - `kasir` (PIN: `246810`) — Kasir Cabang
   - Numpad numerik 6 digit dengan validasi sesi 12 jam di `localStorage`.

7. **Notifikasi Real-Time**:
   - Sintesis melodi *chime* lembut via Web Audio API tanpa perlu file mp3 eksternal.
   - *In-app toast notification*.
   - Dukungan iOS Web Push & Notifications API.

## 🛠️ Tech Stack

- **Core**: React 18, Vite
- **Styling**: Tailwind CSS v3.4, Lucide React Icons
- **Storage**: Dual-Storage (LocalStorage + BroadcastChannel API cross-tab sync + Supabase Realtime ready)
- **Target Viewport**: Apple iPhone 13 (`390px × 844px`)

## 💻 Cara Menjalankan

1. Clone repositori:
   ```bash
   git clone https://github.com/primevibe81-a11y/electric-bicycle-Charger.git
   cd electric-bicycle-Charger
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Jalankan server lokal:
   ```bash
   npm run dev
   ```

4. Buka di browser:
   - Lokal: `http://localhost:3000`
   - Di iPhone: Buka IP jaringan lokal (misal: `http://192.168.x.x:3000`) dan pilih **"Add to Home Screen"**.

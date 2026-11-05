import React from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Zap,
  Clock,
  Calendar,
  MapPin,
  ListOrdered,
  Hourglass,
  Plug,
  Power,
  Cloud,
  CloudOff,
  Bell,
  BellOff,
  Smartphone,
  SlidersHorizontal,
  Settings,
  Info,
  Search,
  ArrowDownUp,
  Filter,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Plus,
  Coins,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  X,
  User,
  Bike,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  RefreshCw,
  LogOut,
  RotateCcw,
  Square,
  Play,
  ArrowUpRight,
  PackageCheck,
  Box,
  Layers
} from 'lucide-react';

/**
 * PUSAT REGISTRI IKON SISTEM (Icon Registry)
 * Prinsip: 1 Makna = 1 Ikon, konsisten di seluruh halaman aplikasi.
 * Stroke: 1.5px, sudut membulat, ramah buta warna (bentuk geometris berbeda).
 */
export const ICON_REGISTRY = {
  // --- Baterai & Daya ---
  'battery': {
    component: Battery,
    label: 'Baterai',
    desc: 'Indikator kapasitas baterai e-bike (skala isi sesuai persentase)',
    category: 'baterai',
    defaultColor: 'text-slate-600'
  },
  'battery-charging': {
    component: BatteryCharging,
    label: 'Sedang Di-charge',
    desc: 'Unit sedang terhubung ke colokan charger aktif',
    category: 'baterai',
    defaultColor: 'text-sky-600'
  },
  'charge': {
    component: Zap,
    label: 'Isi Daya / Charge',
    desc: 'Tindakan pengisian daya baterai sepeda listrik',
    category: 'baterai',
    defaultColor: 'text-sky-600'
  },

  // --- Kondisi Baterai (Bentuk Pembeda Ramah Buta Warna) ---
  'condition-prima': {
    component: CheckCircle2, // Lingkaran + Centang
    label: 'Baterai Prima',
    desc: 'Kondisi baterai sehat normal, voltase dan kapasitas stabil',
    category: 'kondisi',
    defaultColor: 'text-emerald-600'
  },
  'condition-menurun': {
    component: AlertTriangle, // Segitiga Peringatan
    label: 'Baterai Menurun',
    desc: 'Kapasitas baterai mulai drop ringan atau butuh perhatian berkala',
    category: 'kondisi',
    defaultColor: 'text-amber-500'
  },
  'condition-rusak': {
    component: AlertOctagon, // Oktagon Bahaya / Silang
    label: 'Baterai Rusak / Bahaya',
    desc: 'Baterai soak parah, kembung, atau rusak total (tidak layak pakai)',
    category: 'kondisi',
    defaultColor: 'text-rose-600'
  },

  // --- Waktu & Tanggal ---
  'clock': {
    component: Clock,
    label: 'Waktu Terakhir Charge',
    desc: 'Durasi waktu sejak unit terakhir kali selesai diisi daya',
    category: 'waktu',
    defaultColor: 'text-slate-500'
  },
  'calendar': {
    component: Calendar,
    label: 'Jatuh Tempo',
    desc: 'Tanggal batas akhir masa gadai unit sepeda listrik',
    category: 'waktu',
    defaultColor: 'text-slate-500'
  },

  // --- Gudang & Lokasi Fisik ---
  'pin': {
    component: MapPin,
    label: 'Letak Unit di Gudang',
    desc: 'Posisi penyimpanan fisik unit sepeda listrik di dalam gudang',
    category: 'gudang',
    defaultColor: 'text-sky-600'
  },
  'pin-empty': {
    component: MapPin,
    label: 'Letak Belum Diisi',
    desc: 'Posisi fisik unit belum dicatat di sistem gudang',
    category: 'gudang',
    defaultColor: 'text-slate-300'
  },
  'queue': {
    component: Hourglass,
    label: 'Antrian Charger',
    desc: 'Unit terdaftar dalam antrian tunggu colokan charger',
    category: 'gudang',
    defaultColor: 'text-amber-600'
  },
  'plug': {
    component: Plug,
    label: 'Colokan / Slot Charger',
    desc: 'Kapasitas colokan charger baterai di gudang',
    category: 'gudang',
    defaultColor: 'text-sky-600'
  },
  'box': {
    component: Box,
    label: 'Fisik di Gudang',
    desc: 'Total seluruh unit yang saat ini berada secara fisik di gudang',
    category: 'gudang',
    defaultColor: 'text-slate-700'
  },

  // --- Finansial & Aksi Khusus ---
  'coins': {
    component: Coins,
    label: 'Nilai Estimasi Lelang',
    desc: 'Taksiran harga lelang unit gadai yang siap dijual',
    category: 'aksi',
    defaultColor: 'text-purple-600'
  },
  'redeem': {
    component: PackageCheck,
    label: 'Ditebus / Keluar Gudang',
    desc: 'Unit telah ditebus oleh nasabah dan keluar dari gudang',
    category: 'aksi',
    defaultColor: 'text-blue-600'
  },

  // --- Sistem & Navigasi ---
  'sync': {
    component: Cloud,
    label: 'Sinkronisasi Cloud',
    desc: 'Status konektivitas dan sinkronisasi data lokal ke server',
    category: 'sistem',
    defaultColor: 'text-sky-600'
  },
  'bell': {
    component: Bell,
    label: 'Notifikasi & Alarm',
    desc: 'Pemberitahuan suara pengingat selesai charge dan unit kritis',
    category: 'sistem',
    defaultColor: 'text-slate-600'
  },
  'phone': {
    component: Smartphone,
    label: 'Pantau di Layar Kunci',
    desc: 'Fitur Live Activity / Always-On Display untuk pantauan tanpa buka HP',
    category: 'sistem',
    defaultColor: 'text-emerald-600'
  },
  'settings': {
    component: SlidersHorizontal,
    label: 'Pengaturan',
    desc: 'Konfigurasi jumlah slot colokan dan parameter sistem',
    category: 'sistem',
    defaultColor: 'text-slate-600'
  },
  'excel': {
    component: FileSpreadsheet,
    label: 'Ekspor Excel (.xlsx)',
    desc: 'Unduh rekapitulasi data mutasi unit ke spreadsheet Excel',
    category: 'sistem',
    defaultColor: 'text-emerald-600'
  },
  'pdf': {
    component: FileText,
    label: 'Cetak Laporan PDF',
    desc: 'Buat dokumen PDF ringkasan inventaris sepeda listrik gudang',
    category: 'sistem',
    defaultColor: 'text-rose-600'
  },
  'more': {
    component: MoreHorizontal,
    label: 'Menu Aksi Lengkap',
    desc: 'Buka pilihan aksi perpanjang, tebus, audit baterai, dan lelang',
    category: 'aksi',
    defaultColor: 'text-slate-500'
  },
  'info': {
    component: Info,
    label: 'Informasi Penjelasan',
    desc: 'Penjelasan rinci mengenai fitur terkait',
    category: 'sistem',
    defaultColor: 'text-slate-400'
  }
};

/**
 * Komponen Sentral <Icon />
 * 
 * @param {string} name - Nama ikon dari ICON_REGISTRY (misal: 'pin', 'condition-prima')
 * @param {number|string} size - Ukuran ikon: 14, 16, 18, 20, 24 (default: 16)
 * @param {string} className - Kelas styling Tailwind tambahan
 * @param {string} color - Override warna spesifik
 * @param {number} strokeWidth - Ketebalan garis line (default: 1.5)
 * @param {string} ariaLabel - Teks aksesibilitas screen-reader
 */
export default function Icon({
  name,
  size = 16,
  className = '',
  color = '',
  strokeWidth = 1.5,
  ariaLabel = null,
  ...props
}) {
  const item = ICON_REGISTRY[name];
  if (!item) {
    console.warn(`[Icon] Unknown icon name: "${name}"`);
    return null;
  }

  const Component = item.component;
  const resolvedColor = color || item.defaultColor || 'currentColor';
  const resolvedLabel = ariaLabel || item.label;

  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={`shrink-0 ${resolvedColor} ${className}`}
      aria-label={resolvedLabel}
      aria-hidden={!ariaLabel}
      {...props}
    />
  );
}

/**
 * WhatsApp Daily Shift Report Generator
 * Formats a clean, professional summary of warehouse operations ready to send to WhatsApp.
 */

import { getDaysSinceLastCharge } from './chargerQueue';

export function generateWhatsAppReport(units = [], currentUser = null) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' WIB';

  const hour = now.getHours();
  const shiftName = hour >= 6 && hour < 14 ? 'Pagi (08:00 - 14:00)' : hour >= 14 && hour < 21 ? 'Sore (14:00 - 21:00)' : 'Malam';

  const aktifUnits = units.filter(u => u.statusGadai === 'AKTIF');
  const lelangUnits = units.filter(u => u.statusGadai === 'LELANG');
  const tebusUnits = units.filter(u => u.statusGadai === 'DITEBUS');
  const fisikGudang = aktifUnits.length + lelangUnits.length;

  const chargingUnits = units.filter(u => u.statusCharger === 'CHARGING');
  const waitingUnits = units.filter(u => u.statusCharger === 'WAITING');

  // Selesai charge hari ini
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const finishedToday = units.filter(u => {
    return u.lastChargedAt && u.lastChargedAt >= startOfDay && u.statusCharger !== 'CHARGING';
  });

  // Kritis >= 15 hari
  const criticalUnits = units.filter(u => {
    if (u.statusGadai === 'DITEBUS') return false;
    const fallbackMasuk = u.jatuhTempoAt ? u.jatuhTempoAt - 30 * 24 * 60 * 60 * 1000 : null;
    const daysAgo = getDaysSinceLastCharge(u.lastChargedAt, fallbackMasuk);
    return daysAgo >= 15;
  });

  // Unit bermasalah
  const defectUnits = units.filter(u => {
    if (u.statusGadai === 'DITEBUS') return false;
    const isDefectCond = u.kondisiBaterai && u.kondisiBaterai !== 'PRIMA';
    const isOverdueHeavy = getDaysSinceLastCharge(u.lastChargedAt) >= 60;
    return isDefectCond || isOverdueHeavy;
  });

  // Unit tanpa lokasi
  const noLocationUnits = units.filter(u => {
    if (u.statusGadai === 'DITEBUS') return false;
    return !u.lokasi || u.lokasi.trim() === '';
  });

  const petugastName = currentUser?.displayName || 'Petugas Gudang';
  const roleName = currentUser?.role === 'admin_gudang' ? 'Admin Gudang' : 'Petugas Operasional';

  let chargingDetails = 'Tidak ada unit sedang diisi daya';
  if (chargingUnits.length > 0) {
    chargingDetails = chargingUnits.map((u, i) => {
      const remainingMs = Math.max(0, (u.chargeEndAt || 0) - now.getTime());
      const min = Math.ceil(remainingMs / (1000 * 60));
      return `   • Slot #${i + 1}: #${u.kodeGadai} (${u.merkSepeda}) - sisa ~${min} mnt`;
    }).join('\n');
  }

  let defectDetails = '- Tidak ada unit terindikasi defect / aki drop.';
  if (defectUnits.length > 0) {
    defectDetails = defectUnits.slice(0, 5).map(u => {
      const label = u.kondisiBaterai !== 'PRIMA' ? u.kondisiBaterai : 'Telat >60 Hari';
      return `   • #${u.kodeGadai} (${u.merkSepeda}): ${label}`;
    }).join('\n');
    if (defectUnits.length > 5) {
      defectDetails += `\n   • ... dan ${defectUnits.length - 5} unit lainnya`;
    }
  }

  return `📋 *LAPORAN HARIAN SHIFT OPERASIONAL E-BIKE GADAI*
📅 ${dateStr} • ${timeStr}
⏱️ Shift: ${shiftName}
🏢 Lokasi: Gudang Pusat E-Bike Gadai

━━━━━━━━━━━━━━━━━━━━━━━━
📊 *RINGKASAN POPULASI FISIK GUDANG*
• *Total Fisik di Gudang*: ${fisikGudang} Unit
   ├ Unit Gadai Aktif: ${aktifUnits.length} Unit
   └ Unit Siap Lelang: ${lelangUnits.length} Unit
• Unit Sudah Ditebus: ${tebusUnits.length} Unit

⚡ *STATUS CHARGER & SIKLUS BATERAI*
• Sedang Di-charge: ${chargingUnits.length} Slot Terisi
${chargingDetails}
• Selesai Di-charge Hari Ini: ${finishedToday.length} Unit
• Dalam Antrian Prioritas: ${waitingUnits.length} Unit
• Kritis Belum Di-charge (≥15 Hari): ${criticalUnits.length} Unit

⚠️ *PERHATIAN & AUDIT KONDISI*
• Baterai Bermasalah / Aki Drop: ${defectUnits.length} Unit
${defectDetails}
• Unit Belum Ada Posisi Rak: ${noLocationUnits.length} Unit

━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Petugas Bertugas*: ${petugastName} (${roleName})
🟢 *Status Cloud*: Sinkronisasi Realtime Terhubung
_Laporan otomatis digenerate dari Aplikasi E-Bike Gadai Mobile._`;
}

/**
 * Copy formatted report to clipboard with fallback
 */
export async function copyWhatsAppReportToClipboard(units, currentUser) {
  const text = generateWhatsAppReport(units, currentUser);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const successful = document.execCommand('copy');
  document.body.removeChild(textArea);
  return successful;
}

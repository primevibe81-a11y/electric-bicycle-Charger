/**
 * Lock Screen Live Monitor Service for iPhone 13 (iOS Safari / PWA)
 * Uses navigator.mediaSession with auto-generated silent audio loop +
 * persistent Service Worker Notification tagged 'active-charger-slots'.
 */

import { getRemainingChargeTime } from './chargerQueue';

const NOTIFICATION_TAG = 'active-charger-slots';
let silentAudioElement = null;
let isMonitorActive = false;
let lastNotificationUpdate = 0;
let lastNotificationBody = '';
let serviceWorkerReg = null;

// Generate 0.5s silent PCM WAV data URI (in-memory, Rp 0, no network requests)
function generateSilentWavDataUri() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = 0.5;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');

  // fmt subchunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk (initialized with 0 = digital silence)
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Register service worker if supported
export async function initLockScreenServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    serviceWorkerReg = reg;
    return reg;
  } catch (err) {
    console.warn('Service Worker registration skipped/failed:', err);
    return null;
  }
}

// Request notification permission
export async function requestLockScreenNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, status: 'unsupported' };
  }
  try {
    const permission = await Notification.requestPermission();
    return { supported: true, status: permission };
  } catch (err) {
    return { supported: true, status: 'denied', error: err };
  }
}

// Get or initialize singleton silent audio element
function getSilentAudio() {
  if (!silentAudioElement && typeof window !== 'undefined') {
    const uri = generateSilentWavDataUri();
    silentAudioElement = new Audio(uri);
    silentAudioElement.loop = true;
    silentAudioElement.volume = 0.01; // Minimal non-zero volume keeps iOS audio daemon awake
    silentAudioElement.setAttribute('playsinline', 'true');
    silentAudioElement.setAttribute('webkit-playsinline', 'true');
  }
  return silentAudioElement;
}

/**
 * Format Slot #1 and Slot #2 representations for Lock Screen & MediaSession
 */
export function formatLockScreenSummary(chargingUnits = []) {
  const u1 = chargingUnits[0];
  const u2 = chargingUnits[1];

  let slot1Title = '🔌 S1: Siap Pakai';
  let slot1Detail = 'Slot #1: Kosong / Tersedia';
  let slot1Rem = '00:00:00';

  if (u1) {
    const rem1 = getRemainingChargeTime(u1.chargeEndAt, u1.chargeDurationMs);
    slot1Rem = rem1.formatted;
    slot1Title = `⚡ S1: #${u1.kodeGadai} (${rem1.formatted})`;
    slot1Detail = `Slot #1: #${u1.kodeGadai} (${rem1.formatted}) • Bat: ${u1.batteryLevel}%`;
  }

  let slot2Title = '🔌 S2: Siap Pakai';
  let slot2Detail = 'Slot #2: Kosong / Tersedia';
  let slot2Rem = '00:00:00';

  if (u2) {
    const rem2 = getRemainingChargeTime(u2.chargeEndAt, u2.chargeDurationMs);
    slot2Rem = rem2.formatted;
    slot2Title = `⚡ S2: #${u2.kodeGadai} (${rem2.formatted})`;
    slot2Detail = `Slot #2: #${u2.kodeGadai} (${rem2.formatted}) • Bat: ${u2.batteryLevel}%`;
  }

  let mediaTitle = slot1Title;
  let mediaArtist = `${slot2Title} • E-Bike Gadai`;

  // If there are more than 2 slots
  if (chargingUnits.length > 2) {
    mediaArtist += ` (+${chargingUnits.length - 2} unit lain)`;
  }

  // If 0 units are charging
  if (chargingUnits.length === 0) {
    mediaTitle = '🔌 Slot #1 & #2: Siap Pakai';
    mediaArtist = 'Antrean Charger Sepeda Listrik • Standby';
  }

  const notificationTitle = chargingUnits.length > 0
    ? `⚡ Antrean Charger: ${chargingUnits.length} Slot Aktif`
    : '🔌 Antrean Charger: Slot Siap Dipakai';

  const notificationBody = `${slot1Detail}\n${slot2Detail}${chargingUnits.length > 2 ? `\n(+${chargingUnits.length - 2} unit lainnya di slot tambahan)` : ''}`;

  return {
    u1,
    u2,
    slot1Title,
    slot1Detail,
    slot1Rem,
    slot2Title,
    slot2Detail,
    slot2Rem,
    mediaTitle,
    mediaArtist,
    notificationTitle,
    notificationBody,
    activeCount: chargingUnits.length
  };
}

/**
 * Start the Lock Screen Live Monitor
 * Must be triggered by a direct user tap/click to satisfy iOS Safari audio policy.
 */
export async function startLockScreenMonitor(chargingUnits = []) {
  try {
    await initLockScreenServiceWorker();

    // Check / ask notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    const audio = getSilentAudio();
    if (audio) {
      await audio.play();
    }

    isMonitorActive = true;

    // Setup Media Session actions
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (silentAudioElement) silentAudioElement.play();
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (silentAudioElement) silentAudioElement.play(); // Keep background alive
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        });
      } catch (e) {
        // Some browsers may throw on unsupported action handlers
      }
    }

    // Immediately push initial metadata & notification
    await updateLockScreenMonitor(chargingUnits, true);

    return { success: true };
  } catch (err) {
    console.error('Failed to start Lock Screen Live Monitor:', err);
    isMonitorActive = false;
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Update the Lock Screen Live Monitor metadata & persistent notification
 * Called every second in the dashboard render loop.
 */
export async function updateLockScreenMonitor(chargingUnits = [], forceNotification = false) {
  if (!isMonitorActive) return;

  const summary = formatLockScreenSummary(chargingUnits);

  // 1. Update MediaSession metadata (Lock Screen Now Playing / Dynamic Island)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: summary.mediaTitle,
        artist: summary.mediaArtist,
        album: `Live Monitor Antrean Charger (${summary.activeCount} Slot Aktif)`,
        artwork: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/vite.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {
      console.warn('Error updating MediaMetadata:', e);
    }
  }

  // 2. Update persistent Service Worker Notification (tag: 'active-charger-slots')
  // Rate-limit notifications to once every 15s or when content changes to prevent iOS throttling
  const now = Date.now();
  const shouldNotify = forceNotification ||
    (now - lastNotificationUpdate >= 15000) ||
    (lastNotificationBody !== summary.notificationBody);

  if (shouldNotify && 'Notification' in window && Notification.permission === 'granted') {
    lastNotificationUpdate = now;
    lastNotificationBody = summary.notificationBody;

    try {
      if ('serviceWorker' in navigator) {
        const reg = serviceWorkerReg || (await navigator.serviceWorker.ready);
        if (reg && reg.showNotification) {
          await reg.showNotification(summary.notificationTitle, {
            body: summary.notificationBody,
            tag: NOTIFICATION_TAG,
            renotify: false,
            icon: '/vite.svg',
            badge: '/vite.svg',
            silent: true
          });
        }
      }
    } catch (e) {
      console.warn('Error updating Lock Screen Notification:', e);
    }
  }
}

/**
 * Stop the Lock Screen Live Monitor
 */
export async function stopLockScreenMonitor() {
  try {
    isMonitorActive = false;

    if (silentAudioElement) {
      silentAudioElement.pause();
      silentAudioElement.currentTime = 0;
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
      // Clear metadata
      navigator.mediaSession.metadata = null;
    }

    // Close persistent notification
    if ('serviceWorker' in navigator) {
      try {
        const reg = serviceWorkerReg || (await navigator.serviceWorker.ready);
        if (reg && reg.getNotifications) {
          const notifications = await reg.getNotifications({ tag: NOTIFICATION_TAG });
          notifications.forEach(n => n.close());
        }
      } catch (e) {
        console.warn('Error closing notification:', e);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Error stopping Lock Screen Live Monitor:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Check if the monitor is currently running
 */
export function getIsLockScreenMonitorActive() {
  return isMonitorActive;
}

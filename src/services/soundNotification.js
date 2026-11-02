/**
 * Web Audio API Synthesizer - Melodious chime for iPhone 13 / browser
 * Rp 0 and no external mp3 files required!
 */
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major arpeggio)
    const now = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + index * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.65);
    });
  } catch (err) {
    console.warn("AudioContext error:", err);
  }
}

/**
 * Short gentle beep for queue reordering or quick action
 */
export function playGentleBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio restrictions
  }
}

/**
 * Request notification permission for iPhone 13 (iOS Safari / PWA)
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { supported: false, status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { supported: true, status: permission };
  } catch (err) {
    return { supported: true, status: 'denied', error: err };
  }
}

/**
 * Send a native notification if granted
 */
export function sendNativeNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200],
        ...options,
      });
    } catch (e) {
      console.warn("Native notification dispatch error:", e);
    }
  }
}

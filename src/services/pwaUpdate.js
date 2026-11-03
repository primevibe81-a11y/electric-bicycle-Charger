/**
 * PWA Update Detection Service
 * Monitors Service Worker lifecycle and version.json to alert user when an update is deployed.
 */

let activeRegistration = null;
let currentAppVersion = null;
let hasNotifiedUpdate = false;

/**
 * Fetch local version.json without cache
 */
async function fetchCurrentVersion() {
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Trigger update notification callback safely
 */
function triggerUpdate(callback, updateInfo) {
  if (hasNotifiedUpdate) return;
  hasNotifiedUpdate = true;
  if (typeof callback === 'function') {
    callback(updateInfo);
  }
}

/**
 * Initialize PWA Update Checker
 * @param {Function} onUpdateAvailable - Called when an application update is detected
 */
export async function initPwaUpdateChecker(onUpdateAvailable) {
  if (typeof window === 'undefined') return () => {};

  // 1. Initial version check to establish baseline
  const initialInfo = await fetchCurrentVersion();
  if (initialInfo) {
    currentAppVersion = initialInfo.buildTime || initialInfo.version;
  }

  // 2. Service Worker Lifecycle Monitoring
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        activeRegistration = reg;

        // A. If a worker is already waiting, an update is ready!
        if (reg.waiting && navigator.serviceWorker.controller) {
          triggerUpdate(onUpdateAvailable, { type: 'sw-waiting', message: 'Versi baru siap dipasang.' });
        }

        // B. Listen for new workers being installed
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                triggerUpdate(onUpdateAvailable, { type: 'sw-installed', message: 'Pembaruan aplikasi telah diunduh.' });
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn('Error hooking SW update:', e);
    }
  }

  // 3. Periodic polling check (checks both SW update and version.json)
  const checkForUpdates = async () => {
    // Check Service Worker
    if ('serviceWorker' in navigator && activeRegistration) {
      try {
        await activeRegistration.update();
      } catch (e) {}
    }

    // Check version.json
    const latestInfo = await fetchCurrentVersion();
    if (latestInfo && currentAppVersion) {
      const latestVer = latestInfo.buildTime || latestInfo.version;
      if (latestVer !== currentAppVersion) {
        triggerUpdate(onUpdateAvailable, {
          type: 'version-mismatch',
          message: 'Versi aplikasi baru telah terdeteksi di server.',
          newVersion: latestInfo.version
        });
      }
    }
  };

  // Poll every 45 seconds
  const intervalId = setInterval(checkForUpdates, 45 * 1000);

  // Check whenever user returns to the tab/app
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  };

  const handleWindowFocus = () => {
    checkForUpdates();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleWindowFocus);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
  };
}

/**
 * Apply the update: trigger SW skipWaiting and hard-reload page
 */
export async function applyPwaUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = activeRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (reg.active) {
          reg.active.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  } catch (err) {
    console.warn('Error sending skipWaiting:', err);
  }

  // Small delay to let SW activate then hard-reload
  setTimeout(() => {
    window.location.reload();
  }, 100);
}

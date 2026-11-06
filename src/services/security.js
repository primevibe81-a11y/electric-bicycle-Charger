/**
 * Central Security, Cryptography, & Anti-Abuse Service
 * Antrean Charger Sepeda Listrik & Gadai
 *
 * Implements:
 * 1. SHA-256 PIN Hashing with Salt via Web Crypto API (crypto.subtle)
 * 2. Rate Limiting & Brute-Force Lockout Protection (Max 5 attempts, 300s lockout)
 * 3. File Upload Safety Validation (.xlsx/.xls only, Max 5MB limit)
 * 4. Input Sanitization & Anti-XSS (Strips HTML tags, script vectors, and prototype pollution)
 * 5. Security Incident Audit Logging
 */

export const AUTH_SALT = 'ebike_gadai_salt_2026_';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 menit (300 detik)
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const RATE_LIMIT_STORAGE_KEY = 'ebike_auth_rate_limit';
const SECURITY_LOGS_STORAGE_KEY = 'ebike_security_audit_logs';

/**
 * 1. SHA-256 Hash PIN with Salt using Web Crypto API
 * Produces deterministic 64-character hex digest.
 */
export async function hashPinWithSalt(pin, salt = AUTH_SALT) {
  const cleanPin = String(pin || '').trim();
  const cleanSalt = String(salt || '');
  const dataToHash = cleanSalt + cleanPin;

  // Browser / Node Web Crypto API
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToHash);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for environment where subtle is unavailable (synchronous approximation / dev)
  let hash = 0;
  for (let i = 0; i < dataToHash.length; i++) {
    const char = dataToHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(Math.abs(hash)).padStart(64, '0');
}

/**
 * 2. Rate Limiting & Brute-Force Lockout Protection
 */
function getRateLimitState() {
  if (typeof localStorage === 'undefined') {
    return { failCount: 0, lockedUntil: 0 };
  }
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return { failCount: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      failCount: Number(parsed.failCount) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0
    };
  } catch {
    return { failCount: 0, lockedUntil: 0 };
  }
}

function saveRateLimitState(state) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // LocalStorage quota or restricted
  }
}

/**
 * Cek status apakah login saat ini sedang dikunci karena brute-force
 */
export function checkLoginLockout() {
  const state = getRateLimitState();
  const now = Date.now();

  if (state.lockedUntil && state.lockedUntil > now) {
    const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      remainingAttempts: 0,
      failCount: state.failCount
    };
  }

  // Jika waktu lockout sudah habis, reset kunci
  if (state.lockedUntil && state.lockedUntil <= now) {
    saveRateLimitState({ failCount: 0, lockedUntil: 0 });
    return {
      isLocked: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_LOGIN_ATTEMPTS,
      failCount: 0
    };
  }

  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - state.failCount);
  return {
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts,
    failCount: state.failCount
  };
}

/**
 * Catat percobaan login gagal dan picu lockout jika >= 5 kali
 */
export function recordFailedLogin(username = 'unknown') {
  const state = getRateLimitState();
  const newFailCount = state.failCount + 1;
  const now = Date.now();

  let lockedUntil = 0;
  let isLocked = false;

  if (newFailCount >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_DURATION_MS;
    isLocked = true;
    logSecurityEvent('BRUTE_FORCE_LOCKOUT_TRIGGERED', {
      username,
      failCount: newFailCount,
      lockDurationSeconds: LOCKOUT_DURATION_MS / 1000,
      timestamp: now
    });
  } else {
    logSecurityEvent('LOGIN_FAILED', {
      username,
      attemptNumber: newFailCount,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - newFailCount,
      timestamp: now
    });
  }

  saveRateLimitState({ failCount: newFailCount, lockedUntil });

  return {
    isLocked,
    failCount: newFailCount,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - newFailCount),
    remainingSeconds: isLocked ? Math.ceil(LOCKOUT_DURATION_MS / 1000) : 0
  };
}

/**
 * Catat percobaan login berhasil dan bersihkan riwayat kegagalan
 */
export function recordSuccessfulLogin(username = 'unknown') {
  saveRateLimitState({ failCount: 0, lockedUntil: 0 });
  logSecurityEvent('LOGIN_SUCCESS', {
    username,
    timestamp: Date.now()
  });
}

/**
 * Catat audit event keamanan ke penyimpanan lokal
 */
export function logSecurityEvent(type, payload = {}) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const event = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      ...payload,
      createdAt: new Date().toISOString()
    };
    // Batasi log maksimal 100 entri terakhir
    const updated = [event, ...logs].slice(0, 100);
    localStorage.setItem(SECURITY_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // LocalStorage full
  }
}

/**
 * Ambil riwayat log aktivitas keamanan
 */
export function getSecurityAuditLogs() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 3. Validasi Unggahan File Excel (.xlsx / .xls dan Maksimal 5 MB)
 */
export function validateSpreadsheetFile(file) {
  if (!file) {
    return { valid: false, message: 'File tidak ditemukan.' };
  }

  // 1. Validasi Ukuran (Maksimal 5 MB)
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      message: `Ukuran file (${sizeMb} MB) melebihi batas maksimal yang diizinkan (5 MB). Harap unggah file yang lebih kecil untuk mencegah kehabisan memori.`
    };
  }

  // 2. Validasi Ekstensi File
  const fileName = String(file.name || '').toLowerCase();
  const hasValidExt = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (!hasValidExt) {
    return {
      valid: false,
      message: 'Format file tidak diizinkan. Hanya file spreadsheet Excel (.xlsx atau .xls) yang diperbolehkan.'
    };
  }

  // 3. Validasi MIME Type jika tersedia
  const fileType = String(file.type || '').toLowerCase();
  const validMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/wps-office.xlsx',
    'application/wps-office.xls',
    'application/x-excel',
    'application/excel',
    'application/octet-stream', // Sering dihasilkan oleh browser mobile WebKit
    '' // Fallback jika browser tidak mengisi MIME
  ];

  if (fileType && !validMimes.includes(fileType)) {
    return {
      valid: false,
      message: `MIME type file (${fileType}) tidak cocok dengan dokumen spreadsheet resmi.`
    };
  }

  return { valid: true };
}

/**
 * 4. Input Sanitization & Anti-XSS
 * Membersihkan karakter berbahaya (<, >, javascript:, onerror=, data:, dll.)
 * dan melindungi dari Prototype Pollution (__proto__, constructor).
 */
export function sanitizeText(input) {
  if (input === null || input === undefined) return '';
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);

  let clean = String(input);

  // Hapus karakter null byte
  clean = clean.replace(/\0/g, '');

  // Hapus blok <script>...</script> beserta seluruh isinya
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Hapus blok <style>...</style> beserta isinya
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Netralkan HTML Tags yang tersisa
  clean = clean.replace(/<[^>]*>?/gm, '');

  // Netralkan entitas script dan protocol handlers berbahaya
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');

  // Netralkan event handler injection (onerror=, onload=, onclick=, onmouseover=)
  clean = clean.replace(/on\w+\s*=/gi, '');

  // Netralkan karakter < dan > yang mungkin lolos
  clean = clean.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return clean.trim();
}

/**
 * Sanitasi rekursif untuk seluruh properti objek
 * Mencegah Prototype Pollution attacks
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const cleanObj = {};
  for (const [key, value] of Object.entries(obj)) {
    // Lindungi dari prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const cleanKey = sanitizeText(key);
    cleanObj[cleanKey] = typeof value === 'object' && value !== null
      ? sanitizeObject(value)
      : sanitizeText(value);
  }
  return cleanObj;
}

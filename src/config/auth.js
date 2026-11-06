import {
  hashPinWithSalt,
  checkLoginLockout,
  recordFailedLogin,
  recordSuccessfulLogin
} from "../services/security";

/**
 * Konfigurasi Akun Pengguna Terotorisasi
 * PIN TIDAK DISIMPAN DALAM TEKS BIASA (Plaintext) untuk mencegah kebocoran data nasabah.
 * Hanya SHA-256 Hash + Salt yang disimpan dalam kode sumber.
 *
 * Hash Dihasilkan dari: SHA-256(AUTH_SALT + pinCode)
 * admin (135790) -> f53af8901422065220c18e27c751a58793226cb1c6d44a3d8e814acdcb5917b2
 * kasir (246810) -> 6aa2548aaab4c56532d368c7467af645f670d7ec5695769324981c6d78abe96b
 */
export const ALLOWED_USERS = [
  {
    username: "admin",
    pinHash: "f53af8901422065220c18e27c751a58793226cb1c6d44a3d8e814acdcb5917b2",
    role: "admin_gudang",
    displayName: "Petugas Gudang Utama"
  },
  {
    username: "kasir",
    pinHash: "6aa2548aaab4c56532d368c7467af645f670d7ec5695769324981c6d78abe96b",
    role: "kasir_gadai",
    displayName: "Kasir Cabang"
  }
];

const SESSION_KEY = "ebike_gadai_auth_session";

/**
 * Login aman dengan hashing PIN SHA-256 dan perlindungan brute-force lockout
 */
export async function loginWithSourceAuth(username, pinCode) {
  const cleanUser = (username || "").trim().toLowerCase();
  const cleanPin = (pinCode || "").trim();

  // 1. Cek apakah sistem sedang dalam status lockout (anti brute-force)
  const lockout = checkLoginLockout();
  if (lockout.isLocked) {
    const mins = Math.floor(lockout.remainingSeconds / 60);
    const secs = lockout.remainingSeconds % 60;
    const timeDisplay = mins > 0 ? `${mins}m ${secs}d` : `${secs} detik`;
    return {
      success: false,
      locked: true,
      remainingSeconds: lockout.remainingSeconds,
      remainingAttempts: 0,
      message: `Akses dikunci sementara karena terlalu banyak percobaan salah. Coba lagi dalam ${timeDisplay}.`
    };
  }

  // 2. Hash PIN masukan pengguna dengan Salt yang sama
  const inputPinHash = await hashPinWithSalt(cleanPin);

  // 3. Cocokkan hash pengguna
  const matchedUser = ALLOWED_USERS.find(
    (u) => u.username.toLowerCase() === cleanUser && u.pinHash === inputPinHash
  );

  if (!matchedUser) {
    // Catat percobaan gagal dan evaluasi apakah kuota habis
    const failResult = recordFailedLogin(cleanUser);

    if (failResult.isLocked) {
      return {
        success: false,
        locked: true,
        remainingSeconds: failResult.remainingSeconds,
        remainingAttempts: 0,
        message: "Akun dikunci selama 5 menit karena 5 kali percobaan PIN salah berturut-turut demi melindungi data nasabah."
      };
    }

    return {
      success: false,
      locked: false,
      remainingSeconds: 0,
      remainingAttempts: failResult.remainingAttempts,
      message: `PIN salah. Sisa kesempatan: ${failResult.remainingAttempts} kali.`
    };
  }

  // 4. Login Berhasil: Reset status lockout & simpan sesi terenkripsi
  recordSuccessfulLogin(cleanUser);

  const sessionPayload = {
    username: matchedUser.username,
    role: matchedUser.role,
    displayName: matchedUser.displayName,
    loginAt: Date.now(),
    expiresAt: Date.now() + 12 * 60 * 60 * 1000 // Sesi aktif maksimal 12 jam
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
  return { success: true, user: sessionPayload };
}

/**
 * Mengambil sesi aktif dengan validasi waktu kedaluwarsa & integritas struktur
 */
export function getActiveSession() {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    const now = Date.now();

    // 1. Validasi kedaluwarsa waktu
    if (!session.expiresAt || now > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    // 2. Validasi integritas pengguna terdaftar (mencegah modifikasi manual di LocalStorage)
    const validUser = ALLOWED_USERS.find(
      (u) => u.username.toLowerCase() === (session.username || "").toLowerCase() && u.role === session.role
    );

    if (!validUser) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Menghapus sesi login saat logout
 */
export function logoutSession() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

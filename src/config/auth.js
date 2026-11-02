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
  const cleanUser = (username || "").trim().toLowerCase();
  const cleanPin = (pinCode || "").trim();

  const matchedUser = ALLOWED_USERS.find(
    (u) => u.username.toLowerCase() === cleanUser && u.pinCode === cleanPin
  );

  if (!matchedUser) {
    return { success: false, message: "Username atau PIN 6 digit salah." };
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

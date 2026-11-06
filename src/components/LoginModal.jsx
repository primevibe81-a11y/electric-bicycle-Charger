import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { ALLOWED_USERS, loginWithSourceAuth } from '../config/auth';

export default function LoginModal({ onLoginSuccess }) {
  const [selectedUser, setSelectedUser] = useState("admin");
  const [pinCode, setPinCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!pinCode || pinCode.length < 6) {
      setErrorMsg("Masukkan 6 digit PIN akun Anda.");
      return;
    }

    const result = loginWithSourceAuth(selectedUser, pinCode);
    if (result.success) {
      setErrorMsg("");
      onLoginSuccess(result.user);
    } else {
      setErrorMsg(result.message);
    }
  };

  const handleQuickLogin = (username, pin) => {
    setSelectedUser(username);
    setPinCode(pin);
    const result = loginWithSourceAuth(username, pin);
    if (result.success) {
      onLoginSuccess(result.user);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-[370px] bg-white dark:bg-[#151C28] text-slate-900 dark:text-slate-100 rounded-3xl p-6 shadow-2xl border border-sky-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-sky-400 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md shadow-sky-200 dark:shadow-none mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Masuk Petugas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sistem Antrean Charger & Gadai Sepeda Listrik
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab Pilih Akun */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => { setSelectedUser("admin"); setPinCode(""); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              selectedUser === "admin"
                ? "bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedUser("kasir"); setPinCode(""); }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              selectedUser === "kasir"
                ? "bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Kasir</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              PIN Keamanan (6 Digit)
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 135790"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#111722] border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-center tracking-widest text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-[#111722]"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold rounded-2xl shadow-md shadow-sky-200 dark:shadow-none hover:from-sky-600 hover:to-sky-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Buka Aplikasi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 text-center mb-2 font-medium">
            Akses Cepat Pengujian:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickLogin("admin", "135790")}
              className="flex-1 py-1.5 px-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-xl text-[11px] font-semibold border border-sky-100 dark:border-sky-900/40 active:scale-95 transition-all text-center"
            >
              🔑 Admin (135790)
            </button>
            <button
              onClick={() => handleQuickLogin("kasir", "246810")}
              className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-semibold border border-emerald-100 dark:border-emerald-900/40 active:scale-95 transition-all text-center"
            >
              🔑 Kasir (246810)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

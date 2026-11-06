import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { logSecurityEvent } from '../services/security';

/**
 * Mobile-First Error Boundary with Security Shielding
 * - Mencegah layar blank putih jika terjadi runtime crash.
 * - Pada mode Production: menyembunyikan raw error stack/variabel internal agar tidak bocor ke publik,
 *   dan menampilkan Kode Insiden Referensi Keamanan (incident reference code).
 * - Mendukung tema Dark Mode secara penuh.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      incidentCode: null
    };
  }

  static getDerivedStateFromError(error) {
    const code = `REF-SEC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return { hasError: true, error, incidentCode: code };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });

    try {
      logSecurityEvent('UNHANDLED_UI_CRASH', {
        incidentCode: this.state.incidentCode,
        errorMessage: String(error?.message || error),
        componentStack: String(errorInfo?.componentStack || '').slice(0, 300)
      });
    } catch (e) {
      // LocalStorage or logging fallback
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, incidentCode: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isProd = import.meta.env.PROD;

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-slate-900 dark:text-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mb-4 shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
            Terjadi Kendala pada Halaman
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1.5 leading-relaxed">
            Halaman mengalami gangguan sementara. Data transaksi Anda tetap tersimpan aman di sistem offline gudang.
          </p>

          {/* Incident Code / Error Shielding */}
          {isProd ? (
            <div className="w-full max-w-xs my-4 p-3 bg-slate-100 dark:bg-[#151C28] rounded-2xl border border-slate-200 dark:border-slate-800 text-center font-mono">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-500" />
                <span>Referensi Insiden Keamanan</span>
              </div>
              <span className="font-extrabold text-xs text-sky-700 dark:text-sky-400 select-all">
                {this.state.incidentCode || 'REF-SEC-PROTECTED'}
              </span>
            </div>
          ) : (
            this.state.error && (
              <div className="w-full max-w-xs my-4 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-left font-mono text-[11px] text-slate-700 dark:text-slate-200 overflow-x-auto select-all">
                {String(this.state.error.message || this.state.error)}
              </div>
            )
          )}

          {/* Tombol Aksi */}
          <div className="w-full max-w-xs flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 pressable"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Kembali ke Dashboard</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full h-11 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors flex items-center justify-center gap-2 pressable"
            >
              <RefreshCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

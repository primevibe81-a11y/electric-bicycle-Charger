import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

/**
 * Mobile-First Error Boundary
 * Mencegah layar blank putih jika terjadi kesalahan JavaScript runtime pada halaman atau komponen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
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
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-base font-extrabold text-slate-900 leading-snug">
            Terjadi Kendala pada Halaman
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
            Halaman mengalami gangguan sementara. Anda dapat memuat ulang halaman ini atau kembali ke menu Dashboard.
          </p>

          {/* Error Message Snippet (Untuk Mempermudah Identifikasi Masalah) */}
          {this.state.error && (
            <div className="w-full max-w-xs my-4 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-left font-mono text-[11px] text-slate-700 overflow-x-auto select-all">
              {String(this.state.error.message || this.state.error)}
            </div>
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
              className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-2 pressable"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

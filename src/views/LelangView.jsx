import React, { useState } from 'react';
import {
  Gavel,
  Zap,
  Tag,
  DollarSign,
  User,
  CheckCircle2,
  AlertCircle,
  History,
  XCircle,
  Calendar,
  Search,
  X
} from 'lucide-react';
import BatteryIndicator from '../components/BatteryIndicator';
import BatteryConditionBadge from '../components/BatteryConditionBadge';
import ChargeAuditBadge from '../components/ChargeAuditBadge';
import { enqueueUnitForCharging, markLelangSold } from '../services/storage';

export default function LelangView({ units, onNotify }) {
  const [selectedUnitForSale, setSelectedUnitForSale] = useState(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [buyerInfo, setBuyerInfo] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("available"); // 'available' | 'sold'
  const [searchQuery, setSearchQuery] = useState("");

  const lelangUnits = units.filter(u => u.statusBarang === 'LELANG');
  const soldUnits = units.filter(u => u.statusBarang === 'TERJUAL_LELANG');

  const q = searchQuery.toLowerCase().trim();

  // Filter pencarian untuk tab Siap Lelang
  const filteredLelangUnits = lelangUnits.filter(u => {
    if (!q) return true;
    return (
      (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
      (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
      (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
      (u.catatanBaterai && u.catatanBaterai.toLowerCase().includes(q))
    );
  });

  // Filter pencarian untuk tab Riwayat Terjual
  const filteredSoldUnits = soldUnits.filter(u => {
    if (!q) return true;
    return (
      (u.kodeGadai && u.kodeGadai.toLowerCase().includes(q)) ||
      (u.merkSepeda && u.merkSepeda.toLowerCase().includes(q)) ||
      (u.namaNasabah && u.namaNasabah.toLowerCase().includes(q)) ||
      (u.buyerInfo && u.buyerInfo.toLowerCase().includes(q))
    );
  });

  const handleChargeLelangUnit = (unit) => {
    const res = enqueueUnitForCharging(unit.id, unit.batteryLevel);
    if (res.success) {
      onNotify({
        title: "Perawatan Baterai Lelang",
        message: `Unit lelang #${unit.kodeGadai} berhasil masuk antrian charger!`,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Masuk Antrian",
        message: res.message,
        type: "warning"
      });
    }
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitForSale) return;

    const res = markLelangSold(selectedUnitForSale.id, soldPrice, buyerInfo);
    if (res.success) {
      setSelectedUnitForSale(null);
      setSoldPrice("");
      setBuyerInfo("");
      onNotify({
        title: "Lelang Terjual!",
        message: res.message,
        type: "success"
      });
    } else {
      onNotify({
        title: "Gagal Mencatat",
        message: res.message,
        type: "warning"
      });
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-slate-900">Manajemen Unit Lelang</h2>
        <p className="text-xs text-slate-500">Unit jatuh tempo siap lelang & perawatan baterai berkala</p>
      </div>

      {/* Sub Tabs: Siap Lelang vs Terjual */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-2xl">
        <button
          onClick={() => setActiveSubTab("available")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "available"
              ? "bg-white text-purple-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Gavel className="w-4 h-4 text-purple-600" />
          <span>Siap Lelang ({lelangUnits.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("sold")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === "sold"
              ? "bg-white text-purple-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Terjual ({soldUnits.length})</span>
        </button>
      </div>

      {/* Input Pencarian Menu Lelang */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeSubTab === "available"
              ? "Cari nomor gadai / merk / nasabah lelang..."
              : "Cari nomor gadai / pembeli / keterangan..."
          }
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            title="Hapus pencarian"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info status filter pencarian */}
      {searchQuery && (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
          <span>
            Hasil pencarian "<strong>{searchQuery}</strong>":{" "}
            <strong className="text-purple-700 font-bold">
              {activeSubTab === "available" ? filteredLelangUnits.length : filteredSoldUnits.length} unit
            </strong>
          </span>
          <button
            onClick={() => setSearchQuery("")}
            className="text-purple-600 hover:text-purple-800 font-bold text-xs"
          >
            Reset
          </button>
        </div>
      )}

      {activeSubTab === "available" ? (
        <div className="space-y-3">
          {lelangUnits.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
              Tidak ada unit sepeda listrik yang berada dalam daftar lelang.
            </div>
          ) : filteredLelangUnits.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
              <p>Tidak ditemukan unit lelang dengan kata kunci "<strong>{searchQuery}</strong>".</p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs hover:bg-purple-100"
              >
                Tampilkan Semua ({lelangUnits.length} Unit)
              </button>
            </div>
          ) : (
            filteredLelangUnits.map((unit) => {
              const isCharging = unit.statusCharger === 'CHARGING';
              const isWaiting = unit.statusCharger === 'WAITING';

              return (
                <div
                  key={unit.id}
                  className="bg-white/95 rounded-2xl p-4 border border-purple-100 shadow-xs hover:border-purple-200 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          #{unit.kodeGadai}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Siap Lelang
                        </span>
                        {isCharging && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-700 animate-pulse">
                            ⚡ Di-Charge
                          </span>
                        )}
                        {isWaiting && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700">
                            Antrian
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{unit.merkSepeda}</h4>
                      <p className="text-[11px] text-slate-500">Nasabah asal: {unit.namaNasabah}</p>
                      
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <BatteryConditionBadge condition={unit.kondisiBaterai || 'PRIMA'} />
                        <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} />
                      </div>
                    </div>

                    <BatteryIndicator level={unit.batteryLevel} isCharging={isCharging} size="sm" />
                  </div>

                  {/* Banner Peringatan Kritis Jika > 14 Hari Belum Di-charge */}
                  <div className="mt-2.5">
                    <ChargeAuditBadge lastChargedAt={unit.lastChargedAt} showFullAlert={true} />
                  </div>

                  {/* Estimasi Harga */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Estimasi Nilai Lelang:</span>
                    <span className="font-extrabold text-purple-700">
                      {formatRupiah(unit.hargaLelang || 2500000)}
                    </span>
                  </div>

                  {/* Actions: Rawat Baterai & Catat Terjual */}
                  <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleChargeLelangUnit(unit)}
                      disabled={isCharging || isWaiting}
                      className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isCharging || isWaiting
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 active:scale-95"
                      }`}
                      title="Perawatan baterai agar tidak drop"
                    >
                      <Zap className="w-3.5 h-3.5 text-sky-600" />
                      <span>{isCharging ? "Sedang Diisi" : isWaiting ? "Dalam Antrian" : "Rawat Baterai"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedUnitForSale(unit);
                        setSoldPrice(String(unit.hargaLelang || 2500000));
                      }}
                      className="h-9 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Catat Terjual</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TAB RIWAYAT TERJUAL LELANG */
        <div className="space-y-2.5">
          {soldUnits.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
              Belum ada unit lelang yang terjual.
            </div>
          ) : filteredSoldUnits.length === 0 ? (
            <div className="bg-white/80 rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200 space-y-2">
              <p>Tidak ditemukan riwayat lelang dengan kata kunci "<strong>{searchQuery}</strong>".</p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs hover:bg-purple-100"
              >
                Tampilkan Semua ({soldUnits.length} Unit)
              </button>
            </div>
          ) : (
            filteredSoldUnits.map((unit) => {
              const soldDate = unit.soldAt
                ? new Date(unit.soldAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : "-";

              return (
                <div
                  key={unit.id}
                  className="bg-white/90 rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">#{unit.kodeGadai}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                        Terjual
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">{unit.merkSepeda}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pembeli: {unit.buyerInfo || "-"} • {soldDate}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600">
                      {formatRupiah(unit.soldPrice)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL CATAT TERJUAL LELANG */}
      {selectedUnitForSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[390px] bg-white rounded-3xl p-5 shadow-2xl border border-purple-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Catat Penjualan Lelang</h3>
                  <p className="text-[11px] text-slate-400">Unit #{selectedUnitForSale.kodeGadai}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitForSale(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal Laku Terjual (Rp)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="Contoh: 2800000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Pembeli & Keterangan
                </label>
                <input
                  type="text"
                  required
                  value={buyerInfo}
                  onChange={(e) => setBuyerInfo(e.target.value)}
                  placeholder="Contoh: Pak Herman (0812xxxx) / Kuitansi L-09"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnitForSale(null)}
                  className="flex-1 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 hover:bg-purple-700"
                >
                  Simpan Penjualan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

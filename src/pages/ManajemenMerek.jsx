import { useState, useEffect, useCallback } from "react";
import {
  FiToggleLeft,
  FiToggleRight,
  FiCheck,
  FiX,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiInfo,
} from "react-icons/fi";
import { getUserRole } from "../config/aiConfig.js";
import { supabase } from "../supabaseClient.js";

const NORMALIZE_KEBALIK = { "TANPA MEREK": "Tanpa Merek (kosong)" };

function normalizeMerek(merek) {
  if (merek === null || merek === undefined) return "TANPA MEREK";
  const trimmed = merek.trim();
  if (trimmed === "" || trimmed === "-") return "TANPA MEREK";
  return trimmed;
}

function labelMerek(merek) {
  return NORMALIZE_KEBALIK[merek] || merek;
}

export default function ManajemenMerek() {
  const [mereks, setMereks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchMereks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("merek");

      if (productError) throw productError;

      const uniqueMereks = [
        ...new Set((productData || []).map(p => normalizeMerek(p.merek))),
      ].sort();

      // Ambil SEMUA baris product_mereks
      const { data: merekData, error: merekError } = await supabase
        .from("product_mereks")
        .select("merek, is_active");
      if (merekError) throw merekError;

      const statusMap = new Map();
      (merekData || []).forEach(row => statusMap.set(row.merek, row.is_active));

      const merged = uniqueMereks.map(merek => ({
        merek,
        is_active: statusMap.has(merek) ? statusMap.get(merek) : true,
      }));

      // Seed merek yang belum terdaftar (default aktif)
      const missing = merged.filter(m => !statusMap.has(m.merek));
      if (missing.length > 0) {
        const { error: upsertError } = await supabase
          .from("product_mereks")
          .upsert(
            missing.map(m => ({
              merek: m.merek,
              is_active: true,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "merek" }
          );
        if (upsertError) console.error("Gagal seed merek baru:", upsertError.message);
      }

      setMereks(merged);
    } catch (err) {
      console.error("Failed to load mereks:", err);
      setSaveMsg({ type: "error", text: `Gagal memuat data: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const role = await getUserRole();
      setUserRole(role);
      if (role !== "admin" && role !== "owner") {
        setLoading(false);
        return;
      }
      fetchMereks();
    };
    init();
  }, [fetchMereks]);

  const handleToggle = useCallback(async (merek, currentStatus) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from("product_mereks")
        .upsert(
          { merek, is_active: newStatus, updated_at: new Date().toISOString() },
          { onConflict: "merek" }
        );

      if (error) throw error;

      setMereks(prev =>
        prev.map(m =>
          m.merek === merek ? { ...m, is_active: newStatus } : m
        )
      );
      setSaveMsg({
        type: "success",
        text: `Merek "${labelMerek(merek)}" berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`,
      });
    } catch (err) {
      setSaveMsg({ type: "error", text: `Gagal menyimpan: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleBulkToggle = useCallback(async (newStatus) => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const rows = Array.from(selectedIds).map(merek => ({
        merek,
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("product_mereks")
        .upsert(rows, { onConflict: "merek" });

      if (error) throw error;

      setMereks(prev =>
        prev.map(m =>
          selectedIds.has(m.merek) ? { ...m, is_active: newStatus } : m
        )
      );

      setSaveMsg({
        type: "success",
        text: `${selectedIds.size} merek berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`,
      });
      setSelectedIds(new Set());
    } catch (err) {
      setSaveMsg({ type: "error", text: `Gagal menyimpan massal: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }, [selectedIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === mereks.length) {
        return new Set();
      }
      return new Set(mereks.map(m => m.merek));
    });
  }, [mereks]);

  const toggleSelect = useCallback((merek) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(merek)) {
        next.delete(merek);
      } else {
        next.add(merek);
      }
      return next;
    });
  }, []);

  if (userRole !== "admin" && userRole !== "owner" && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FiAlertCircle className="text-red-400 mb-3" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-500 text-sm">
          Hanya role <span className="font-semibold">admin</span> atau{" "}
          <span className="font-semibold">owner</span> yang dapat mengakses halaman ini.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-orange-500" size={32} />
        <span className="ml-3 text-slate-600 font-medium">Memuat merek...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Merek Onderdil</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola merek produk yang muncul di halaman Onderdil & Aksesoris
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">Cara Kerja</p>
          <p>
            Merek yang <span className="font-semibold">Aktif</span> akan muncul di halaman{" "}
            <span className="font-semibold">/onderdil</span>. Nonaktifkan merek untuk
            menyembunyikannya dari pelanggan. Produk dengan merek kosong dikelompokkan
            sebagai <span className="font-semibold">Tanpa Merek</span>.
          </p>
        </div>
      </div>

      {saveMsg && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
            saveMsg.type === "success"
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {saveMsg.type === "success" ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {saveMsg.text}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-sm text-slate-600 font-medium">
            {selectedIds.size} merek dipilih
          </span>
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
          >
            <FiCheck size={16} />
            Aktifkan yang dipilih
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            <FiX size={16} />
            Nonaktifkan yang dipilih
          </button>
        </div>
      )}

      {/* Merek Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={mereks.length > 0 && selectedIds.size === mereks.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                Merek
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                Status
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {mereks.map((row) => (
              <tr
                key={row.merek}
                className="border-b last:border-b-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.merek)}
                    onChange={() => toggleSelect(row.merek)}
                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                </td>
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-800">{labelMerek(row.merek)}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      row.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleToggle(row.merek, row.is_active)}
                    disabled={saving}
                    className={`p-2 rounded-lg transition-colors ${
                      row.is_active
                        ? "text-emerald-600 hover:bg-emerald-100"
                        : "text-slate-400 hover:bg-slate-200"
                    } disabled:opacity-50`}
                    title={row.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {row.is_active ? <FiToggleLeft size={20} /> : <FiToggleRight size={20} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        * Total {mereks.length} merek. Merek baru yang ditambahkan ke produk akan otomatis muncul di sini dengan status Aktif.
      </p>
    </div>
  );
}

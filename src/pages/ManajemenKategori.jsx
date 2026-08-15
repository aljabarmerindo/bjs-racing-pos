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

export default function ManajemenKategori() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil SEMUA kategori unik dari produk dengan PAGINATION
      // (PostgREST membatasi 1000 baris/request; tanpa pagination kategori
      // dengan produk di urutan abjad akhir tidak akan terdaftar).
      const PAGE = 1000;
      let from = 0;
      const allCategories = new Set();
      while (true) {
        let productQuery = supabase
          .from("products")
          .select("kategori")
          .not("kategori", "in", '("Pilok", "Jasa")')
          .not("kategori", "is", null)
          .range(from, from + PAGE - 1);

        const { data: productPage, error: pageError } = await productQuery;
        if (pageError) throw pageError;

        if (!productPage || productPage.length === 0) break;
        productPage.forEach(p => {
          if (p.kategori !== null && p.kategori !== undefined) {
            allCategories.add(p.kategori);
          }
        });
        if (productPage.length < PAGE) break;
        from += PAGE;
      }

      // Ambil SEMUA baris product_categories (sumber status visibilitas)
      const { data: categoryData, error: catError } = await supabase
        .from("product_categories")
        .select("kategori, is_active")
        .order("kategori", { ascending: true });
      if (catError) throw catError;

      const statusMap = new Map();
      (categoryData || []).forEach(row => statusMap.set(row.kategori, row.is_active));

      const merged = [...allCategories]
        .map(kategori => ({
          kategori,
          is_active: statusMap.has(kategori) ? statusMap.get(kategori) : true,
        }))
        .sort((a, b) => a.kategori.localeCompare(b.kategori));

      // Seed kategori yang belum terdaftar (default aktif) agar visibilitas
      // di /onderdil konsisten dengan halaman ini
      const missing = merged.filter(c => !statusMap.has(c.kategori));
      if (missing.length > 0) {
        const { error: upsertError } = await supabase
          .from("product_categories")
          .upsert(
            missing.map(c => ({
              kategori: c.kategori,
              is_active: true,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "kategori" }
          );
        if (upsertError) console.error("Gagal seed kategori baru:", upsertError.message);
      }

      setCategories(merged);
    } catch (err) {
      console.error("Failed to load categories:", err);
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
      fetchCategories();
    };
    init();
  }, [fetchCategories]);

  const handleToggle = useCallback(async (kategori, currentStatus) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from("product_categories")
        .upsert(
          { kategori, is_active: newStatus, updated_at: new Date().toISOString() },
          { onConflict: "kategori" }
        );

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat =>
          cat.kategori === kategori ? { ...cat, is_active: newStatus } : cat
        )
      );
      setSaveMsg({
        type: "success",
        text: `Kategori "${kategori}" berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`,
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
      const rows = Array.from(selectedIds).map(kategori => ({
        kategori,
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("product_categories")
        .upsert(rows, { onConflict: "kategori" });

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat =>
          selectedIds.has(cat.kategori) ? { ...cat, is_active: newStatus } : cat
        )
      );

      setSaveMsg({
        type: "success",
        text: `${selectedIds.size} kategori berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`,
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
      if (prev.size === categories.length) {
        return new Set();
      }
      return new Set(categories.map(c => c.kategori));
    });
  }, [categories]);

  const toggleSelect = useCallback((kategori) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(kategori)) {
        next.delete(kategori);
      } else {
        next.add(kategori);
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
        <span className="ml-3 text-slate-600 font-medium">Memuat kategori...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Kategori Onderdil</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola kategori produk yang muncul di halaman Onderdil & Aksesoris
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">Cara Kerja</p>
          <p>
            Kategori yang <span className="font-semibold">Aktif</span> akan muncul di halaman{" "}
            <span className="font-semibold">/onderdil</span>. Nonaktifkan kategori untuk
            menyembunyikannya dari pelanggan. Produk di POS tetap menampilkan semua kategori.
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
            {selectedIds.size} kategori dipilih
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

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-12">
                <input
                  type="checkbox"
                  checked={categories.length > 0 && selectedIds.size === categories.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                Kategori
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
            {categories.map((row) => (
              <tr
                key={row.kategori}
                className="border-b last:border-b-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.kategori)}
                    onChange={() => toggleSelect(row.kategori)}
                    className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                </td>
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-800">{row.kategori}</span>
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
                    onClick={() => handleToggle(row.kategori, row.is_active)}
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
        * Total {categories.length} kategori. Kategori baru yang ditambahkan ke produk akan otomatis muncul di sini dengan status Aktif.
      </p>
    </div>
  );
}

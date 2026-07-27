import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiSave,
  FiX,
  FiMapPin,
  FiSearch,
} from "react-icons/fi";
import {
  getGojekAreas,
  createGojekArea,
  updateGojekArea,
  deleteGojekArea,
  searchBiteshipAreas,
} from "../lib/biteshipClient.js";

export default function GojekAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    subdistrict_id: "",
    district_name: "",
    city_name: "",
    province_name: "",
    postal_code: "",
    is_active: true,
  });

  const loadAreas = async () => {
    setLoading(true);
    try {
      const data = await getGojekAreas();
      setAreas(data);
    } catch (err) {
      alert("Gagal memuat area GOJEK: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchBiteshipAreas(query)
      .then((data) => {
        setResults(data);
      })
      .catch((err) => {
        console.error("Search area error:", err);
        setResults([]);
      })
      .finally(() => setSearching(false));
  }, [query]);

  const resetForm = () => {
    setForm({
      subdistrict_id: "",
      district_name: "",
      city_name: "",
      province_name: "",
      postal_code: "",
      is_active: true,
    });
    setSelected(null);
    setQuery("");
    setResults([]);
    setEditingId(null);
  };

  const handleSelect = (area) => {
    setSelected(area);
    setQuery(area.name || "");
    setResults([]);
    setForm({
      subdistrict_id: area.administrativeLevel4 ? area.id : "",
      district_name: area.administrativeLevel3 || "",
      city_name: area.administrativeLevel2 || "",
      province_name: area.administrativeLevel1 || "",
      postal_code: area.postalCode || "",
      is_active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateGojekArea(editingId, form);
      } else {
        await createGojekArea(form);
      }
      await loadAreas();
      resetForm();
    } catch (err) {
      alert("Gagal menyimpan area GOJEK: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (area) => {
    setForm({
      subdistrict_id: area.subdistrict_id,
      district_name: area.district_name,
      city_name: area.city_name,
      province_name: area.province_name,
      postal_code: area.postal_code,
      is_active: area.is_active,
    });
    setSelected(null);
    setQuery("");
    setResults([]);
    setEditingId(area.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus area GOJEK ini?")) return;
    try {
      await deleteGojekArea(id);
      await loadAreas();
    } catch (err) {
      alert("Gagal menghapus area GOJEK: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FiMapPin className="text-green-600" />
          Kelola Area GOJEK
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">
          {editingId ? "Edit Area" : "Tambah Area Baru"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cari Alamat / Area
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik alamat atau nama area..."
                className="w-full pl-10 p-2 border rounded-lg"
              />
            </div>
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5">
                {results.map((area) => (
                  <div
                    key={area.id}
                    onMouseDown={() => handleSelect(area)}
                    className="cursor-pointer p-2 hover:bg-orange-100"
                  >
                    <div className="font-semibold text-gray-800">{area.name}</div>
                    <div className="text-xs text-gray-500">
                      {[
                        area.administrativeLevel4,
                        area.administrativeLevel3,
                        area.administrativeLevel2,
                        area.administrativeLevel1,
                      ]
                        .filter(Boolean)
                        .join(", ") || area.type}
                    </div>
                    {area.postalCode && (
                      <div className="text-xs text-gray-400">Kode pos: {area.postalCode}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <p className="text-xs text-slate-500 mt-1">Mencari...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kecamatan *
              </label>
              <input
                type="text"
                value={form.district_name}
                onChange={(e) => setForm({ ...form, district_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kota/Kabupaten *
              </label>
              <input
                type="text"
                value={form.city_name}
                onChange={(e) => setForm({ ...form, city_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Provinsi *
              </label>
              <input
                type="text"
                value={form.province_name}
                onChange={(e) => setForm({ ...form, province_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kode Pos *
              </label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subdistrict ID
              </label>
              <input
                type="text"
                value={form.subdistrict_id}
                onChange={(e) => setForm({ ...form, subdistrict_id: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Opsional, bisa diisi dari area terpilih"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Aktif
              </label>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-2"
              >
                <FiSave />
                {editingId ? "Simpan Perubahan" : "Tambah Area"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 flex items-center gap-2"
                >
                  <FiX />
                  Batal
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Daftar Area GOJEK</h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500">Memuat...</p>
        ) : areas.length === 0 ? (
          <p className="p-6 text-center text-slate-500">Belum ada area GOJEK.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kecamatan</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kota</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Provinsi</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kode Pos</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">{area.district_name}</td>
                    <td className="px-6 py-4">{area.city_name}</td>
                    <td className="px-6 py-4">{area.province_name}</td>
                    <td className="px-6 py-4">{area.postal_code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          area.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {area.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(area)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(area.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

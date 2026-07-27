import { useState, useEffect } from "react";
import {
  getGojekAreas,
  createGojekArea,
  updateGojekArea,
  deleteGojekArea,
  searchBiteshipAreas,
} from "../lib/biteshipClient.js";

function GojekAreaModal({ isOpen, onClose, onSave, areaToEdit }) {
  const [form, setForm] = useState({
    subdistrict_id: "",
    district_name: "",
    city_name: "",
    province_name: "",
    postal_code: "",
    is_active: true,
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (areaToEdit) {
      setForm({
        subdistrict_id: areaToEdit.subdistrict_id || "",
        district_name: areaToEdit.district_name || "",
        city_name: areaToEdit.city_name || "",
        province_name: areaToEdit.province_name || "",
        postal_code: areaToEdit.postal_code || "",
        is_active: areaToEdit.is_active ?? true,
      });
      setSelected(null);
      setQuery("");
      setResults([]);
    } else {
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
    }
  }, [areaToEdit, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchBiteshipAreas(query)
      .then((data) => setResults(data))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [query, isOpen]);

  const handleSelect = (area) => {
    setSelected(area);
    setQuery("");
    setResults([]);
    const subdistrict = area.administrativeLevel4 || "";
    setForm({
      subdistrict_id: subdistrict.toLowerCase().replace(/\s+/g, ""),
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
      await onSave(form);
      onClose();
    } catch (err) {
      alert("Gagal menyimpan area GOJEK: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {areaToEdit ? "Edit Area GOJEK" : "Tambah Area Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cari Alamat / Area
            </label>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik alamat atau nama area..."
                className="w-full pl-10 p-2 border rounded-lg"
              />
            </div>
            {results.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5">
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
                placeholder="Otomatis terisi dari area terpilih"
                readOnly={!!selected}
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
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {areaToEdit ? "Simpan Perubahan" : "Tambah Area"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GojekAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaToEdit, setAreaToEdit] = useState(null);

  const loadAreas = async () => {
    console.log("[GojekAreas] loadAreas start");
    setLoading(true);
    try {
      const data = await getGojekAreas();
      console.log("[GojekAreas] loadAreas success:", data.length);
      setAreas(data);
    } catch (err) {
      console.error("[GojekAreas] loadAreas error:", err);
      alert("Gagal memuat area GOJEK: " + err.message);
    } finally {
      console.log("[GojekAreas] loadAreas finally");
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    if (areaToEdit) {
      await updateGojekArea(areaToEdit.id, form);
    } else {
      await createGojekArea(form);
    }
    await loadAreas();
  };

  const handleEdit = (area) => {
    setAreaToEdit(area);
    setIsModalOpen(true);
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
          <svg xmlns="http://www.w3.org/2000/svg" className="text-green-600 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Kelola Area GOJEK
        </h1>
        <button
          onClick={() => {
            setAreaToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Area
        </button>
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(area.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GojekAreaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        areaToEdit={areaToEdit}
      />
    </div>
  );
}

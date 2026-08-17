import { useState, useEffect } from "react";
import {
  getBjsExpressAreas,
  createBjsExpressArea,
  updateBjsExpressArea,
  deleteBjsExpressArea,
  bulkCreateBjsExpressArea,
  searchBiteshipAreas,
  fetchRajaOngkirSubdistricts,
} from "../lib/biteshipClient.js";
import { checkBiteshipRates, updateReferenceRates } from "../lib/biteshipClient.js";

function BjsExpressAreaModal({ isOpen, onClose, onSave, areaToEdit }) {
  const [form, setForm] = useState({
    subdistrict_id: "",
    district_name: "",
    city_name: "",
    province_name: "",
    postal_code: "",
    village_name: "",
    is_active: true,
    notes: "",
    open_time: "08:00",
    cutoff_time: "15:00",
    shipping_cost: "0",
    etd: "6 - 8 Hours",
    max_weight_gram: "5000",
    service_name: "BJS Express",
    dest_lat: "",
    dest_lng: "",
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    if (areaToEdit) {
      setForm({
        subdistrict_id: areaToEdit.subdistrict_id || "",
        district_name: areaToEdit.district_name || "",
        city_name: areaToEdit.city_name || "",
        province_name: areaToEdit.province_name || "",
        postal_code: areaToEdit.postal_code || "",
        village_name: areaToEdit.village_name || "",
        is_active: areaToEdit.is_active ?? true,
        notes: areaToEdit.notes || "",
        open_time: areaToEdit.open_time || "08:00",
        cutoff_time: areaToEdit.cutoff_time || "15:00",
        shipping_cost: areaToEdit.shipping_cost ?? "0",
        etd: areaToEdit.etd || "6 - 8 Hours",
        max_weight_gram: areaToEdit.max_weight_gram ?? "5000",
        service_name: areaToEdit.service_name || "BJS Express",
        dest_lat: areaToEdit.dest_lat || "",
        dest_lng: areaToEdit.dest_lng || "",
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
        village_name: "",
        is_active: true,
        notes: "",
        open_time: "08:00",
        cutoff_time: "15:00",
        shipping_cost: "0",
        etd: "6 - 8 Hours",
        max_weight_gram: "5000",
        service_name: "BJS Express",
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
    setForm({
      subdistrict_id: area.id || "",
      district_name: area.administrativeLevel3 || "",
      city_name: area.administrativeLevel2 || "",
      province_name: area.administrativeLevel1 || "",
      postal_code: area.postalCode || "",
      village_name: form.village_name || "",
      is_active: true,
      notes: form.notes,
      open_time: form.open_time,
      cutoff_time: form.cutoff_time,
      shipping_cost: form.shipping_cost,
      etd: form.etd,
      max_weight_gram: form.max_weight_gram,
      service_name: form.service_name,
      dest_lat: area.latitude || "",
      dest_lng: area.longitude || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.open_time >= form.cutoff_time) {
      alert("Jam buka harus lebih awal dari jam cut-off.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      alert("Gagal menyimpan area BJS Express: " + err.message);
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
            {areaToEdit ? "Edit Area BJS Express" : "Tambah Area Baru"}
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
            
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Desa / Kelurahan (opsional)
              </label>
              <input
                type="text"
                value={form.village_name}
                onChange={(e) => setForm({ ...form, village_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Kosong = berlaku untuk semua desa"
              />
              <p className="text-xs text-slate-400 mt-1">
                Isi jika harga khusus untuk satu desa saja
              </p>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jam Buka (WIB)
              </label>
              <input
                type="time"
                value={form.open_time}
                onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                className="w-full p-2 border rounded-lg"
            
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jam Tutup / Cut-off (WIB)
              </label>
              <input
                type="time"
                value={form.cutoff_time}
                onChange={(e) => setForm({ ...form, cutoff_time: e.target.value })}
                className="w-full p-2 border rounded-lg"
            
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Layanan
              </label>
              <input
                type="text"
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Koordinat Destinasi
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={form.dest_lat}
                    onChange={(e) => setForm({ ...form, dest_lat: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Contoh: -6.5244682"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={form.dest_lng}
                    onChange={(e) => setForm({ ...form, dest_lng: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Contoh: 110.7674915"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Koordinat akan terisi otomatis jika Anda memilih area dari search Biteship. Anda juga bisa mengedit manual.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ongkir Flat (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={form.shipping_cost}
                onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                className="w-full p-2 border rounded-lg"
            
              />
              <p className="text-xs text-slate-400 mt-1">
                0 = gratis ongkir
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimasi Pengiriman (ETD)
              </label>
              <input
                type="text"
                value={form.etd}
                onChange={(e) => setForm({ ...form, etd: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="cth: 6 - 8 Hours"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Berat Maksimal (gram)
              </label>
              <input
                type="number"
                min="1"
                value={form.max_weight_gram}
                onChange={(e) => setForm({ ...form, max_weight_gram: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-xs text-slate-400 mt-1">
                Pesanan di atas berat ini tidak dilayani area ini
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catatan
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-2 border rounded-lg"
                rows={2}
              />
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

export default function BjsExpressAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaToEdit, setAreaToEdit] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDesaList, setBulkDesaList] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rajaongkirDesaList, setRajaongkirDesaList] = useState([]);
  const [selectedRajaongkirDesa, setSelectedRajaongkirDesa] = useState({});
  const [fetchingRajaongkir, setFetchingRajaongkir] = useState(false);
  const [checkingRates, setCheckingRates] = useState(false);
  const [ratesModal, setRatesModal] = useState({ open: false, area: null, data: null });
  const [bulkRatesResults, setBulkRatesResults] = useState([]);
  const [showBulkRatesModal, setShowBulkRatesModal] = useState(false);

  const loadAreas = async (retries = 2) => {
    setLoading(true);
    try {
      const data = await getBjsExpressAreas();
      setAreas(data);
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return loadAreas(retries - 1);
      }
      setAreas([]);
      alert("Gagal memuat area BJS Express: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleSave = async (form) => {
    try {
      if (areaToEdit) {
        await updateBjsExpressArea(areaToEdit.id, form);
      } else {
        await createBjsExpressArea(form);
      }
      await loadAreas();
    } catch (err) {
      alert("Gagal menyimpan area BJS Express: " + err.message);
    }
  };

  const handleEdit = (area) => {
    setAreaToEdit(area);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus area BJS Express ini?")) return;
    try {
      await deleteBjsExpressArea(id);
      await loadAreas();
    } catch (err) {
      alert("Gagal menghapus area BJS Express: " + err.message);
    }
  };

  const handleCheckRates = async (area) => {
    if (!area.dest_lat || !area.dest_lng) {
      alert("Koordinat destinasi belum diisi untuk area ini. Edit area terlebih dahulu.");
      return;
    }
    setCheckingRates(true);
    try {
      const data = await checkBiteshipRates(area.id, area.max_weight_gram || 5000);
      console.log("[UI] checkBiteshipRates success:", data);
      setRatesModal({ open: true, area, data });
    } catch (err) {
      console.error("[UI] checkBiteshipRates error:", err);
      alert("Gagal mengecek rates: " + err.message);
    } finally {
      setCheckingRates(false);
    }
  };

  const handleUpdateFromReference = async () => {
    const { area, data } = ratesModal;
    if (!area || !data) return;
    if (!window.confirm(`Update harga BJS Express ke Rp ${data.reference_rate}?`)) return;
    try {
      await updateBjsExpressArea(area.id, { shipping_cost: data.reference_rate });
      await loadAreas();
      setRatesModal({ open: false, area: null, data: null });
      alert("Harga berhasil diperbarui.");
    } catch (err) {
      alert("Gagal update harga: " + err.message);
    }
  };

  const handleBulkUpdateFromReference = async () => {
    const successfulResults = bulkRatesResults.filter((r) => r.success && r.data?.reference_rate);
    if (!successfulResults.length) {
      alert("Tidak ada area yang berhasil dicek.");
      return;
    }
    if (!confirm(`Update harga BJS Express untuk ${successfulResults.length} area?`)) return;
    try {
      await updateReferenceRates(
        successfulResults.map((r) => ({
          id: r.area.id,
          reference_rate: r.data.reference_rate,
          reference_updated_at: new Date().toISOString(),
        }))
      );
      await loadAreas();
      setShowBulkRatesModal(false);
      alert(`Berhasil update ${successfulResults.length} area.`);
    } catch (err) {
      alert("Gagal update bulk: " + err.message);
    }
  };

  const handleUpdateSingleFromBulk = async (result) => {
    try {
      await updateBjsExpressArea(result.area.id, { shipping_cost: result.data.reference_rate });
      await loadAreas();
      alert("Harga berhasil diperbarui.");
    } catch (err) {
      alert("Gagal update harga: " + err.message);
    }
  };

  const handleBulkImport = async (form) => {
    setBulkSaving(true);
    try {
      const manualDesa = bulkDesaList
        .split(/[\n,]+/)
        .map((d) => d.trim())
        .filter(Boolean);

      const rajaongkirSelected = Object.entries(selectedRajaongkirDesa)
        .filter(([, checked]) => checked)
        .map(([name]) => name);

      const desaArray = [...new Set([...manualDesa, ...rajaongkirSelected])];
      if (desaArray.length === 0) {
        alert("Masukkan nama desa terlebih dahulu.");
        return;
      }
      await bulkCreateBjsExpressArea({
        subdistrict_id: form.subdistrict_id || areas.find((a) => a.district_name === form.district_name)?.subdistrict_id || "",
        district_name: form.district_name,
        city_name: form.city_name,
        province_name: form.province_name,
        postal_code: form.postal_code,
        desa_list: desaArray,
        open_time: form.open_time || "08:00:00",
        cutoff_time: form.cutoff_time || "15:00:00",
        shipping_cost: form.shipping_cost || 0,
        etd: form.etd || "6 - 8 Hours",
        max_weight_gram: form.max_weight_gram || "5000",
        service_name: form.service_name || "BJS Express",
      });
      setIsBulkModalOpen(false);
      setBulkDesaList("");
      setRajaongkirDesaList([]);
      setSelectedRajaongkirDesa({});
      await loadAreas();
      alert("Import desa berhasil.");
    } catch (err) {
      alert("Gagal import desa: " + err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleFetchRajaongkir = async (districtName, cityName) => {
    if (!districtName || !cityName) {
      alert("Isi Kecamatan dan Kota/Kabupaten terlebih dahulu.");
      return;
    }
    setFetchingRajaongkir(true);
    try {
      const data = await fetchRajaOngkirSubdistricts(districtName, cityName);
      const subdistricts = data.subdistricts || [];
      const selected = {};
      subdistricts.forEach((s) => {
        selected[s.name] = true;
      });
      setRajaongkirDesaList(subdistricts);
      setSelectedRajaongkirDesa(selected);
    } catch (err) {
      alert("Gagal mengambil data desa dari RajaOngkir: " + err.message);
    } finally {
      setFetchingRajaongkir(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-orange-600 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m0 0l6 3m-6-3V7m6 10l-5.447-2.724A1 1 0 0013.553 13H9.447a1 1 0 00-1.447.894L9 15m0 0l6 3" />
          </svg>
          Kelola Area BJS Express
        </h1>
        <button
          onClick={() => {
            setAreaToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Area
        </button>
        <button
          onClick={() => setIsBulkModalOpen(true)}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Desa
        </button>
        <button
          onClick={async () => {
            const activeAreas = areas.filter((a) => a.is_active);
            if (!activeAreas.length) return;
            if (!confirm(`Cek rates untuk ${activeAreas.length} area aktif?`)) return;
            setCheckingRates(true);
            const results = [];
            try {
              for (const area of activeAreas) {
                if (!area.dest_lat || !area.dest_lng) {
                  results.push({ area, success: false, error: "Koordinat belum diisi" });
                  continue;
                }
                try {
                  const data = await checkBiteshipRates(area.id, area.max_weight_gram || 5000);
                  results.push({ area, data, success: true });
                } catch (err) {
                  results.push({ area, error: err.message, success: false });
                }
              }
              setBulkRatesResults(results);
              setShowBulkRatesModal(true);
              await loadAreas();
            } catch (err) {
              alert("Gagal cek rates: " + err.message);
            } finally {
              setCheckingRates(false);
            }
          }}
          disabled={checkingRates}
          className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {checkingRates ? "Mengecek..." : "Cek Semua Rates"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Daftar Area BJS Express</h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500">Memuat...</p>
        ) : areas.length === 0 ? (
          <p className="p-6 text-center text-slate-500">Belum ada area BJS Express.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kecamatan</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Desa</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kota</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Provinsi</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Kode Pos</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Jam Buka</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Cut-off</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Ongkir</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">ETD</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Ref. Rate</th>\n                    <th className="px-6 py-3 text-left font-medium text-slate-500">Terakhir Dicek</th>\n                    <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">{area.district_name}</td>
                    <td className="px-6 py-4">
                      {area.village_name || (
                        <span className="text-slate-400 italic">Semua Desa</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{area.city_name}</td>
                    <td className="px-6 py-4">{area.province_name}</td>
                    <td className="px-6 py-4">{area.postal_code}</td>
                    <td className="px-6 py-4">{area.open_time || "-"}</td>
                    <td className="px-6 py-4">{area.cutoff_time || "-"}</td>
                    <td className="px-6 py-4">
                      {area.shipping_cost === 0
                        ? "Gratis"
                        : new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(area.shipping_cost || 0)}
                    </td>
                    <td className="px-6 py-4">{area.etd || "-"}</td>
                    <td className="px-6 py-4">
                      {area.reference_updated_at ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(area.reference_rate || 0) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {area.reference_updated_at ? new Date(area.reference_updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                    </td>
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
                        onClick={() => handleCheckRates(area)}
                        className="text-green-600 hover:text-green-800 mr-3"
                        title="Cek Rates Biteship"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
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

      <BjsExpressAreaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        areaToEdit={areaToEdit}
      />

      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Import Desa / Kelurahan</h2>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkDesaList("");
                }}
                className="text-slate-500 hover:text-slate-700"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              id="bulk-form"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const form = {
                  subdistrict_id: formData.get("subdistrict_id") || "",
                  district_name: formData.get("district_name") || "",
                  city_name: formData.get("city_name") || "",
                  province_name: formData.get("province_name") || "",
                  postal_code: formData.get("postal_code") || "",
                  open_time: formData.get("open_time") || "08:00:00",
                  cutoff_time: formData.get("cutoff_time") || "15:00:00",
                  shipping_cost: formData.get("shipping_cost") || "0",
                  etd: formData.get("etd") || "6 - 8 Hours",
                  max_weight_gram: formData.get("max_weight_gram") || "5000",
                  service_name: formData.get("service_name") || "BJS Express",
                };
                handleBulkImport(form);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kecamatan *
                  </label>
                  <input
                    type="text"
                    name="district_name"
                    defaultValue={areaToEdit?.district_name || ""}
                    className="w-full p-2 border rounded-lg"
                
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kota/Kabupaten *
                  </label>
                  <input
                    type="text"
                    name="city_name"
                    defaultValue={areaToEdit?.city_name || ""}
                    className="w-full p-2 border rounded-lg"
                
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provinsi *
                  </label>
                  <input
                    type="text"
                    name="province_name"
                    defaultValue={areaToEdit?.province_name || ""}
                    className="w-full p-2 border rounded-lg"
                
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kode Pos *
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    defaultValue={areaToEdit?.postal_code || ""}
                    className="w-full p-2 border rounded-lg"
                
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ongkir Flat (Rp)
                  </label>
                  <input
                    type="number"
                    name="shipping_cost"
                    defaultValue={areaToEdit?.shipping_cost ?? "0"}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ETD
                  </label>
                  <input
                    type="text"
                    name="etd"
                    defaultValue={areaToEdit?.etd || "6 - 8 Hours"}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Daftar Desa / Kelurahan (pisahkan dengan koma atau baris baru)
                </label>
                <textarea
                  value={bulkDesaList}
                  onChange={(e) => setBulkDesaList(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  rows={6}
                  placeholder={"Contoh:\nDesa A\nDesa B\nDesa C"}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Setiap baris atau koma akan menjadi 1 area desa. Desa yang sudah ada akan dilewati.
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Desa dari RajaOngkir
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const formData = new FormData(document.getElementById("bulk-form"));
                      handleFetchRajaongkir(
                        formData.get("district_name")?.toString() || "",
                        formData.get("city_name")?.toString() || "",
                      );
                    }}
                    disabled={fetchingRajaongkir}
                    className="bg-orange-600 text-white text-sm font-bold py-1.5 px-3 rounded-lg hover:bg-orange-700 disabled:bg-slate-400 flex items-center gap-2"
                  >
                    {fetchingRajaongkir ? "Mengambil..." : "Ambil dari RajaOngkir"}
                  </button>
                </div>

                {rajaongkirDesaList.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {rajaongkirDesaList.map((desa) => (
                      <label key={desa.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedRajaongkirDesa[desa.name]}
                          onChange={(e) =>
                            setSelectedRajaongkirDesa({
                              ...selectedRajaongkirDesa,
                              [desa.name]: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-700">{desa.name}</span>
                        {desa.zip_code && (
                          <span className="text-xs text-slate-400">({desa.zip_code})</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {rajaongkirDesaList.length === 0 && !fetchingRajaongkir && (
                  <p className="text-xs text-slate-400">
                    Klik "Ambil dari RajaOngkir" untuk mengisi daftar desa secara otomatis.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setBulkDesaList("");
                  }}
                  className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2"
                >
                  {bulkSaving ? "Mengimpor..." : "Import Desa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ratesModal.open && ratesModal.area && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Compare Rates</h2>
              <button
                onClick={() => setRatesModal({ open: false, area: null, data: null })}
                className="text-slate-500 hover:text-slate-700"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{ratesModal.area.district_name} {ratesModal.area.village_name ? `/ ${ratesModal.area.village_name}` : ""}</h3>
                <p className="text-sm text-slate-500">{ratesModal.area.city_name}, {ratesModal.area.province_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Gojek Rate (Biteship)</p>
                  <p className="text-xl font-bold">
                    {ratesModal.data?.reference_rate ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ratesModal.data.reference_rate) : "-"}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Harga BJS Express</p>
                  <p className="text-xl font-bold">
                    {ratesModal.area.shipping_cost ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ratesModal.area.shipping_cost) : "Gratis"}
                  </p>
                </div>
              </div>
              {ratesModal.data?.reference_rate && (
                <div className="text-sm text-slate-600">
                  Selisih: {ratesModal.area.shipping_cost - ratesModal.data.reference_rate > 0 ? "+" : ""}{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(ratesModal.area.shipping_cost - ratesModal.data.reference_rate)}
                  ({ratesModal.area.shipping_cost > 0 ? Math.round((ratesModal.data.reference_rate / ratesModal.area.shipping_cost) * 100) : 0}% dari Gojek)
                </div>
              )}
              <div className="text-xs text-slate-400">
                Terakhir dicek: {ratesModal.data?.checked_at ? new Date(ratesModal.data.checked_at).toLocaleString("id-ID") : "-"}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setRatesModal({ open: false, area: null, data: null })}
                  className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
                >
                  Tutup
                </button>
                <button
                  onClick={handleUpdateFromReference}
                  className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Update Harga BJS Express
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showBulkRatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Hasil Cek Semua Rates</h2>
              <button
                onClick={() => setShowBulkRatesModal(false)}
                className="text-slate-500 hover:text-slate-700"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleBulkUpdateFromReference}
                  className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Update Semua Harga yang Berhasil
                </button>
                <button
                  onClick={() => setShowBulkRatesModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
                >
                  Tutup
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Kecamatan</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Desa</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Gojek Rate</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Harga BJS</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Selisih</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bulkRatesResults.map((result) => (
                      <tr key={result.area.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">{result.area.district_name}</td>
                        <td className="px-4 py-4">{result.area.village_name || "-"}</td>
                        <td className="px-4 py-4">
                          {result.success
                            ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(result.data.reference_rate || 0)
                            : result.error}
                        </td>
                        <td className="px-4 py-4">
                          {result.area.shipping_cost ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(result.area.shipping_cost) : "Gratis"}
                        </td>
                        <td className="px-4 py-4">
                          {result.success && result.data?.reference_rate !== undefined
                            ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(result.area.shipping_cost - result.data.reference_rate)
                            : "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={result.success ? "text-green-600" : "text-red-600"}>
                            {result.success ? "Berhasil" : "Gagal"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {result.success && (
                            <button
                              onClick={() => handleUpdateSingleFromBulk(result)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Update Harga
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

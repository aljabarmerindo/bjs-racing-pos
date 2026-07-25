import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";

const PILOK_BRANDS = ["Diton", "Nippon Paint", "Samurai", "Sapporo"];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function FlashSaleModal({ isOpen, onClose, onSave, flashSaleToEdit }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    searchTerm: "",
    kategori: "semua",
    merek: "semua",
  });
  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [merekOptions, setMerekOptions] = useState([]);
  const [activeQuickFilter, setActiveQuickFilter] = useState("semua");

  const debouncedSearch = useDebounce(filters.searchTerm, 300);

  const [flashSettings, setFlashSettings] = useState({
    flash_price: 0,
    sort_order: 0,
    is_active: true,
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, nama, kode, harga_jual, harga_beli, stok, kategori, merek")
          .eq("status", "Aktif")
          .order("nama", { ascending: true });

        if (error) throw error;
        setProducts(data || []);

        const cats = [...new Set(data.map((p) => p.kategori).filter(Boolean))].sort();
        const mereks = [...new Set(data.map((p) => p.merek).filter(Boolean))].sort();
        setKategoriOptions(cats);
        setMerekOptions(mereks);
      } catch (error) {
        console.error("Error fetching products:", error);
        alert("Gagal memuat data produk.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [isOpen]);

  useEffect(() => {
    if (flashSaleToEdit) {
      setFlashSettings({
        flash_price: flashSaleToEdit.flash_price || 0,
        sort_order: flashSaleToEdit.sort_order || 0,
        is_active: flashSaleToEdit.is_active ?? true,
        valid_from: flashSaleToEdit.valid_from
          ? new Date(flashSaleToEdit.valid_from).slice(0, 16)
          : "",
        valid_until: flashSaleToEdit.valid_until
          ? new Date(flashSaleToEdit.valid_until).slice(0, 16)
          : "",
      });
      setSelectedIds([flashSaleToEdit.product_id]);
    } else {
      setFlashSettings({
        flash_price: 0,
        sort_order: 0,
        is_active: true,
        valid_from: "",
        valid_until: "",
      });
      setSelectedIds([]);
    }
    setActiveQuickFilter("semua");
    setFilters({ searchTerm: "", kategori: "semua", merek: "semua" });
  }, [flashSaleToEdit, isOpen]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !debouncedSearch ||
        p.nama.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.kode.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchCategory =
        filters.kategori === "semua" || p.kategori === filters.kategori;

      const matchBrand =
        filters.merek === "semua" || p.merek === filters.merek;

      return matchSearch && matchCategory && matchBrand;
    });
  }, [products, debouncedSearch, filters.kategori, filters.merek]);

  const isAllSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredProducts.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelect = (productId) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleQuickFilterClick = (brand) => {
    const newBrand = brand === activeQuickFilter ? "semua" : brand;
    setActiveQuickFilter(newBrand);
    setFilters((prev) => ({
      ...prev,
      kategori: newBrand === "semua" ? "semua" : "Pilok",
      merek: newBrand,
    }));
  };

  const handleSettingChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFlashSettings((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedIds.length === 0) {
      alert("Pilih minimal 1 produk.");
      return;
    }
    if (!flashSettings.flash_price || flashSettings.flash_price <= 0) {
      alert("Harga flash sale harus lebih dari 0.");
      return;
    }
    if (!flashSettings.valid_until) {
      alert("Tentukan waktu berakhir flash sale.");
      return;
    }

    setSaving(true);
    try {
      const promises = selectedIds.map((productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return Promise.resolve();

        const payload = {
          product_id: productId,
          flash_price: flashSettings.flash_price,
          original_price: product.harga_jual || flashSettings.flash_price,
          stock_allocated: product.stok || 0,
          sort_order: flashSettings.sort_order,
          is_active: flashSettings.is_active,
          valid_from: flashSettings.valid_from || new Date().toISOString(),
          valid_until: flashSettings.valid_until,
        };

        if (flashSaleToEdit && selectedIds.length === 1 && flashSaleToEdit.product_id === productId) {
          return supabase
            .from("flash_sales")
            .update(payload)
            .eq("id", flashSaleToEdit.id);
        }

        return supabase.from("flash_sales").insert(payload);
      });

      const results = await Promise.all(promises);
      const hasError = results.some((r) => r?.error);

      if (hasError) {
        alert("Gagal menyimpan sebagian data flash sale.");
      } else {
        alert(`Berhasil menyimpan flash sale untuk ${selectedIds.length} produk.`);
        onSave?.();
      }
    } catch (error) {
      console.error("Error saving flash sales:", error);
      alert("Gagal menyimpan flash sale.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-slate-100 rounded-2xl shadow-xl w-full max-w-6xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {flashSaleToEdit ? "Edit Flash Sale" : "Tambah Flash Sale Baru"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Pilih produk, atur harga flash, dan simpan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-2 rounded-full hover:bg-slate-200"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-grow flex flex-col lg:flex-row gap-6 p-4 sm:p-6 min-h-0">
          {/* KOLOM KIRI: FILTER */}
          <div className="w-full lg:w-1/4 flex flex-col gap-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-slate-700">
              Filter Produk
            </h3>
            <div className="relative">
              <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kode..."
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
                }
                className="w-full p-2 pl-10 border rounded-lg"
              />
            </div>
            <select
              value={filters.kategori}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, kategori: e.target.value }))
              }
              className="w-full p-2 border rounded-lg"
            >
              <option value="semua">Semua Kategori</option>
              {kategoriOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={filters.merek}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, merek: e.target.value }))
              }
              className="w-full p-2 border rounded-lg"
            >
              <option value="semua">Semua Merek</option>
              {merekOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold text-slate-600 mb-2">
                Filter Cepat Pilok
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {PILOK_BRANDS.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => handleQuickFilterClick(brand)}
                    className={`w-full py-2 px-2 text-sm font-bold rounded-md transition-colors border ${
                      activeQuickFilter === brand
                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                        : "bg-white text-slate-700 hover:bg-blue-100"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: TABEL PRODUK */}
          <div className="flex-grow flex flex-col bg-white rounded-lg shadow-inner min-h-0">
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-700">
                  Daftar Produk
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedIds.length} produk dipilih
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${
                  isAllSelected
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
              >
                {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {loading ? (
                <p className="text-center p-10">Memuat data produk...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          onChange={handleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-600">
                        Nama Produk
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-600">
                        Kode
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-600">
                        Kategori
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-600">
                        Merek
                      </th>
                      <th className="p-3 text-right font-semibold text-slate-600">
                        Harga Jual
                      </th>
                      <th className="p-3 text-right font-semibold text-slate-600">
                        Stok
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr
                        key={p.id}
                        className={`border-b cursor-pointer ${
                          selectedIds.includes(p.id)
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => handleToggleSelect(p.id)}
                      >
                        <td className="p-3">
                          <div className="flex justify-center">
                            {selectedIds.includes(p.id) && (
                              <FiCheck className="text-blue-600" size={18} />
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold">{p.nama}</td>
                        <td className="p-3 text-slate-500">{p.kode}</td>
                        <td className="p-3 text-slate-500">{p.kategori || "-"}</td>
                        <td className="p-3 text-slate-500">{p.merek || "-"}</td>
                        <td className="p-3 text-right">
                          Rp {Number(p.harga_jual || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 text-right">{p.stok || 0}</td>
                      </tr>
                    ))}
                    {!loading && filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-500">
                          Tidak ada produk yang cocok dengan filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Flash Settings */}
        <div className="border-t bg-white p-4 sm:p-6 flex-shrink-0">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-grow">
              <div>
                <label htmlFor="flash_price" className="block mb-1 text-sm font-medium text-slate-700">
                  Harga Flash (Rp) *
                </label>
                <input
                  id="flash_price"
                  type="number"
                  min="0"
                  value={flashSettings.flash_price}
                  onChange={handleSettingChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label htmlFor="sort_order" className="block mb-1 text-sm font-medium text-slate-700">
                  Urutan Tampil
                </label>
                <input
                  id="sort_order"
                  type="number"
                  min="0"
                  max="99"
                  value={flashSettings.sort_order}
                  onChange={handleSettingChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="valid_from" className="block mb-1 text-sm font-medium text-slate-700">
                  Mulai
                </label>
                <input
                  id="valid_from"
                  type="datetime-local"
                  value={flashSettings.valid_from}
                  onChange={handleSettingChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="valid_until" className="block mb-1 text-sm font-medium text-slate-700">
                  Sampai *
                </label>
                <input
                  id="valid_until"
                  type="datetime-local"
                  value={flashSettings.valid_until}
                  onChange={handleSettingChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={flashSettings.is_active}
                onChange={handleSettingChange}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Aktif
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-4 rounded"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {saving
                  ? "Menyimpan..."
                  : `Simpan Flash Sale (${selectedIds.length} produk)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashSaleModal;

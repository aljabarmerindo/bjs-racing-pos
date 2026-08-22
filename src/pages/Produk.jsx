import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import {
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiAlertTriangle,
  FiClock,
  FiMic,
} from "react-icons/fi";
import ProductModal from "../components/ProductModal.jsx";
import ViewNoteModal from "../components/ViewNoteModal.jsx";
import FilterModal from "../components/FilterModal.jsx";
import ImportExcelButton from "../components/ImportExcelButton.jsx";
import ExportExcelButton from "../components/ExportExcelButton.jsx";
import { useVoiceSearch } from "../hooks/useVoiceSearch.js";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function Produk() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceSearch({
    lang: "id-ID",
    onResult: (text) => setSearchTerm(text),
  });
  const [activeFilters, setActiveFilters] = useState({
    merek: "semua",
    kategori: "semua",
    lini_produk: "semua",
    ukuran: "semua",
    supplier: "semua",
    price_range: "semua",
    status: "semua",
  });
  const [showLowStockOnly, setShowLowStockOnly] = useState(
    () => location.state?.filter === "stok_rendah",
  );
  const [showOnlyUnupdated, setShowOnlyUnupdated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cascadeOptions, setCascadeOptions] = useState({
    merek: [], kategori: [], lini_produk: [], ukuran: [], supplier: [],
  });
  const [priceCounts, setPriceCounts] = useState({
    nol: 0, "1-15k": 0, "15k-25k": 0, "25k-50k": 0, "50k-100k": 0, "100k+": 0,
  });
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [noteToView, setNoteToView] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const forceRefresh = () => setRefreshTrigger((t) => t + 1);
  const fetchIdRef = useRef(0);

  const PREDEFINED_PRICE_RANGES = [
    "semua", "nol", "0-15000", "15000-25000",
    "25000-50000", "50000-100000", "100000+",
  ];

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    let isActive = true;
    let timeoutId;
    const runSearch = async (retried = false) => {
      setLoading(true);
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);
      const isCustomPrice = !PREDEFINED_PRICE_RANGES.includes(activeFilters.price_range);
      const { data, error } = await supabase.rpc("search_products", {
        search_term: debouncedSearchTerm,
        merek_filter: activeFilters.merek,
        kategori_filter: activeFilters.kategori,
        status_filter: activeFilters.status,
        low_stock_only: showLowStockOnly,
        supplier_filter: activeFilters.supplier,
        ukuran_filter: activeFilters.ukuran,
        lini_produk_filter: activeFilters.lini_produk,
        price_range: isCustomPrice ? "semua" : activeFilters.price_range,
      });
      clearTimeout(timeoutId);
      if (!isActive || fetchId !== fetchIdRef.current) return;

      // Jika token auth expired/kadaluarsa (umum setelah tab lama di-background),
      // refresh session lalu coba lagi satu kali tanpa reload manual.
      const isAuthError =
        error &&
        (error.message?.toLowerCase().includes("jwt") ||
          error.message?.toLowerCase().includes("token") ||
          error.message?.toLowerCase().includes("unauthorized") ||
          error.code === "401" ||
          error.status === 401);
      if (isAuthError && !retried) {
        await supabase.auth.refreshSession();
        return runSearch(true);
      }

      if (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } else if (data) {
        let result = data;
        if (isCustomPrice && activeFilters.price_range) {
          const parts = activeFilters.price_range.split("-");
          const min = parseInt(parts[0], 10) || 0;
          const max = parts[1] && !parts[1].includes("+")
            ? parseInt(parts[1], 10)
            : Infinity;
          result = data.filter((p) => {
            const harga = parseFloat(p.harga_jual) || 0;
            return harga >= min && harga <= max;
          });
        }
        setProducts(result);
      }
      setLoading(false);
    };
    runSearch();
    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [debouncedSearchTerm, activeFilters, showLowStockOnly, refreshTrigger]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        forceRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const fetchCascadeOptions = async () => {
      const { data, error } = await supabase.rpc("get_cascade_filter_options", {
        p_merek: activeFilters.merek,
        p_kategori: activeFilters.kategori,
        p_lini_produk: activeFilters.lini_produk,
        p_ukuran: activeFilters.ukuran,
        p_supplier: activeFilters.supplier,
        p_status: activeFilters.status,
        p_low_stock_only: showLowStockOnly,
      });
      if (error) {
        console.error("Error fetching cascade options:", error);
      } else if (data && data[0]) {
        const d = data[0];
        setCascadeOptions({
          merek: d.merek || [],
          kategori: d.kategori || [],
          lini_produk: d.lini_produk || [],
          ukuran: d.ukuran || [],
          supplier: d.supplier || [],
        });
        setPriceCounts({
          nol: d.price_nol || 0,
          "1-15k": d.price_1_15k || 0,
          "15k-25k": d.price_15k_25k || 0,
          "25k-50k": d.price_25k_50k || 0,
          "50k-100k": d.price_50k_100k || 0,
          "100k+": d.price_100k_plus || 0,
        });
      }
    };
    fetchCascadeOptions();
  }, [activeFilters.merek, activeFilters.kategori, activeFilters.lini_produk,
      activeFilters.ukuran, activeFilters.supplier, showLowStockOnly, refreshTrigger]);

  useEffect(() => {
    const fetchSupplierOptions = async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, nama_supplier");
      if (data) setSupplierOptions(data);
    };
    fetchSupplierOptions();
  }, []);

  useEffect(() => {
    if (voiceError === "not-allowed") {
      alert("Izinkan akses mikrofon di browser untuk fitur pencarian suara.");
    } else if (voiceError && voiceError !== "no-speech") {
      console.error("Voice search error:", voiceError);
    }
  }, [voiceError]);

  useEffect(() => {
    if (location.state?.filter === "stok_rendah") {
      navigate(location.pathname, { state: {}, replace: true });
    }
  }, [location.state, navigate]);

  const CASCADE_ORDER = ["merek", "kategori", "lini_produk", "ukuran", "supplier", "price_range", "status"];

  const RESET_FILTERS = {
    merek: "semua",
    kategori: "semua",
    lini_produk: "semua",
    ukuran: "semua",
    supplier: "semua",
    price_range: "semua",
    status: "semua",
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const next = { ...prev, [key]: value };
      const changedIdx = CASCADE_ORDER.indexOf(key);
      if (changedIdx >= 0) {
        for (let i = changedIdx + 1; i < CASCADE_ORDER.length; i++) {
          const k = CASCADE_ORDER[i];
          if (k === "price_range" || k === "status") continue;
          next[k] = "semua";
        }
      }
      return next;
    });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters(RESET_FILTERS);
    setCurrentPage(1);
  };

  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setSaveError("");
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (product) => {
    setProductToEdit(product);
    setSaveError("");
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData, selectedVehicleModels = [], vehicleData = {}) => {
    setIsSaving(true);
    setSaveError("");
    try {
      const { id, ...dataToSave } = productData;
      const selectedSupplier = supplierOptions.find(
        (opt) => opt.nama_supplier === dataToSave.supplier,
      );
      const finalDbData = {
        ...dataToSave,
        supplier_id: selectedSupplier ? selectedSupplier.id : null,
        supplier: selectedSupplier ? selectedSupplier.nama_supplier : null,
      };

      let error;
      let savedProductId = id;
      if (id) {
        ({ error } = await supabase
          .from("products")
          .update(finalDbData)
          .eq("id", id));
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("products")
          .insert(finalDbData)
          .select("id")
          .single();
        if (insertError) throw insertError;
        savedProductId = inserted?.id;
        ({ error } = await supabase
          .from("products")
          .update({ id: savedProductId })
          .eq("id", savedProductId));
      }

      if (error) {
        throw error;
      }

      // Save vehicle compatibility pivot
      if (savedProductId && selectedVehicleModels.length > 0) {
        const { data: brandData } = await supabase
          .from("vehicle_brands")
          .select("id")
          .eq("name", dataToSave.merek)
          .single();

        const compatibilities = selectedVehicleModels.map((modelId) => ({
          product_id: savedProductId,
          vehicle_model_id: modelId,
          vehicle_brand_id: brandData?.id || null,
          vehicle_kategori_id: vehicleData.vehicle_kategori_id || null,
          is_primary: false,
        }));

        const { error: compatError } = await supabase
          .from("product_vehicle_compatibilities")
          .upsert(compatibilities, { onConflict: "product_id,vehicle_model_id" });

        if (compatError) {
          console.error("Failed to save compatibilities:", compatError);
        }
      }

      alert(
        id ? "Produk berhasil diperbarui!" : "Produk berhasil ditambahkan!",
      );
      setIsModalOpen(false);
      forceRefresh();
    } catch (error) {
      let errorMessage = error.message;
      if (
        error.message.includes(
          'duplicate key value violates unique constraint "products_kode_key"',
        )
      ) {
        errorMessage = `Kode produk "${productData.kode}" sudah ada. Silakan gunakan kode lain.`;
      }
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (
      window.confirm(
        `Yakin ingin mengarsipkan produk "${productName}"? Produk ini akan disembunyikan dari pencarian dan POS, namun riwayat transaksinya akan tetap aman.`,
      )
    ) {
      const { error } = await supabase
        .from("products")
        .update({ status: "Diarsipkan" })
        .eq("id", productId);
      if (error) {
        alert("Gagal mengarsipkan produk: " + error.message);
      } else {
        alert("Produk berhasil diarsipkan.");
        forceRefresh();
      }
    }
  };

  const handleDataUpload = async (dataFromExcel) => {
    /* ... (Fungsi ini tetap sama) */
  };

  const cutoffDate = new Date("2026-04-20T23:59:59");
  const filteredProducts = showOnlyUnupdated
    ? products.filter((p) => new Date(p.updated_at) <= cutoffDate)
    : products;

  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, activeFilters, showLowStockOnly, showOnlyUnupdated]);

  if (loading && products.length === 0)
    return <div className="p-4 text-center">Memuat data produk...</div>;

  return (
    <div className="p-4">
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        supplierOptions={supplierOptions}
        saveError={saveError}
        setSaveError={setSaveError}
      />
      {/* Sisa JSX di sini sama persis seperti file asli Anda yang stabil */}
      <ViewNoteModal
        isOpen={noteToView !== null}
        onClose={() => setNoteToView(null)}
        note={noteToView}
      />
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        filters={activeFilters}
        cascadeOptions={cascadeOptions}
        priceCounts={priceCounts}
      />
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Manajemen Produk</h1>
        <div className="flex gap-2 flex-col md:flex-row w-full md:w-auto">
          <ImportExcelButton onDataUpload={handleDataUpload} />
          <ExportExcelButton data={products} fileName="daftar-produk" />
          <button
            onClick={handleOpenAddModal}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            <FiPlus />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <FiSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Kode, Nama, Merek, Kategori..."
            className={`w-full p-2 pl-10 pr-12 border rounded-lg ${
              isListening ? "border-red-400 bg-red-50" : ""
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {voiceSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title={isListening ? "Stop rekam" : "Cari dengan suara"}
            >
              <FiMic size={18} />
            </button>
          )}
          {isListening && transcript && (
            <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg text-sm text-slate-500 italic z-10">
              {transcript}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="relative flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-50"
        >
          <FiFilter />
          <span>Filter</span>
          {(() => {
            const count = Object.values(activeFilters).filter(
              (v) => v !== "semua"
            ).length;
            return count > 0 ? (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            ) : null;
          })()}
        </button>
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg ${
            showLowStockOnly
              ? "bg-yellow-400 text-yellow-900"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <FiAlertTriangle />
          <span>
            {showLowStockOnly ? "Tampilkan Semua" : "Hanya Stok Rendah"}
          </span>
        </button>
        <button
          onClick={() => setShowOnlyUnupdated(!showOnlyUnupdated)}
          className={`flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg ${
            showOnlyUnupdated
              ? "bg-orange-400 text-orange-900"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <FiClock />
          <span>
            {showOnlyUnupdated ? "Tampilkan Semua" : "Belum Diupdate"}
          </span>
        </button>
      </div>
      {Object.values(activeFilters).some((v) => v !== "semua") && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (value === "semua") return null;
            const labels = {
              merek: "Merek",
              kategori: "Kategori",
              ukuran: "Ukuran",
              lini_produk: "Lini",
              price_range: "Harga",
              supplier: "Supplier",
              status: "Status",
            };
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                {labels[key]}: {value}
                <button
                  onClick={() =>
                    setActiveFilters((prev) => ({ ...prev, [key]: "semua" }))
                  }
                  className="ml-1 text-blue-600 hover:text-blue-900 font-bold"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      {showLowStockOnly && (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
          role="alert"
        >
          <p className="font-bold">Mode Stok Rendah Aktif</p>
        </div>
      )}
      {showOnlyUnupdated && (
        <div
          className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4"
          role="alert"
        >
          <p className="font-bold">Mode Belum Diupdate Aktif — Menampilkan produk yang belum diupdate sejak 20 April 2026</p>
        </div>
      )}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-slate-200">
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Kode
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nama Produk
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Ukuran
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Merek
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Kategori
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Harga Beli
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Harga Grosir
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Harga Jual
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Stok
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Stok Min
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Catatan
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Terakhir Update
              </th>
              <th className="px-5 py-3 border-b-2 border-slate-300 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              paginatedProducts.map((product) => {
                const isLowStock = product.stok <= product.stok_min;
                return (
                  <tr
                    key={product.id}
                    className={isLowStock ? "bg-red-100" : "hover:bg-slate-50"}
                  >
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.kode}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.nama}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.ukuran || "-"}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.merek}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.kategori}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      {product.supplier || "-"}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      Rp{" "}
                      {new Intl.NumberFormat("id-ID").format(
                        product.harga_beli,
                      )}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      Rp{" "}
                      {new Intl.NumberFormat("id-ID").format(
                        product.harga_grosir || 0,
                      )}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm whitespace-nowrap">
                      Rp{" "}
                      {new Intl.NumberFormat("id-ID").format(
                        product.harga_jual,
                      )}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm text-center">
                      {product.stok}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm text-center">
                      {product.stok_min}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm">
                      <button
                        onClick={() => setNoteToView(product.catatan)}
                        className="text-blue-500 hover:underline disabled:text-slate-400 disabled:no-underline"
                        disabled={!product.catatan}
                      >
                        <p className="truncate w-32">
                          {product.catatan || "-"}
                        </p>
                      </button>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 font-semibold leading-tight rounded-full ${
                          product.status === "Aktif"
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-900"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm text-center whitespace-nowrap">
                      {(() => {
                        const updatedAt = new Date(product.updated_at);
                        const isUpdated = updatedAt > cutoffDate;
                        const formattedDate = new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(updatedAt);
                        return (
                          <span
                            className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${
                              isUpdated
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                            title={`Terakhir diupdate: ${formattedDate}`}
                          >
                            {isUpdated
                              ? "Sudah Diupdate"
                              : "Belum Diupdate"}
                            <br />
                            <span className="font-normal opacity-75">
                              {formattedDate}
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-200 text-sm text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-slate-100"
                          title="Edit Produk"
                        >
                          <FiEdit size={18} />
                        </button>
                        <Link
                          to={`/produk/riwayat/${product.id}`}
                          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-slate-100"
                          title="Lihat Riwayat"
                        >
                          <FiClock size={18} />
                        </Link>
                        <button
                          onClick={() =>
                            handleDeleteProduct(product.id, product.nama)
                          }
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"
                          title="Arsipkan Produk"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="13" className="text-center py-10 text-slate-500">
                  Tidak ada data produk yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Tampilan Mobile */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredProducts.length > 0 ? (
          paginatedProducts.map((product) => {
            const isLowStock = product.stok <= product.stok_min;
            return (
              <div
                key={product.id}
                className={`bg-white p-4 rounded-lg shadow ${
                  isLowStock
                    ? "border-l-4 border-red-500"
                    : "border-l-4 border-transparent"
                }`}
              >
                {/* Info Nama & Status */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800 pr-2">
                    {product.nama}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full whitespace-nowrap ${
                      product.status === "Aktif"
                        ? "bg-green-100 text-green-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>

                {/* Info Detail Produk */}
                <div className="text-sm space-y-1">
                  <p className="text-slate-400">Kode: {product.kode || "-"}</p>
                  <p className="text-slate-600">
                    Ukuran: {product.ukuran || "-"}
                  </p>
                  <p className="text-slate-600">
                    {product.merek || "Tanpa Merek"}
                  </p>
                  <p className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                    {product.kategori}
                  </p>
                </div>

                <div className="my-3 border-t border-slate-200"></div>

                {/* Info Update Status */}
                <div className="mb-3">
                  {(() => {
                    const updatedAt = new Date(product.updated_at);
                    const isUpdated = updatedAt > cutoffDate;
                    const formattedDate = new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(updatedAt);
                    return (
                      <span
                        className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${
                          isUpdated
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {isUpdated ? "Sudah Diupdate" : "Belum Diupdate"} ·{" "}
                        {formattedDate}
                      </span>
                    );
                  })()}
                </div>

                {/* Info Stok & Harga */}
                <div className="flex justify-between items-end">
                  {/* Kiri: Info Stok */}
                  <div className="text-sm">
                    <p className="text-slate-500">Stok</p>
                    <p
                      className={`font-semibold ${
                        isLowStock ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {product.stok}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (Min: {product.stok_min})
                      </span>
                    </p>
                  </div>

                  {/* Kanan: Info Harga (Beli, Grosir, Jual) */}
                  <div className="text-right">
                    <p className="text-base text-slate-500 mt-2">
                      Beli:{" "}
                      <span className="text-base font-semibold text-slate-700">
                        Rp{" "}
                        {new Intl.NumberFormat("id-ID").format(
                          product.harga_beli,
                        )}
                      </span>
                    </p>
                    <p className="text-base text-slate-500 mt-1">
                      Grosir:{" "}
                      <span className="text-base font-semibold text-blue-600">
                        Rp{" "}
                        {new Intl.NumberFormat("id-ID").format(
                          product.harga_grosir,
                        )}
                      </span>
                    </p>
                    <p className="text-base text-slate-500 mt-1">
                      Jual:{" "}
                      <span className="text-lg font-bold text-orange-500">
                        Rp{" "}
                        {new Intl.NumberFormat("id-ID").format(
                          product.harga_jual,
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-slate-500 sm:col-span-2">Tidak ada produk.</p>
        )}
      </div>
      {/* Pagination Controls */}
      {filteredProducts.length > itemsPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Menampilkan {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProducts.length)} dari {filteredProducts.length} produk
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .reduce((acc, page, idx, arr) => {
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  acc.push("...");
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-slate-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      currentPage === item
                        ? "bg-orange-500 text-white border-orange-500 font-bold"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Produk;

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../supabaseClient";
import DynamicPricingBadge from "./DynamicPricingBadge.jsx";

function ProductModal({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  supplierOptions,
  saveError,
  setSaveError,
}) {
  const initialProductState = {
    kode: "",
    nama: "",
    merek: "",
    kategori: "",
    supplier: "",
    harga_beli: "",
    harga_jual: "",
    harga_coret: "",
    stok: "",
    stok_min: "",
    catatan: "",
    search_synonyms: "",
    status: "Aktif",
    satuan_dasar: "Pcs",
    satuan_pembelian: "",
    nilai_konversi: "",
    ukuran: "",
    harga_grosir: "",
    berat_gram: "",
    panjang_cm: "",
    lebar_cm: "",
    tinggi_cm: "",
    image_url: "",
    image_url_2: "",
    image_url_3: "",
    color_swatch_url: "",
    vehicle_kategori_id: "",
    vehicle_brand_id: "",
    vehicle_model_id: "",
    vehicle_code_id: "",
    selectedVehicleModels: [],
    hasVehicleCompatibility: false,
  };

  const [product, setProduct] = useState(initialProductState);
  const [originalHargaBeli, setOriginalHargaBeli] = useState(null);
  const [hasVehicleCompatibility, setHasVehicleCompatibility] = useState(false);
  const [vehicleKategoris, setVehicleKategoris] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [vehicleCodes, setVehicleCodes] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setOriginalHargaBeli(productToEdit.harga_beli);
        setProduct({
          id: productToEdit.id,
          kode: productToEdit.kode || "",
          nama: productToEdit.nama || "",
          merek: productToEdit.merek || "",
          kategori: productToEdit.kategori || "",
          supplier: productToEdit.supplier || "",
          harga_beli: String(productToEdit.harga_beli || ""),
          harga_jual: String(productToEdit.harga_jual || ""),
          harga_coret: productToEdit.harga_coret
            ? String(productToEdit.harga_coret)
            : "",
          stok: String(productToEdit.stok || ""),
          stok_min: String(productToEdit.stok_min || ""),
          catatan: productToEdit.catatan || "",
          search_synonyms: productToEdit.search_synonyms || "",
          status: productToEdit.status || "Aktif",
          satuan_dasar: productToEdit.satuan_dasar || "Pcs",
          satuan_pembelian: productToEdit.satuan_pembelian || "",
          nilai_konversi: String(productToEdit.nilai_konversi || ""),
          ukuran: productToEdit.ukuran || "",
          harga_grosir: String(productToEdit.harga_grosir || ""),
          berat_gram: productToEdit.berat_gram ? String(productToEdit.berat_gram) : "",
          panjang_cm: productToEdit.panjang_cm ? String(productToEdit.panjang_cm) : "",
          lebar_cm: productToEdit.lebar_cm ? String(productToEdit.lebar_cm) : "",
          tinggi_cm: productToEdit.tinggi_cm ? String(productToEdit.tinggi_cm) : "",
          image_url: productToEdit.image_url || "",
          image_url_2: productToEdit.image_url_2 || "",
          image_url_3: productToEdit.image_url_3 || "",
          color_swatch_url: productToEdit.color_swatch_url || "",
          vehicle_kategori_id: productToEdit.vehicle_kategori_id || "",
          vehicle_brand_id: productToEdit.vehicle_brand_id || "",
          vehicle_model_id: productToEdit.vehicle_model_id || "",
          vehicle_code_id: productToEdit.vehicle_code_id || "",
          selectedVehicleModels: [],
        });
      } else {
        setProduct(initialProductState);
        setOriginalHargaBeli(null);
      }
      fetchVehicleKategoris();
      fetchVehicleBrands();
    }
  }, [productToEdit, isOpen]);

  useEffect(() => {
    if (product.vehicle_brand_id) {
      fetchVehicleModels(product.vehicle_brand_id);
    } else {
      setVehicleModels([]);
      setVehicleCodes([]);
    }
  }, [product.vehicle_brand_id]);

  useEffect(() => {
    if (product.vehicle_brand_id && product.vehicle_model_id) {
      fetchVehicleCodes(product.vehicle_brand_id, product.vehicle_model_id);
    } else {
      setVehicleCodes([]);
    }
  }, [product.vehicle_brand_id, product.vehicle_model_id]);

  useEffect(() => {
    if (productToEdit && productToEdit.id) {
      supabase
        .from("product_vehicle_compatibilities")
        .select("vehicle_model_id")
        .eq("product_id", productToEdit.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const modelIds = data.map((c) => c.vehicle_model_id);
            setProduct((prev) => ({ ...prev, selectedVehicleModels: modelIds }));
            setHasVehicleCompatibility(true);
          } else {
            setHasVehicleCompatibility(false);
          }
        });
    } else {
      setHasVehicleCompatibility(false);
    }
  }, [productToEdit]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (saveError) setSaveError("");
    const numericFields = [
      "harga_beli",
      "harga_jual",
      "harga_coret",
      "stok",
      "stok_min",
      "nilai_konversi",
      "harga_grosir",
      "berat_gram",
    ];
    const decimalFields = ["panjang_cm", "lebar_cm", "tinggi_cm"];
    if (numericFields.includes(id)) {
      setProduct((prev) => ({ ...prev, [id]: value.replace(/[^0-9]/g, "") }));
    } else if (decimalFields.includes(id)) {
      const sanitized = value.replace(/[^0-9.]/g, "");
      const parts = sanitized.split(".");
      const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : sanitized;
      setProduct((prev) => ({ ...prev, [id]: clean }));
    } else {
      setProduct((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { selectedVehicleModels, ...finalProduct } = {
      ...product,
      harga_beli: Number(product.harga_beli) || 0,
      harga_jual: Number(product.harga_jual) || 0,
      harga_coret: product.harga_coret
        ? Number(product.harga_coret)
        : null,
      stok: Number(product.stok) || 0,
      stok_min: Number(product.stok_min) || 0,
      nilai_konversi: Number(product.nilai_konversi) || 1,
      harga_grosir: Number(product.harga_grosir) || 0,
      berat_gram: Number(product.berat_gram) || 500,
      panjang_cm: Number(product.panjang_cm) || 10,
      lebar_cm: Number(product.lebar_cm) || 10,
      tinggi_cm: Number(product.tinggi_cm) || 10,
      image_url: product.image_url || null,
      image_url_2: product.image_url_2 || null,
      image_url_3: product.image_url_3 || null,
      color_swatch_url: product.color_swatch_url || null,
      vehicle_kategori_id: hasVehicleCompatibility && product.vehicle_kategori_id ? Number(product.vehicle_kategori_id) : null,
      vehicle_brand_id: hasVehicleCompatibility && product.vehicle_brand_id ? Number(product.vehicle_brand_id) : null,
      vehicle_model_id: hasVehicleCompatibility && product.vehicle_model_id ? Number(product.vehicle_model_id) : null,
      vehicle_code_id: hasVehicleCompatibility && product.vehicle_code_id ? Number(product.vehicle_code_id) : null,
    };

    await onSave(finalProduct, hasVehicleCompatibility ? (selectedVehicleModels || []) : []);
  };

  const applyDiscountPreset = (pct) => {
    if (saveError) setSaveError("");
    const jual = Number(product.harga_jual) || 0;
    if (jual <= 0) {
      setSaveError(
        "Isi Harga Jual terlebih dahulu sebelum memilih preset diskon.",
      );
      return;
    }
    const coret = Math.round(jual / (1 - pct / 100));
    setProduct((prev) => ({ ...prev, harga_coret: String(coret) }));
  };

  const jualNum = Number(product.harga_jual) || 0;
  const coretNum = Number(product.harga_coret) || 0;
  const hasValidDiscount = coretNum > jualNum && jualNum > 0;
  const diskonPreviewPct = hasValidDiscount
    ? Math.round(((coretNum - jualNum) / coretNum) * 100)
    : 0;

  const handleClose = () => {
    if (saveError) setSaveError("");
    onClose();
  };

  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
            } else {
              reject(new Error("Gagal konversi WebP"));
            }
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e, slot) => {
    const file = e.target.files[0];
    if (!file) return;

    const isPilok = product.kategori === "Pilok";
    if (!isPilok && (!product.kategori || !product.merek)) {
      alert("Isi Kategori dan Merek terlebih dahulu sebelum upload gambar untuk produk non-Pilok.");
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const webpFile = await convertToWebP(compressedFile);

      const productId = productToEdit?.id || Date.now();
      const bucket = isPilok ? "produk-pilok" : "produk-parts";

      let filePath;
      if (isPilok) {
        filePath = `public/${productId}-${slot}.webp`;
      } else {
        const kategoriSlug = slugify(product.kategori || "lainnya");
        const merekSlug = slugify(product.merek || "umum");
        filePath = `${kategoriSlug}/${merekSlug}/${productId}-${slot}.webp`;
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, webpFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProduct((prev) => ({ ...prev, [slot]: publicUrl }));
    } catch (error) {
      console.error("Error upload gambar:", error);
      alert(`Gagal upload gambar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleRemoveImage = (slot) => {
    setProduct((prev) => ({ ...prev, [slot]: "" }));
  };

  const fetchVehicleKategoris = async () => {
    const { data } = await supabase.from("vehicle_kategori").select("*").order("name");
    setVehicleKategoris(data || []);
  };

  const fetchVehicleBrands = async () => {
    const { data } = await supabase.from("vehicle_brands").select("*").order("name");
    setVehicleBrands(data || []);
  };

  const fetchVehicleModels = async (brandId) => {
    if (!brandId) {
      setVehicleModels([]);
      return;
    }
    const { data } = await supabase
      .from("vehicle_models")
      .select("*")
      .eq("brand_id", Number(brandId))
      .order("name");
    setVehicleModels(data || []);
  };

  const fetchVehicleCodes = async (brandId, modelId) => {
    let query = supabase.from("vehicle_codes").select("*").eq("is_active", true);
    if (brandId) query = query.eq("vehicle_brand_id", Number(brandId));
    if (modelId) query = query.eq("vehicle_model_id", Number(modelId));
    const { data } = await query.order("code");
    setVehicleCodes(data || []);
  };

  const toggleVehicleModel = (modelId) => {
    setProduct((prev) => {
      const current = prev.selectedVehicleModels || [];
      const updated = current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId];
      return { ...prev, selectedVehicleModels: updated };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {productToEdit ? "Edit Produk" : "Tambah Produk Baru"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="kode"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Kode Produk
              </label>
              <input
                id="kode"
                type="text"
                value={product.kode}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label
                htmlFor="nama"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Nama Produk
              </label>
              <input
                id="nama"
                type="text"
                value={product.nama}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label
                htmlFor="merek"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Merek
              </label>
              <input
                id="merek"
                type="text"
                value={product.merek}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label
                htmlFor="kategori"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Kategori
              </label>
              <input
                id="kategori"
                type="text"
                value={product.kategori}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label
                htmlFor="ukuran"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Ukuran (Cth: 150ml, 300ml)
              </label>
              <input
                id="ukuran"
                type="text"
                value={product.ukuran || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Contoh: 150ml"
              />
            </div>
            <div>
              <label
                htmlFor="harga_grosir"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Harga Grosir Default (Rp)
              </label>
              <input
                id="harga_grosir"
                type="text"
                value={
                  product.harga_grosir
                    ? new Intl.NumberFormat("id-ID").format(
                        product.harga_grosir,
                      )
                    : ""
                }
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Image URL Display & Upload */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2 text-slate-800">Gambar Produk</h3>
            <p className="text-sm text-slate-500 mb-4">Format: JPG/PNG/WebP. Maks 1MB. Otomatis konversi ke WebP.</p>
            
            {["image_url", "image_url_2", "image_url_3", "color_swatch_url"].map((slot) => {
              const labels = {
                image_url: "Gambar Utama",
                image_url_2: "Gambar 2",
                image_url_3: "Gambar 3",
                color_swatch_url: "Color Swatch"
              };
              const currentUrl = product[slot] || "";
              return (
                <div key={slot} className="mb-3">
                  <label className="block mb-1 text-sm font-medium text-slate-700">{labels[slot]}</label>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      placeholder="Belum ada gambar"
                      className="flex-1 p-2 border rounded bg-slate-50 text-sm"
                    />
                    {currentUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUrl);
                          alert("URL gambar disalin!");
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium py-2 px-3 rounded"
                      >
                        Copy
                      </button>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(e, slot)}
                      className="hidden"
                      id={`upload-${slot}`}
                    />
                    <label
                      htmlFor={`upload-${slot}`}
                      className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-3 rounded text-sm"
                    >
                      Ganti
                    </label>
                    {currentUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(slot)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {currentUrl && (
                    <img src={currentUrl} alt={labels[slot]} className="mt-1 h-24 object-contain border rounded" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2 text-slate-800">
              📦 Pengaturan Satuan & Konversi
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Isi bagian ini jika produk dibeli dalam satuan besar (grosir) dan
              dijual eceran.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="satuan_dasar"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Satuan Dasar (Ecer)
                </label>
                <input
                  id="satuan_dasar"
                  type="text"
                  value={product.satuan_dasar}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: Pcs, Biji, Botol"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="satuan_pembelian"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Satuan Pembelian (Grosir)
                </label>
                <input
                  id="satuan_pembelian"
                  type="text"
                  value={product.satuan_pembelian}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: Dus, Pack, Box"
                />
              </div>
              <div>
                <label
                  htmlFor="nilai_konversi"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Isi per Grosir
                </label>
                <input
                  id="nilai_konversi"
                  type="text"
                  inputMode="numeric"
                  value={
                    product.nilai_konversi
                      ? new Intl.NumberFormat("id-ID").format(
                          product.nilai_konversi,
                        )
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: 12"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2 text-slate-800">
              📦 Dimensi Pengiriman (cm)
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Digunakan untuk kalkulasi ongkir Biteship (berat fisik & volumetrik).
              Kosongkan bila produk kecil — akan terisi default 10 cm.
            </p>
            <div className="mb-4 max-w-xs">
              <label
                htmlFor="berat_gram"
                className="block mb-1 text-sm font-medium text-slate-700"
              >
                Berat Pengiriman (gram)
              </label>
              <input
                id="berat_gram"
                type="text"
                inputMode="numeric"
                value={product.berat_gram}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Cth: 400"
              />
              <p className="text-xs text-slate-500 mt-1">
                Berat kotor = isi + kemasan. Contoh: pilok 300ml ≈ 400g, oli 0,8L ≈ 750g.
                Kosong = default 500g.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="panjang_cm"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Panjang (cm)
                </label>
                <input
                  id="panjang_cm"
                  type="text"
                  inputMode="decimal"
                  value={product.panjang_cm}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: 10"
                />
              </div>
              <div>
                <label
                  htmlFor="lebar_cm"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Lebar (cm)
                </label>
                <input
                  id="lebar_cm"
                  type="text"
                  inputMode="decimal"
                  value={product.lebar_cm}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: 10"
                />
              </div>
              <div>
                <label
                  htmlFor="tinggi_cm"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Tinggi (cm)
                </label>
                <input
                  id="tinggi_cm"
                  type="text"
                  inputMode="decimal"
                  value={product.tinggi_cm}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Cth: 10"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="supplier"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Supplier
                </label>
                <select
                  id="supplier"
                  value={product.supplier}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {supplierOptions &&
                    supplierOptions.map((s) => (
                      <option key={s.id} value={s.nama_supplier}>
                        {s.nama_supplier}
                      </option>
                    ))}
                </select>
              </div>

              {/* Vehicle Compatibility - only for non-Pilok */}
              {product.kategori !== 'Pilok' && (
                <div className="md:col-span-2 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="hasVehicleCompatibility"
                      checked={hasVehicleCompatibility}
                      onChange={(e) => {
                        setHasVehicleCompatibility(e.target.checked);
                        if (!e.target.checked) {
                          setProduct((prev) => ({
                            ...prev,
                            selectedVehicleModels: [],
                            vehicle_kategori_id: "",
                            vehicle_brand_id: "",
                            vehicle_model_id: "",
                            vehicle_code_id: "",
                          }));
                          setVehicleModels([]);
                          setVehicleCodes([]);
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor="hasVehicleCompatibility" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Kompatibel dengan kendaraan (opsional)
                    </label>
                  </div>
                  
                  <div style={{ display: hasVehicleCompatibility ? 'block' : 'none' }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="vehicle_kategori_id" className="block mb-1 text-sm font-medium text-slate-700">Kategori Motor</label>
                      <select id="vehicle_kategori_id" value={product.vehicle_kategori_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                        <option value="">-- Pilih Kategori --</option>
                        {vehicleKategoris.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vehicle_brand_id" className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
                      <select id="vehicle_brand_id" value={product.vehicle_brand_id || ""} onChange={(e) => { handleChange(e); fetchVehicleModels(e.target.value); }} className="w-full p-2 border rounded bg-white">
                        <option value="">-- Pilih Merek --</option>
                        {vehicleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vehicle_model_id" className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor (Compatible)</label>
                      <div className="border rounded p-2 max-h-40 overflow-y-auto">
                        {vehicleModels.length === 0 ? (
                          <p className="text-sm text-slate-500">Pilih merek terlebih dahulu</p>
                        ) : (
                          vehicleModels.map(model => {
                            const isChecked = (product.selectedVehicleModels || []).includes(model.id);
                            return (
                              <label key={model.id} className="flex items-center gap-2 py-1 hover:bg-slate-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleVehicleModel(model.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{model.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{(product.selectedVehicleModels || []).length} model dipilih</p>
                    </div>
                    <div>
                      <label htmlFor="vehicle_code_id" className="block mb-1 text-sm font-medium text-slate-700">Kode Motor</label>
                      <select id="vehicle_code_id" value={product.vehicle_code_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-white" disabled={!vehicleCodes.length}>
                        <option value="">-- Pilih Kode --</option>
                        {vehicleCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label
                  htmlFor="harga_beli"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Harga Beli (per Satuan Dasar)
                </label>
                <input
                  id="harga_beli"
                  type="text"
                  value={
                    product.harga_beli
                      ? new Intl.NumberFormat("id-ID").format(
                          product.harga_beli,
                        )
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
                {productToEdit && originalHargaBeli !== null && product.harga_beli && Number(product.harga_beli) !== originalHargaBeli && (
                  <div className="mt-2">
                    <DynamicPricingBadge
                      productId={product.id}
                      newHargaBeli={Number(product.harga_beli)}
                      productData={productToEdit}
                      onPriceUpdated={() => setOriginalHargaBeli(Number(product.harga_beli))}
                      onPriceAccepted={(newPrice) => setProduct(prev => ({ ...prev, harga_jual: String(newPrice) }))}
                    />
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="harga_jual"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Harga Jual (per Satuan Dasar)
                </label>
                <input
                  id="harga_jual"
                  type="text"
                  value={
                    product.harga_jual
                      ? new Intl.NumberFormat("id-ID").format(
                          product.harga_jual,
                        )
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="harga_coret"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Harga Coret / Harga Normal Sebelum Diskon (Rp)
                </label>
                <input
                  id="harga_coret"
                  type="text"
                  inputMode="numeric"
                  value={
                    product.harga_coret
                      ? new Intl.NumberFormat("id-ID").format(
                          product.harga_coret,
                        )
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Kosongkan bila tanpa diskon"
                />
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">
                    Preset diskon %:
                  </span>
                  {[5, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDiscountPreset(pct)}
                      className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200"
                    >
                      {pct}%
                    </button>
                  ))}
                  {product.harga_coret && (
                    <button
                      type="button"
                      onClick={() =>
                        setProduct((prev) => ({
                          ...prev,
                          harga_coret: "",
                        }))
                      }
                      className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600 hover:bg-red-500 hover:text-white border border-red-200"
                    >
                      Hapus Diskon
                    </button>
                  )}
                </div>
                {hasValidDiscount && (
                  <p className="text-sm text-emerald-600 font-semibold mt-2">
                    Diskon {diskonPreviewPct}% — coret{" "}
                    {new Intl.NumberFormat("id-ID").format(coretNum)}, jual{" "}
                    {new Intl.NumberFormat("id-ID").format(jualNum)}
                  </p>
                )}
                {product.harga_coret && !hasValidDiscount && jualNum > 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Harga coret harus lebih besar dari harga jual.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="stok"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Stok (dalam Satuan Dasar)
                </label>
                <input
                  id="stok"
                  type="number"
                  value={product.stok}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="stok_min"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Stok Minimal
                </label>
                <input
                  id="stok_min"
                  type="number"
                  value={product.stok_min}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="status"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={product.status}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                  <option value="Diarsipkan">Diarsipkan</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="catatan"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Catatan
                </label>
                <textarea
                  id="catatan"
                  value={product.catatan}
                  onChange={handleChange}
                  rows="3"
                  className="w-full p-2 border rounded"
                ></textarea>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="search_synonyms"
                  className="block mb-1 text-sm font-medium text-slate-700"
                >
                  Sinonim Pencarian
                </label>
                <input
                  type="text"
                  id="search_synonyms"
                  value={product.search_synonyms}
                  onChange={handleChange}
                  placeholder="Pylox, Cat Semprot, Spray Paint"
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Pisahkan dengan koma. Sinonim membantu pelanggan menemukan produk ini saat mencari.
                </p>
              </div>
            </div>
          </div>
          {saveError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
              <strong>Gagal Menyimpan:</strong> {saveError}
            </div>
          )}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-4 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
            >
              {productToEdit ? "Simpan Perubahan" : "Simpan Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default ProductModal;

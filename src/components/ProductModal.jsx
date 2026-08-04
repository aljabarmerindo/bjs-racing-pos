import { useState, useEffect } from "react";
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
    stok: "",
    stok_min: "",
    catatan: "",
    status: "Aktif",
    satuan_dasar: "Pcs",
    satuan_pembelian: "",
    nilai_konversi: "",
    ukuran: "",
    harga_grosir: "",
    panjang_cm: "",
    lebar_cm: "",
    tinggi_cm: "",
  };

  const [product, setProduct] = useState(initialProductState);
  const [originalHargaBeli, setOriginalHargaBeli] = useState(null);

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
          stok: String(productToEdit.stok || ""),
          stok_min: String(productToEdit.stok_min || ""),
          catatan: productToEdit.catatan || "",
          status: productToEdit.status || "Aktif",
          satuan_dasar: productToEdit.satuan_dasar || "Pcs",
          satuan_pembelian: productToEdit.satuan_pembelian || "",
          nilai_konversi: String(productToEdit.nilai_konversi || ""),
          ukuran: productToEdit.ukuran || "",
          harga_grosir: String(productToEdit.harga_grosir || ""),
          panjang_cm: productToEdit.panjang_cm ? String(productToEdit.panjang_cm) : "",
          lebar_cm: productToEdit.lebar_cm ? String(productToEdit.lebar_cm) : "",
          tinggi_cm: productToEdit.tinggi_cm ? String(productToEdit.tinggi_cm) : "",
        });
      } else {
        setProduct(initialProductState);
        setOriginalHargaBeli(null);
      }
    }
  }, [productToEdit, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (saveError) setSaveError("");
    const numericFields = [
      "harga_beli",
      "harga_jual",
      "stok",
      "stok_min",
      "nilai_konversi",
      "harga_grosir",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalProduct = {
      ...product,
      harga_beli: Number(product.harga_beli) || 0,
      harga_jual: Number(product.harga_jual) || 0,
      stok: Number(product.stok) || 0,
      stok_min: Number(product.stok_min) || 0,
      nilai_konversi: Number(product.nilai_konversi) || 1,
      harga_grosir: Number(product.harga_grosir) || 0,
      panjang_cm: Number(product.panjang_cm) || 10,
      lebar_cm: Number(product.lebar_cm) || 10,
      tinggi_cm: Number(product.tinggi_cm) || 10,
    };
    onSave(finalProduct);
  };

  const handleClose = () => {
    if (saveError) setSaveError("");
    onClose();
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
              Digunakan untuk kalkulasi ongkir Biteship (berat volumetrik).
              Kosongkan bila produk kecil — akan terisi default 10 cm.
            </p>
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

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import ProductSearchSelect from "./ProductSearchSelect";

function FlashSaleModal({ isOpen, onClose, onSave, flashSaleToEdit }) {
  const [allProducts, setAllProducts] = useState([]);
  const [flashSale, setFlashSale] = useState({
    product_id: "",
    flash_price: 0,
    original_price: 0,
    stock_allocated: 0,
    harga_beli: 0,
    sort_order: 0,
    is_active: true,
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, nama, kode, harga_jual, harga_beli, stok, kategori, merek")
        .eq("status", "Aktif")
        .order("nama", { ascending: true });
      setAllProducts(data || []);
    };
    fetchProducts();
  }, [isOpen]);

  const categories = useMemo(() => {
    const cats = [...new Set(allProducts.map((p) => p.kategori).filter(Boolean))];
    return cats.sort();
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    if (!flashSale.category) return allProducts;
    return allProducts.filter((p) => p.kategori === flashSale.category);
  }, [allProducts, flashSale.category]);

  const selectedProduct = useMemo(() => {
    if (!flashSale.product_id) return null;
    return allProducts.find((p) => p.id === flashSale.product_id) || null;
  }, [allProducts, flashSale.product_id]);

  const margin = useMemo(() => {
    if (!selectedProduct || !flashSale.flash_price) return 0;
    const buyPrice = selectedProduct.harga_beli || 0;
    if (flashSale.flash_price <= 0) return 0;
    return (((flashSale.flash_price - buyPrice) / flashSale.flash_price) * 100).toFixed(1);
  }, [selectedProduct, flashSale.flash_price]);

  useEffect(() => {
    if (flashSaleToEdit) {
      const product = allProducts.find((p) => p.id === flashSaleToEdit.product_id);
      setFlashSale({
        id: flashSaleToEdit.id,
        product_id: flashSaleToEdit.product_id || "",
        flash_price: flashSaleToEdit.flash_price || 0,
        original_price: flashSaleToEdit.original_price || 0,
        stock_allocated: flashSaleToEdit.stock_allocated || 0,
        harga_beli: product?.harga_beli || 0,
        category: product?.kategori || "",
        sort_order: flashSaleToEdit.sort_order || 0,
        is_active: flashSaleToEdit.is_active ?? true,
        valid_from: flashSaleToEdit.valid_from
          ? new Date(flashSaleToEdit.valid_from).slice(0, 16)
          : "",
        valid_until: flashSaleToEdit.valid_until
          ? new Date(flashSaleToEdit.valid_until).slice(0, 16)
          : "",
      });
    } else {
      setFlashSale({
        product_id: "",
        flash_price: 0,
        original_price: 0,
        stock_allocated: 0,
        harga_beli: 0,
        category: "",
        sort_order: 0,
        is_active: true,
        valid_from: "",
        valid_until: "",
      });
    }
  }, [flashSaleToEdit, isOpen, allProducts]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFlashSale((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleProductSelect = (product) => {
    setFlashSale((prev) => ({
      ...prev,
      product_id: product.id,
      original_price: product.harga_jual || 0,
      stock_allocated: product.stok || 0,
      harga_beli: product.harga_beli || 0,
      category: product.kategori || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...flashSale });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {flashSaleToEdit ? "Edit Flash Sale" : "Tambah Flash Sale Baru"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kategori Produk
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="category-list"
                  value={flashSale.category}
                  onChange={(e) =>
                    setFlashSale((prev) => ({
                      ...prev,
                      category: e.target.value,
                      product_id: "",
                      original_price: 0,
                      stock_allocated: 0,
                      harga_beli: 0,
                    }))
                  }
                  placeholder="Ketik atau pilih kategori..."
                  className="w-full p-2 border rounded"
                  autoComplete="off"
                />
                <datalist id="category-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Produk *
              </label>
              <ProductSearchSelect
                products={filteredProducts}
                onSelect={handleProductSelect}
                placeholder={
                  flashSale.category
                    ? `Cari produk di kategori "${flashSale.category}"...`
                    : "Pilih kategori terlebih dahulu..."
                }
              />
            </div>

            {selectedProduct && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Info Produk
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Harga Beli:</span>
                    <p className="font-medium text-slate-800">
                      Rp {Number(selectedProduct.harga_beli || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Harga Jual:</span>
                    <p className="font-medium text-slate-800">
                      Rp {Number(selectedProduct.harga_jual || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Stok:</span>
                    <p className="font-medium text-slate-800">
                      {selectedProduct.stok || 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Margin:</span>
                    <p className="font-medium text-green-600">{margin}%</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="flash_price" className="block mb-1 text-sm font-medium text-slate-700">
                  Harga Flash (Rp) *
                </label>
                <input
                  id="flash_price"
                  type="number"
                  min="0"
                  value={flashSale.flash_price}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label htmlFor="original_price" className="block mb-1 text-sm font-medium text-slate-700">
                  Harga Asli (Rp)
                </label>
                <input
                  id="original_price"
                  type="text"
                  value={flashSale.original_price ? Number(flashSale.original_price).toLocaleString("id-ID") : ""}
                  readOnly
                  className="w-full p-2 border rounded bg-slate-100 text-slate-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="stock_allocated" className="block mb-1 text-sm font-medium text-slate-700">
                Stok Flash Sale
              </label>
              <input
                id="stock_allocated"
                type="number"
                min="0"
                max={selectedProduct?.stok || 9999}
                value={flashSale.stock_allocated}
                onChange={handleChange}
                className="w-full p-2 border rounded"
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
                value={flashSale.sort_order}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="valid_from" className="block mb-1 text-sm font-medium text-slate-700">
                  Mulai
                </label>
                <input
                  id="valid_from"
                  type="datetime-local"
                  value={flashSale.valid_from}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="valid_until" className="block mb-1 text-sm font-medium text-slate-700">
                  Sampai
                </label>
                <input
                  id="valid_until"
                  type="datetime-local"
                  value={flashSale.valid_until}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={flashSale.is_active}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Aktif
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-4 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
            >
              {flashSaleToEdit ? "Simpan Perubahan" : "Simpan Flash Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FlashSaleModal;

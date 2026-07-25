import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function FlashSaleModal({ isOpen, onClose, onSave, flashSaleToEdit }) {
  const [products, setProducts] = useState([]);
  const [flashSale, setFlashSale] = useState({
    product_id: "",
    flash_price: 0,
    original_price: 0,
    stock_allocated: 0,
    sort_order: 0,
    is_active: true,
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, nama, harga_jual")
        .eq("status", "Aktif")
        .order("nama", { ascending: true });
      setProducts(data || []);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (flashSaleToEdit) {
      setFlashSale({
        id: flashSaleToEdit.id,
        product_id: flashSaleToEdit.product_id || "",
        flash_price: flashSaleToEdit.flash_price || 0,
        original_price: flashSaleToEdit.original_price || 0,
        stock_allocated: flashSaleToEdit.stock_allocated || 0,
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
        sort_order: 0,
        is_active: true,
        valid_from: "",
        valid_until: "",
      });
    }
  }, [flashSaleToEdit, isOpen]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFlashSale((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const product = products.find((p) => p.id === productId);
    setFlashSale((prev) => ({
      ...prev,
      product_id: productId,
      original_price: product?.harga_jual || prev.original_price,
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
              <label htmlFor="product_id" className="block mb-1 text-sm font-medium text-slate-700">
                Produk *
              </label>
              <select
                id="product_id"
                value={flashSale.product_id}
                onChange={handleProductChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Pilih Produk</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nama} (Rp {Number(product.harga_jual).toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
            </div>

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
                  Harga Asli (Rp) *
                </label>
                <input
                  id="original_price"
                  type="number"
                  min="0"
                  value={flashSale.original_price}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
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

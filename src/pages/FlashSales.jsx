import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import FlashSaleModal from "../components/FlashSaleModal";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

function FlashSales() {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flashSaleToEdit, setFlashSaleToEdit] = useState(null);

  const fetchFlashSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("flash_sales")
      .select("*, products(id, nama, harga_jual, image_url)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil data flash sale:", error);
    } else {
      setFlashSales(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const handleAdd = () => {
    setFlashSaleToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (flashSale) => {
    setFlashSaleToEdit(flashSale);
    setIsModalOpen(true);
  };

  const handleDelete = async (flashSale) => {
    if (!window.confirm(`Hapus flash sale "${flashSale.products?.nama || ""}"?`))
      return;
    const { error } = await supabase
      .from("flash_sales")
      .delete()
      .eq("id", flashSale.id);
    if (error) {
      alert("Gagal menghapus flash sale.");
    } else {
      fetchFlashSales();
    }
  };

  const handleSave = async (flashSaleData) => {
    if (flashSaleData.id) {
      const { error } = await supabase
        .from("flash_sales")
        .update({
          product_id: flashSaleData.product_id,
          flash_price: flashSaleData.flash_price,
          original_price: flashSaleData.original_price,
          stock_allocated: flashSaleData.stock_allocated,
          sort_order: flashSaleData.sort_order,
          is_active: flashSaleData.is_active,
          valid_from: flashSaleData.valid_from,
          valid_until: flashSaleData.valid_until,
        })
        .eq("id", flashSaleData.id);
      if (error) {
        alert("Gagal mengupdate flash sale: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("flash_sales").insert({
        product_id: flashSaleData.product_id,
        flash_price: flashSaleData.flash_price,
        original_price: flashSaleData.original_price,
        stock_allocated: flashSaleData.stock_allocated,
        sort_order: flashSaleData.sort_order,
        is_active: flashSaleData.is_active,
        valid_from: flashSaleData.valid_from,
        valid_until: flashSaleData.valid_until,
      });
      if (error) {
        alert("Gagal menambah flash sale: " + error.message);
        return;
      }
    }
    setIsModalOpen(false);
    fetchFlashSales();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatus = (flashSale) => {
    if (!flashSale.is_active) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">
          Tidak Aktif
        </span>
      );
    }
    const now = new Date();
    const validFrom = flashSale.valid_from ? new Date(flashSale.valid_from) : null;
    const validUntil = flashSale.valid_until ? new Date(flashSale.valid_until) : null;

    if (validFrom && validFrom > now) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Terjadwal
        </span>
      );
    }
    if (validUntil && validUntil < now) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Kedaluwarsa
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Aktif
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Flash Sale</h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola produk flash sale yang tampil di homepage
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <FiPlus /> Tambah Flash Sale
        </button>
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Produk</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Harga Flash</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Harga Asli</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Stok</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Berlaku Sampai</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : flashSales.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                  Belum ada flash sale.
                </td>
              </tr>
            ) : (
              flashSales.map((flashSale) => (
                <tr key={flashSale.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {flashSale.products?.image_url && (
                        <img
                          src={flashSale.products.image_url}
                          alt={flashSale.products.nama}
                          className="h-10 w-10 object-contain rounded border"
                        />
                      )}
                      <span className="font-medium text-slate-800">
                        {flashSale.products?.nama || "Produk tidak ditemukan"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-orange-600">
                    Rp {Number(flashSale.flash_price).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 line-through">
                    Rp {Number(flashSale.original_price).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {flashSale.stock_allocated}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(flashSale.valid_until)}
                  </td>
                  <td className="px-4 py-3">{getStatus(flashSale)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(flashSale)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(flashSale)}
                      className="text-red-500 hover:text-red-700 p-1 ml-2"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Memuat data...</p>
        ) : flashSales.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Belum ada flash sale.</p>
        ) : (
          flashSales.map((flashSale) => (
            <div
              key={flashSale.id}
              className="bg-white rounded-lg shadow border border-slate-200 p-4"
            >
              <div className="flex items-center gap-3">
                {flashSale.products?.image_url && (
                  <img
                    src={flashSale.products.image_url}
                    alt={flashSale.products.nama}
                    className="h-12 w-12 object-contain border rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {flashSale.products?.nama || "Produk tidak ditemukan"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Stok: {flashSale.stock_allocated}
                  </p>
                </div>
                {getStatus(flashSale)}
              </div>
              <div className="flex justify-between items-center mt-3">
                <div>
                  <p className="text-sm font-bold text-orange-600">
                    Rp {Number(flashSale.flash_price).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-slate-400 line-through">
                    Rp {Number(flashSale.original_price).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(flashSale)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(flashSale)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <FlashSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        flashSaleToEdit={flashSaleToEdit}
      />
    </div>
  );
}

export default FlashSales;

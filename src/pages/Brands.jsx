import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import BrandModal from "../components/BrandModal.jsx";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState(null);

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Gagal mengambil data brand:", error);
    } else {
      setBrands(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleAdd = () => {
    setBrandToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (brand) => {
    setBrandToEdit(brand);
    setIsModalOpen(true);
  };

  const handleDelete = async (brand) => {
    if (!window.confirm(`Hapus brand "${brand.name}"?`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", brand.id);
    if (error) {
      alert("Gagal menghapus brand.");
    } else {
      fetchBrands();
    }
  };

  const handleSave = async (brandData) => {
    if (brandData.id) {
      const { error } = await supabase
        .from("brands")
        .update({
          name: brandData.name,
          logo_url: brandData.logo_url,
          sort_order: brandData.sort_order,
          is_active: brandData.is_active,
        })
        .eq("id", brandData.id);
      if (error) {
        alert("Gagal mengupdate brand: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("brands").insert({
        name: brandData.name,
        logo_url: brandData.logo_url,
        sort_order: brandData.sort_order,
        is_active: brandData.is_active,
      });
      if (error) {
        alert("Gagal menambah brand: " + error.message);
        return;
      }
    }
    setIsModalOpen(false);
    fetchBrands();
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Brand</h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola daftar brand untuk ditampilkan di homepage
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <FiPlus /> Tambah Brand
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Logo</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Nama Brand</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Urutan</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">Memuat data...</td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">Belum ada brand.</td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="h-10 object-contain" />
                    ) : (
                      <span className="text-slate-300 text-sm italic">Tanpa logo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{brand.name}</td>
                  <td className="px-4 py-3 text-slate-600">{brand.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${brand.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {brand.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(brand)} className="text-blue-500 hover:text-blue-700 p-1"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(brand)} className="text-red-500 hover:text-red-700 p-1 ml-2"><FiTrash2 /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Memuat data...</p>
        ) : brands.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Belum ada brand.</p>
        ) : (
          brands.map((brand) => (
            <div key={brand.id} className="bg-white rounded-lg shadow border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                {brand.logo_url && (
                  <img src={brand.logo_url} alt={brand.name} className="h-12 w-12 object-contain border rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{brand.name}</p>
                  <p className="text-xs text-slate-400">Urutan: {brand.sort_order}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${brand.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {brand.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex justify-end gap-3 mt-3">
                <button onClick={() => handleEdit(brand)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(brand)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <BrandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        brandToEdit={brandToEdit}
      />
    </div>
  );
}

export default Brands;

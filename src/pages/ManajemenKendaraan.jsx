import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import VehicleKategoriModal from "../components/VehicleKategoriModal";
import VehicleBrandModal from "../components/VehicleBrandModal";
import VehicleModelModal from "../components/VehicleModelModal";
import VehicleCodeModal from "../components/VehicleCodeModal";

function ManajemenKendaraan() {
  const [activeTab, setActiveTab] = useState("kategori");
  const [kategoris, setKategoris] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [codes, setCodes] = useState([]);

  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const [kategoriToEdit, setKategoriToEdit] = useState(null);
  const [brandToEdit, setBrandToEdit] = useState(null);
  const [modelToEdit, setModelToEdit] = useState(null);
  const [codeToEdit, setCodeToEdit] = useState(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKategoris();
    fetchBrands();
    fetchModels();
    fetchCodes();
  }, []);

  const fetchKategoris = async () => {
    const { data } = await supabase.from("vehicle_kategori").select("*").order("name");
    setKategoris(data || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("vehicle_brands").select("*").order("name");
    setBrands(data || []);
  };

  const fetchModels = async () => {
    const { data } = await supabase.from("vehicle_models").select("*, vehicle_brands(name), vehicle_kategori(name)").order("name");
    setModels(data || []);
  };

  const fetchCodes = async () => {
    const { data } = await supabase.from("vehicle_codes").select("*, vehicle_models(name, vehicle_brands(name))").order("code");
    setCodes(data || []);
  };

  const handleDelete = async (table, id) => {
    if (!window.confirm("Yakin ingin menghapus data ini?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      if (table === "vehicle_kategori") fetchKategoris();
      if (table === "vehicle_brands") fetchBrands();
      if (table === "vehicle_models") fetchModels();
      if (table === "vehicle_codes") fetchCodes();
    }
  };

  const tabs = [
    { id: "kategori", label: "Kategori Motor", icon: "⚙️" },
    { id: "brand", label: "Merek Motor", icon: "🏭" },
    { id: "model", label: "Tipe Motor", icon: "🏍️" },
    { id: "code", label: "Kode Motor", icon: "🔖" },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Manajemen Kendaraan</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Kategori Tab */}
      {activeTab === "kategori" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Kategori Motor</h2>
            <button onClick={() => { setKategoriToEdit(null); setIsKategoriModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
              + Tambah Kategori
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Nama</th>
                  <th className="text-left py-3 px-4">Icon</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kategoris.map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="py-3 px-4">{k.id}</td>
                    <td className="py-3 px-4">{k.icon} {k.name}</td>
                    <td className="py-3 px-4">{k.icon}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setKategoriToEdit(k); setIsKategoriModalOpen(true); }} className="text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                      <button onClick={() => handleDelete("vehicle_kategori", k.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brand Tab */}
      {activeTab === "brand" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Merek Motor</h2>
            <button onClick={() => { setBrandToEdit(null); setIsBrandModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
              + Tambah Merek
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Nama</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="py-3 px-4">{b.id}</td>
                    <td className="py-3 px-4">{b.name}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setBrandToEdit(b); setIsBrandModalOpen(true); }} className="text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                      <button onClick={() => handleDelete("vehicle_brands", b.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Tab */}
      {activeTab === "model" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Tipe Motor</h2>
            <button onClick={() => { setModelToEdit(null); setIsModelModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
              + Tambah Tipe
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Tipe</th>
                  <th className="text-left py-3 px-4">Merek</th>
                  <th className="text-left py-3 px-4">Kategori</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="py-3 px-4">{m.id}</td>
                    <td className="py-3 px-4">{m.name}</td>
                    <td className="py-3 px-4">{m.vehicle_brands?.name}</td>
                    <td className="py-3 px-4">{m.vehicle_kategori?.name}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setModelToEdit(m); setIsModelModalOpen(true); }} className="text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                      <button onClick={() => handleDelete("vehicle_models", m.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Tab */}
      {activeTab === "code" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Kode Motor</h2>
            <button onClick={() => { setCodeToEdit(null); setIsCodeModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
              + Tambah Kode
            </button>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4">Kode</th>
                  <th className="text-left py-3 px-4">Nama</th>
                  <th className="text-left py-3 px-4">Tipe</th>
                  <th className="text-left py-3 px-4">Tahun</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-3 px-4 font-mono font-bold">{c.code}</td>
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4">{c.vehicle_models?.name}</td>
                    <td className="py-3 px-4">
                      {c.year_start} - {c.year_end || "Sekarang"}
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => { setCodeToEdit(c); setIsCodeModalOpen(true); }} className="text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                      <button onClick={() => handleDelete("vehicle_codes", c.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <VehicleKategoriModal
        isOpen={isKategoriModalOpen}
        onClose={() => setIsKategoriModalOpen(false)}
        kategoriToEdit={kategoriToEdit}
        onSave={fetchKategoris}
      />
      <VehicleBrandModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        brandToEdit={brandToEdit}
        onSave={fetchBrands}
      />
      <VehicleModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        modelToEdit={modelToEdit}
        onSave={fetchModels}
        brands={brands}
        kategoris={kategoris}
      />
      <VehicleCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        codeToEdit={codeToEdit}
        onSave={fetchCodes}
        models={models}
      />
    </div>
  );
}

export default ManajemenKendaraan;

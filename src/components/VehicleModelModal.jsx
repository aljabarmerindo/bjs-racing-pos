import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function VehicleModelModal({ isOpen, onClose, modelToEdit, onSave, brands, kategoris }) {
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modelToEdit) {
      setName(modelToEdit.name || "");
      setBrandId(modelToEdit.brand_id || "");
      setKategoriId(modelToEdit.vehicle_kategori_id || "");
    } else {
      setName("");
      setBrandId("");
      setKategoriId("");
    }
  }, [modelToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name,
        brand_id: Number(brandId),
        vehicle_kategori_id: kategoriId ? Number(kategoriId) : null,
      };
      let error;
      if (modelToEdit) {
        ({ error } = await supabase.from("vehicle_models").update(data).eq("id", modelToEdit.id));
      } else {
        ({ error } = await supabase.from("vehicle_models").insert(data));
      }
      if (error) throw error;
      onSave();
    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{modelToEdit ? "Edit" : "Tambah"} Tipe Motor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
              <option value="">-- Pilih Merek --</option>
              {brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Kategori Motor</label>
            <select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} className="w-full p-2 border rounded bg-white">
              <option value="">-- Pilih Kategori --</option>
              {kategoris?.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Nama Tipe</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required placeholder="Cth: Vario, Nmax" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-4 rounded">Batal</button>
            <button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleModelModal;

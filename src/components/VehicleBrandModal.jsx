import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function VehicleBrandModal({ isOpen, onClose, brandToEdit, onSave }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brandToEdit) {
      setName(brandToEdit.name || "");
    } else {
      setName("");
    }
  }, [brandToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { name };
      let error;
      if (brandToEdit) {
        ({ error } = await supabase.from("vehicle_brands").update(data).eq("id", brandToEdit.id));
      } else {
        ({ error } = await supabase.from("vehicle_brands").insert(data));
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
        <h2 className="text-xl font-bold mb-4">{brandToEdit ? "Edit" : "Tambah"} Merek Motor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Nama Merek</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required placeholder="Cth: Honda, Yamaha" />
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

export default VehicleBrandModal;

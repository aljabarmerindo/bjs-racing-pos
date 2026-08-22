import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function VehicleKategoriModal({ isOpen, onClose, kategoriToEdit, onSave }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kategoriToEdit) {
      setName(kategoriToEdit.name || "");
      setIcon(kategoriToEdit.icon || "");
    } else {
      setName("");
      setIcon("");
    }
  }, [kategoriToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { name, icon };
      let error;
      if (kategoriToEdit) {
        ({ error } = await supabase.from("vehicle_kategori").update(data).eq("id", kategoriToEdit.id));
      } else {
        ({ error } = await supabase.from("vehicle_kategori").insert(data));
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
        <h2 className="text-xl font-bold mb-4">{kategoriToEdit ? "Edit" : "Tambah"} Kategori Motor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Nama Kategori</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required placeholder="Cth: Matic, Bebek, Sport" />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Icon (Emoji)</label>
            <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full p-2 border rounded" placeholder="Cth: ⚙️, 🏍️, 🔥" />
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

export default VehicleKategoriModal;

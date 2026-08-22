import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function VehicleCodeModal({ isOpen, onClose, codeToEdit, onSave, models }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (codeToEdit) {
      setCode(codeToEdit.code || "");
      setName(codeToEdit.name || "");
      setModelId(codeToEdit.vehicle_model_id || "");
      setYearStart(codeToEdit.year_start || "");
      setYearEnd(codeToEdit.year_end || "");
    } else {
      setCode("");
      setName("");
      setModelId("");
      setYearStart("");
      setYearEnd("");
    }
  }, [codeToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        code,
        name,
        vehicle_model_id: Number(modelId),
        year_start: yearStart ? Number(yearStart) : null,
        year_end: yearEnd ? Number(yearEnd) : null,
      };
      let error;
      if (codeToEdit) {
        ({ error } = await supabase.from("vehicle_codes").update(data).eq("id", codeToEdit.id));
      } else {
        ({ error } = await supabase.from("vehicle_codes").insert(data));
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
        <h2 className="text-xl font-bold mb-4">{codeToEdit ? "Edit" : "Tambah"} Kode Motor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Kode</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full p-2 border rounded" required placeholder="Cth: KVB" />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required placeholder="Cth: Honda Vario 125 Carburetor" />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
              <option value="">-- Pilih Tipe --</option>
              {models?.map(m => <option key={m.id} value={m.id}>{m.name} - {m.vehicle_brands?.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">Tahun Mulai</label>
              <input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} className="w-full p-2 border rounded" placeholder="Cth: 2006" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">Tahun Akhir</label>
              <input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} className="w-full p-2 border rounded" placeholder="Kosongkan jika masih diproduksi" />
            </div>
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

export default VehicleCodeModal;

import { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../supabaseClient";

function BrandModal({ isOpen, onClose, onSave, brandToEdit }) {
  const [brand, setBrand] = useState({
    name: "",
    logo_url: "",
    sort_order: 0,
    is_active: true,
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (brandToEdit) {
      setBrand({
        id: brandToEdit.id,
        name: brandToEdit.name || "",
        logo_url: brandToEdit.logo_url || "",
        sort_order: brandToEdit.sort_order || 0,
        is_active: brandToEdit.is_active ?? true,
      });
      setPreviewUrl(brandToEdit.logo_url || "");
    } else {
      setBrand({ name: "", logo_url: "", sort_order: 0, is_active: true });
      setPreviewUrl("");
    }
  }, [brandToEdit, isOpen]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setBrand((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const filePath = `brand-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(filePath);

      setBrand((prev) => ({ ...prev, logo_url: publicUrl }));
      setPreviewUrl(publicUrl);
    } catch (error) {
      console.error("Error upload logo:", error);
      alert(`Gagal upload logo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setBrand((prev) => ({ ...prev, logo_url: "" }));
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...brand });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {brandToEdit ? "Edit Brand" : "Tambah Brand Baru"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nama Brand */}
            <div>
              <label htmlFor="name" className="block mb-1 text-sm font-medium text-slate-700">
                Nama Brand *
              </label>
              <input
                id="name"
                type="text"
                value={brand.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                placeholder="Contoh: Yoshimura"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Logo Brand
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="brand-logo"
                />
                <label
                  htmlFor="brand-logo"
                  className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded transition-colors"
                >
                  {uploading ? "Mengupload..." : "Pilih Logo"}
                </label>
                {brand.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Preview Logo"
                    className="h-20 object-contain border rounded p-2"
                  />
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Format: PNG, JPG, atau WebP. Maks 500KB (akan dikompres otomatis).
              </p>
            </div>

            {/* Urutan & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sort_order" className="block mb-1 text-sm font-medium text-slate-700">
                  Urutan Tampil
                </label>
                <input
                  id="sort_order"
                  type="number"
                  min="0"
                  max="99"
                  value={brand.sort_order}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-slate-400 mt-1">Urutan dari kecil ke besar</p>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={brand.is_active}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Aktif</span>
                </label>
              </div>
            </div>
          </div>

          {/* Buttons */}
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
              disabled={uploading}
              className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {brandToEdit ? "Simpan Perubahan" : "Simpan Brand"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BrandModal;

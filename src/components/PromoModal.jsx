import { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../supabaseClient";

const GRADIENT_OPTIONS = [
  { label: "Slate Gelap", value: "from-slate-900 via-slate-800 to-slate-900" },
  { label: "Orange", value: "from-orange-600 via-orange-500 to-orange-600" },
  { label: "Biru", value: "from-blue-700 via-blue-600 to-blue-700" },
  { label: "Hijau", value: "from-green-700 via-green-600 to-green-700" },
  { label: "Ungu", value: "from-purple-700 via-purple-600 to-purple-700" },
  { label: "Merah", value: "from-red-700 via-red-600 to-red-700" },
];

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 16);
};

function PromoModal({ isOpen, onClose, onSave, promoToEdit }) {
  const [promo, setPromo] = useState({
    title: "",
    subtitle: "",
    cta_text: "Belanja Sekarang",
    cta_href: "/",
    image_url: "",
    bg_gradient: "from-slate-900 via-slate-800 to-slate-900",
    sort_order: 0,
    is_active: true,
    valid_from: "",
    valid_until: "",
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (promoToEdit) {
      setPromo({
        ...promoToEdit,
        valid_from: formatDateForInput(promoToEdit.valid_from),
        valid_until: formatDateForInput(promoToEdit.valid_until),
      });
      setPreviewUrl(promoToEdit.image_url || "");
    } else {
      setPromo({
        title: "",
        subtitle: "",
        cta_text: "Belanja Sekarang",
        cta_href: "/",
        image_url: "",
        bg_gradient: "from-slate-900 via-slate-800 to-slate-900",
        sort_order: 0,
        is_active: true,
        valid_from: "",
        valid_until: "",
      });
      setPreviewUrl("");
    }
  }, [promoToEdit, isOpen]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setPromo((prev) => ({
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
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const filePath = `promo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("promo-banners")
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("promo-banners")
        .getPublicUrl(filePath);

      setPromo((prev) => ({ ...prev, image_url: publicUrl }));
      setPreviewUrl(publicUrl);
    } catch (error) {
      console.error("Error upload gambar:", error);
      alert(`Gagal upload gambar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPromo((prev) => ({ ...prev, image_url: "" }));
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...promo,
      valid_from: promo.valid_from || null,
      valid_until: promo.valid_until || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {promoToEdit ? "Edit Promo" : "Tambah Promo Baru"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Judul */}
            <div>
              <label htmlFor="title" className="block mb-1 text-sm font-medium text-slate-700">
                Judul Promo *
              </label>
              <input
                id="title"
                type="text"
                value={promo.title}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                placeholder="Contoh: Promo Spesial Racing Gear"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label htmlFor="subtitle" className="block mb-1 text-sm font-medium text-slate-700">
                Deskripsi Singkat
              </label>
              <input
                id="subtitle"
                type="text"
                value={promo.subtitle || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Contoh: Diskon hingga 30% untuk helm dan jaket racing"
              />
            </div>

            {/* CTA Text & Link */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cta_text" className="block mb-1 text-sm font-medium text-slate-700">
                  Teks Tombol
                </label>
                <input
                  id="cta_text"
                  type="text"
                  value={promo.cta_text || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Belanja Sekarang"
                />
              </div>
              <div>
                <label htmlFor="cta_href" className="block mb-1 text-sm font-medium text-slate-700">
                  Link Tombol
                </label>
                <input
                  id="cta_href"
                  type="text"
                  value={promo.cta_href || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="/katalog-warna"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Gambar Promo
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="promo-image"
                />
                <label
                  htmlFor="promo-image"
                  className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded transition-colors"
                >
                  {uploading ? "Mengupload..." : "Pilih Gambar"}
                </label>
                {promo.image_url && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Format: PNG, JPG, atau WebP. Maks 1MB (akan dikompres otomatis).
              </p>
            </div>

            {/* Gradient Fallback */}
            <div>
              <label htmlFor="bg_gradient" className="block mb-1 text-sm font-medium text-slate-700">
                Gradient Fallback (jika tidak ada gambar)
              </label>
              <select
                id="bg_gradient"
                value={promo.bg_gradient}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                {GRADIENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                  value={promo.sort_order}
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
                    checked={promo.is_active}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Aktif</span>
                </label>
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="valid_from" className="block mb-1 text-sm font-medium text-slate-700">
                  Berlaku Mulai
                </label>
                <input
                  id="valid_from"
                  type="datetime-local"
                  value={promo.valid_from}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label htmlFor="valid_until" className="block mb-1 text-sm font-medium text-slate-700">
                  Berlaku Sampai
                </label>
                <input
                  id="valid_until"
                  type="datetime-local"
                  value={promo.valid_until}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-slate-400 mt-1">Kosongkan jika tidak ada batas waktu</p>
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
              {promoToEdit ? "Simpan Perubahan" : "Simpan Promo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PromoModal;

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function extractYouTubeId(input) {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1).split("/")[0] || "";
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const parts = url.pathname.split("/");
      if (parts[1] === "embed" || parts[1] === "v") return parts[2] || "";
    }
  } catch {
    // not a valid URL, ignore
  }
  return trimmed;
}

function VideoModal({ isOpen, onClose, onSave, videoToEdit }) {
  const [video, setVideo] = useState({
    youtube_video_id: "",
    title: "",
    product_name: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (videoToEdit) {
      setVideo({
        id: videoToEdit.id,
        youtube_video_id: videoToEdit.youtube_video_id || "",
        title: videoToEdit.title || "",
        product_name: videoToEdit.product_name || "",
        sort_order: videoToEdit.sort_order || 0,
        is_active: videoToEdit.is_active ?? true,
      });
    } else {
      setVideo({
        youtube_video_id: "",
        title: "",
        product_name: "",
        sort_order: 0,
        is_active: true,
      });
    }
  }, [videoToEdit, isOpen]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    if (id === "youtube_video_id") {
      const extracted = extractYouTubeId(value);
      setVideo((prev) => ({
        ...prev,
        youtube_video_id: extracted || value,
      }));
      return;
    }
    setVideo((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(video);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {videoToEdit ? "Edit Video" : "Tambah Video Baru"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* YouTube Video ID */}
            <div>
              <label htmlFor="youtube_video_id" className="block mb-1 text-sm font-medium text-slate-700">
                YouTube Video ID *
              </label>
              <input
                id="youtube_video_id"
                type="text"
                value={video.youtube_video_id}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                placeholder="Contoh: gXK47ZXUudw"
              />
              <p className="text-xs text-slate-400 mt-1">
                Bisa paste URL YouTube: https://www.youtube.com/watch?v=<strong>gXK47ZXUudw</strong>
              </p>
            </div>

            {/* Judul Video */}
            <div>
              <label htmlFor="title" className="block mb-1 text-sm font-medium text-slate-700">
                Judul Video *
              </label>
              <input
                id="title"
                type="text"
                value={video.title}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                placeholder="Contoh: Demo Spray Paint Metallic BJS Racing"
              />
            </div>

            {/* Nama Produk */}
            <div>
              <label htmlFor="product_name" className="block mb-1 text-sm font-medium text-slate-700">
                Nama Produk
              </label>
              <input
                id="product_name"
                type="text"
                value={video.product_name || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Contoh: Pilok Metallic Series"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sort_order" className="block mb-1 text-sm font-medium text-slate-700">
                Urutan Tampil
              </label>
              <input
                id="sort_order"
                type="number"
                value={video.sort_order}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
              />
              <p className="text-xs text-slate-400 mt-1">
                Angka lebih kecil = tampil lebih awal di carousel.
              </p>
            </div>

            {/* Status Aktif */}
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={video.is_active}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Aktif (tampil di halaman store)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VideoModal;

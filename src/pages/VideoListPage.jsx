import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FiPlus, FiEdit, FiTrash2, FiPlay } from "react-icons/fi";
import VideoModal from "../components/VideoModal";

const VideoListPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat video:", error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { getUserRole } = await import("../config/aiConfig.js");
      const role = await getUserRole();
      setUserRole(role);
      if (role === "admin" || role === "owner") {
        fetchVideos();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleAdd = () => {
    setVideoToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (video) => {
    setVideoToEdit(video);
    setIsModalOpen(true);
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Hapus video "${video.title}"?`)) return;

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id);

    if (error) {
      alert("Gagal menghapus video: " + error.message);
    } else {
      fetchVideos();
    }
  };

  const handleSave = async (videoData) => {
    const isEdit = Boolean(videoData.id);

    let result;
    if (isEdit) {
      const { id, created_at, ...updateData } = videoData;
      result = await supabase
        .from("videos")
        .update(updateData)
        .eq("id", videoData.id);
    } else {
      const { id, created_at, ...insertData } = videoData;
      result = await supabase.from("videos").insert(insertData);
    }

    if (result.error) {
      alert(`Gagal ${isEdit ? "memperbarui" : "menambah"} video: ${result.error.message}`);
    } else {
      setIsModalOpen(false);
      fetchVideos();
    }
  };

  const renderStatus = (video) => {
    if (!video.is_active) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">
          Tidak Aktif
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Aktif
      </span>
    );
  };

  if (userRole !== "admin" && userRole !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FiPlay className="text-red-400 mb-3" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-500 text-sm">
          Hanya role <span className="font-semibold">admin</span> atau{" "}
          <span className="font-semibold">owner</span> yang dapat mengakses halaman ini.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiPlay className="animate-spin text-orange-500" size={32} />
        <span className="ml-3 text-slate-600 font-medium">Memuat video...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Video</h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola video yang tampil di halaman utama toko online.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus />
          <span>Tambah Video</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 uppercase">
            <tr>
              <th className="px-4 py-3">Thumbnail</th>
              <th className="px-6 py-3">Judul</th>
              <th className="px-6 py-3">Produk</th>
              <th className="px-6 py-3">YouTube ID</th>
              <th className="px-6 py-3">Urutan</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-6">
                  <FiPlay className="mx-auto text-4xl text-slate-300 mb-2" />
                  <p className="text-slate-500">Belum ada video yang ditambahkan.</p>
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <img
                      src={`https://i.ytimg.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-24 h-16 object-cover rounded border"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{video.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600">{video.product_name || "-"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                      {video.youtube_video_id}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-center">{video.sort_order}</td>
                  <td className="px-6 py-4">{renderStatus(video)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(video)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(video)}
                        className="text-red-600 hover:text-red-800"
                        title="Hapus"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {videos.length === 0 ? (
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <FiPlay className="mx-auto text-4xl text-slate-300 mb-2" />
            <p className="text-slate-500">Belum ada video.</p>
          </div>
        ) : (
          videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex gap-3">
                <img
                  src={`https://i.ytimg.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
                  alt={video.title}
                  className="w-24 h-16 object-cover rounded border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{video.title}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {video.product_name || "-"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStatus(video)}
                    <span className="text-xs text-slate-400">
                      Urutan: {video.sort_order}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-3 pt-3 border-t">
                <button
                  onClick={() => handleEdit(video)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  <FiEdit /> Edit
                </button>
                <button
                  onClick={() => handleDelete(video)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                >
                  <FiTrash2 /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        videoToEdit={videoToEdit}
      />
    </div>
  );
};

export default VideoListPage;

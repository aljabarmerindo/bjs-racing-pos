import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FiPlus, FiEdit, FiTrash2, FiMessageSquare, FiX, FiUpload } from "react-icons/fi";

const POST_TYPES = [
  { value: "image", label: "Gambar" },
  { value: "video", label: "Video YouTube" },
  { value: "article", label: "Artikel" },
  { value: "product_tag", label: "Tag Produk" },
  { value: "poll", label: "Poll" },
  { value: "comparison", label: "Perbandingan" },
  { value: "event", label: "Event" },
];

const CATEGORIES = [
  { value: "tips_spray_paint", label: "Tips Spray Paint" },
  { value: "panduan_sparepart", label: "Panduan Sparepart" },
  { value: "news", label: "News & Trends" },
  { value: "bts", label: "Behind the Scene" },
];

const ManajemenFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [commentsView, setCommentsView] = useState(null);
  const [comments, setComments] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    post_type: "image",
    media_url: "",
    thumbnail_url: "",
    youtube_url: "",
    product_id: "",
    category: "",
    tags: "",
    is_published: true,
    is_featured: false,
    published_at: "",
  });

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("feed_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat feed posts:", error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { getUserRole } = await import("../config/aiConfig.js");
      const role = await getUserRole();
      setUserRole(role);
      if (role === "admin" || role === "owner") {
        fetchPosts();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleAdd = () => {
    setEditingPost(null);
    setForm({
      title: "",
      content: "",
      post_type: "image",
      media_url: "",
      thumbnail_url: "",
      youtube_url: "",
      product_id: "",
      category: "",
      tags: "",
      is_published: true,
      is_featured: false,
      published_at: new Date().toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setForm({
      title: post.title || "",
      content: post.content || "",
      post_type: post.post_type || "image",
      media_url: post.media_url || "",
      thumbnail_url: post.thumbnail_url || "",
      youtube_url: post.youtube_url || "",
      product_id: post.product_id || "",
      category: post.category || "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      is_published: post.is_published ?? true,
      is_featured: post.is_featured ?? false,
      published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`Hapus post "${post.title}"?`)) return;
    const { error } = await supabase.from("feed_posts").delete().eq("id", post.id);
    if (error) {
      alert("Gagal menghapus: " + error.message);
    } else {
      fetchPosts();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      product_id: form.product_id || null,
      published_at: form.published_at || new Date().toISOString(),
    };

    let result;
    if (editingPost) {
      result = await supabase.from("feed_posts").update(payload).eq("id", editingPost.id);
    } else {
      result = await supabase.from("feed_posts").insert(payload);
    }

    if (result.error) {
      alert(`Gagal ${editingPost ? "memperbarui" : "menambah"} post: ${result.error.message}`);
    } else {
      setIsModalOpen(false);
      fetchPosts();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError("");

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const driveFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || "";
    if (!driveFolderId) {
      setUploadError("VITE_GOOGLE_DRIVE_FOLDER_ID belum diatur di environment variables.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-drive", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal upload");
      }

      setForm((prev) => ({ ...prev, media_url: data.url }));
      setUploadError("");
    } catch (err) {
      console.error("Upload ke Google Drive gagal:", err);
      setUploadError("Gagal upload ke Google Drive. Silakan paste URL manual.");
    } finally {
      setUploading(false);
    }
  };

  const handleProductSearch = async (query) => {
    setProductSearch(query);
    if (!query.trim()) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("id, nama, kode_produk, merek, harga_jual")
      .or(`nama.ilike.%${query}%,merek.ilike.%${query}%,kode_produk.ilike.%${query}%`)
      .limit(10);

    setProductResults(data || []);
    setShowProductDropdown(true);
  };

  const handleSelectProduct = (product) => {
    setForm((prev) => ({ ...prev, product_id: product.id }));
    setSelectedProductName(`${product.nama} (${product.merek || product.kode_produk || product.id})`);
    setProductSearch("");
    setProductResults([]);
    setShowProductDropdown(false);
  };

  const handleViewComments = async (post) => {
    setCommentsView(post);
    const { data } = await supabase
      .from("feed_comments")
      .select("*, customers(nama_pelanggan)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });
    setComments(data || []);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Hapus komentar ini?")) return;
    const { error } = await supabase.from("feed_comments").delete().eq("id", commentId);
    if (error) {
      alert("Gagal menghapus komentar: " + error.message);
    } else {
      setComments(comments.filter((c) => c.id !== commentId));
    }
  };

  const handleMarkSpam = async (commentId) => {
    const { error } = await supabase.from("feed_comments").update({ is_spam: true }).eq("id", commentId);
    if (error) {
      alert("Gagal menandai spam: " + error.error_description || error.message);
    } else {
      setComments(comments.map((c) => c.id === commentId ? { ...c, is_spam: true } : c));
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Memuat...</div>;
  }

  if (userRole !== "admin" && userRole !== "owner") {
    return <div className="p-6 text-red-500">Akses ditolak.</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Feed Post</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Tambah Post
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Judul</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{post.title || "(Tanpa judul)"}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{post.post_type}</td>
                  <td className="px-4 py-3 text-slate-600">{post.category || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${post.is_published ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
                      {post.is_published ? "Published" : "Draft"}
                    </span>
                    {post.is_featured && (
                      <span className="ml-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Unggulan</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(post)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(post)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleViewComments(post)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Komentar">
                        <FiMessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada postingan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingPost ? "Edit Post" : "Tambah Post Baru"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konten (HTML atau teks)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe Post</label>
                  <select
                    value={form.post_type}
                    onChange={(e) => setForm({ ...form, post_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {POST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">- Pilih -</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Media URL (Google Drive atau gambar)</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors text-sm font-semibold">
                      <FiUpload className="w-4 h-4" />
                      {uploading ? "Mengupload..." : "Upload dari Komputer"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
                  </div>

                  {(previewUrl || form.media_url) && (
                    <div className="relative w-full h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={previewUrl || form.media_url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    value={form.media_url}
                    onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                    placeholder="https://drive.google.com/uc?export=view&id=..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {uploadError && (
                    <p className="text-xs text-red-500">{uploadError}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">YouTube URL (untuk tipe video)</label>
                <input
                  type="text"
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tags (pisah dengan koma)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="spray paint, motor, tips"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Publikasi</label>
                  <input
                    type="datetime-local"
                    value={form.published_at}
                    onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Produk Terkait</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedProductName || form.product_id}
                      onChange={(e) => {
                        setSelectedProductName("");
                        handleProductSearch(e.target.value);
                      }}
                      onFocus={() => productResults.length > 0 && setShowProductDropdown(true)}
                      placeholder="Cari nama produk, merek, atau kode produk..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {showProductDropdown && productResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {productResults.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="flex items-center justify-between px-3 py-2 hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">{product.nama}</p>
                              <p className="text-xs text-slate-500">
                                {product.merek || product.kode_produk || product.id}
                                {product.harga_jual && ` • ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.harga_jual)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.product_id && (
                    <p className="text-xs text-slate-400 mt-1">ID: {form.product_id}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  Featured
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {commentsView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Komentar: {commentsView.title}</h2>
              <button onClick={() => setCommentsView(null)} className="p-1 hover:bg-slate-100 rounded">
                <FiX className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{c.customers?.nama_pelanggan || "Anonim"}</span>
                        <span className="ml-2 text-xs text-slate-400">{new Date(c.created_at).toLocaleString("id-ID")}</span>
                        {c.is_spam && <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Spam</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!c.is_spam && (
                          <button onClick={() => handleMarkSpam(c.id)} className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded">
                            Tandai Spam
                          </button>
                        )}
                        <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded">
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada komentar.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenFeed;

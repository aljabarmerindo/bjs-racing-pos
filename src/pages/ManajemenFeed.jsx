import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FiPlus, FiEdit, FiTrash2, FiMessageSquare, FiX, FiUpload } from "react-icons/fi";
import imageCompression from "browser-image-compression";

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

function normalizeMediaUrl(url) {
  if (!url) return url;
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
  }
  return url;
}

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(?:shorts\/))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7] && match[7].length === 11 ? match[7] : null;
}

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
    category: "",
    tags: "",
    is_published: true,
    is_featured: false,
    published_at: "",
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

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

  useEffect(() => {
    if (form.post_type === "video" && form.youtube_url) {
      const ytId = getYouTubeId(form.youtube_url);
      if (ytId && form.media_url !== `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`) {
        setForm((prev) => ({
          ...prev,
          media_url: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        }));
      }
    }
  }, [form.post_type, form.youtube_url]);

  const handleAdd = () => {
    setEditingPost(null);
    setForm({
      title: "",
      content: "",
      post_type: "image",
      media_url: "",
      thumbnail_url: "",
      youtube_url: "",
      category: "",
      tags: "",
      is_published: true,
      is_featured: false,
      published_at: new Date().toISOString().slice(0, 16),
    });
    setSelectedProducts([]);
    setIsModalOpen(true);
  };

  const handleEdit = async (post) => {
    setEditingPost(post);
    setForm({
      title: post.title || "",
      content: post.content || "",
      post_type: post.post_type || "image",
      media_url: post.media_url || "",
      thumbnail_url: post.thumbnail_url || "",
      youtube_url: post.youtube_url || "",
      category: post.category || "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      is_published: post.is_published ?? true,
      is_featured: post.is_featured ?? false,
      published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : "",
    });

    let existingProducts = [];
    let source = "join";

    const { data: joined, error: joinError } = await supabase
      .from("feed_post_products")
      .select("product_id, products(id, nama, kode_produk, merek, harga_jual)")
      .eq("post_id", post.id);

    if (joinError) {
      console.error("[ManajemenFeed] related products join error:", joinError);
    }

    if (joined && joined.length > 0 && joined[0].products) {
      existingProducts = joined;
      console.log("[ManajemenFeed] related products loaded via join:", existingProducts.length);
    } else {
      console.warn("[ManajemenFeed] related products join returned empty/null, fallback query...");
      const { data: fallback, error: fallbackError } = await supabase
        .from("feed_post_products")
        .select("product_id")
        .eq("post_id", post.id);

      if (fallbackError) {
        console.error("[ManajemenFeed] fallback related products error:", fallbackError);
      } else if (fallback && fallback.length > 0) {
        const productIds = fallback.map((r) => r.product_id);
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, nama, kode_produk, merek, harga_jual")
          .in("id", productIds);

        if (productsError) {
          console.error("[ManajemenFeed] fallback products fetch error:", productsError);
        } else {
          existingProducts = products.map((p) => ({ product_id: p.id, products: p }));
          source = "fallback";
          console.log("[ManajemenFeed] related products loaded via fallback:", existingProducts.length);
        }
      } else {
        console.log("[ManajemenFeed] no related products found for post:", post.id);
      }
    }

    const mapped = (existingProducts || []).map((item) => ({
      id: item.products.id,
      nama: item.products.nama,
      kode_produk: item.products.kode_produk,
      merek: item.products.merek,
      harga_jual: item.products.harga_jual,
    }));

    console.log("[ManajemenFeed] mapped selected products:", mapped.length, "source:", source);
    setSelectedProducts(mapped);
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
    const normalizedMediaUrl = normalizeMediaUrl(form.media_url);
    const payload = {
      ...form,
      media_url: normalizedMediaUrl,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published_at: form.published_at || new Date().toISOString(),
    };

    console.log("[ManajemenFeed] save payload:", payload);

    let result;
    if (editingPost) {
      result = await supabase.from("feed_posts").update(payload).eq("id", editingPost.id);
    } else {
      result = await supabase.from("feed_posts").insert(payload).select("id").single();
    }

    console.log("[ManajemenFeed] save result:", result);

    if (result.error) {
      const errorMessage = result.error.message || result.error.details || result.error.hint || JSON.stringify(result.error);
      console.error("[ManajemenFeed] save error:", result.error);

      if (result.error.code === "42P01" || result.error.message?.includes("does not exist")) {
        alert("Gagal menyimpan: tabel feed_posts belum dibuat. Jalankan migration Supabase terlebih dahulu. Cek file supabase/migrations/2026_08_20_create_feed_posts.sql");
      } else {
        alert(`Gagal ${editingPost ? "memperbarui" : "menambah"} post: ${errorMessage}`);
      }
      return;
    }

    const postId = editingPost ? editingPost.id : result.data.id;

    if (selectedProducts.length > 0) {
      const { error: deleteError } = await supabase
        .from("feed_post_products")
        .delete()
        .eq("post_id", postId);

      if (deleteError) {
        console.error("[ManajemenFeed] delete old products error:", deleteError);
      }

      const { error: insertError } = await supabase.from("feed_post_products").insert(
        selectedProducts.map((product) => ({
          post_id: postId,
          product_id: product.id,
        }))
      );

      if (insertError) {
        console.error("[ManajemenFeed] insert products error:", insertError);
        alert("Post tersimpan, tapi gagal menyimpan produk terkait: " + insertError.message);
        return;
      }
    }

    setIsModalOpen(false);
    fetchPosts();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[ManajemenFeed][UPLOAD_VERSION=v2-supabase-storage] file selected:", file.name, file.type, file.size);

    setSelectedFile(file);
    setUploadError("");

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setUploading(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      const filePath = `feed-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from("feed-images")
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("feed-images")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, media_url: publicUrl }));
      setUploadError("");
    } catch (err) {
      console.error("[ManajemenFeed][UPLOAD_VERSION=v2-supabase-storage] upload error:", err);
      setUploadError("Gagal upload gambar. Silakan paste URL manual.");
    } finally {
      setUploading(false);
    }
  };

  const handleProductSearch = async (query) => {
    console.log("[ManajemenFeed] product search query:", query);
    setProductSearch(query);
    if (!query.trim()) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    try {
      const { data } = await supabase.rpc("search_products", {
        search_term: query,
        merek_filter: null,
        kategori_filter: null,
        status_filter: "Aktif",
        low_stock_only: false,
        supplier_filter: null,
        ukuran_filter: null,
        lini_produk_filter: null,
        price_range: "semua",
      });

      console.log("[ManajemenFeed] product search results:", data);
      setProductResults(data || []);
      setShowProductDropdown(true);
    } catch (err) {
      console.error("[ManajemenFeed] product search error:", err);
      setProductResults([]);
      setShowProductDropdown(false);
    }
  };

  const handleSelectProduct = (product) => {
    console.log("[ManajemenFeed] product selected:", product);
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev;
      return [...prev, { id: product.id, nama: product.nama, kode_produk: product.kode_produk, merek: product.merek, harga_jual: product.harga_jual }];
    });
    setProductSearch("");
    setProductResults([]);
    setShowProductDropdown(false);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Media URL
                  {form.post_type === "video" && (
                    <span className="ml-2 text-xs text-slate-500 font-normal">
                      (otomatis pakai thumbnail YouTube jika diisi)
                    </span>
                  )}
                </label>
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
                    onChange={(e) => setForm({ ...form, media_url: normalizeMediaUrl(e.target.value) })}
                    placeholder="https://ykotzsmncvyfveypeevb.supabase.co/storage/v1/object/public/..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {uploadError && (
                    <p className="text-xs text-red-500">{uploadError}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">YouTube URL (untuk tipe video / shorts)</label>
                <input
                  type="text"
                  value={form.youtube_url}
                  onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... atau https://youtube.com/shorts/..."
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
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={showProductDropdown ? productSearch : ""}
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

                    {selectedProducts.length > 0 && (
                      <div className="space-y-1">
                        {selectedProducts.map((product) => (
                          <div key={product.id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{product.nama}</p>
                              <p className="text-xs text-slate-500">
                                {product.merek || product.kode_produk || product.id}
                                {product.harga_jual && ` • ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.harga_jual)}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.id)}
                              className="text-red-600 hover:bg-red-100 rounded p-1 transition-colors"
                              title="Hapus"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
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

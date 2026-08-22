# Plan: Tambah Input Field di Modal Tambah/Edit Produk

## Overview
Menambahkan field-field baru yang belum ada di modal tambah/edit produk di POS dan STORE, serta perubahan type kolom `specifications` dari JSON ke TEXT.

---

## 1. Database Changes

### 1.1 Alter `specifications` dari JSONB ke TEXT
**Lokasi:** `supabase/migrations/20260822000003_alter_specifications_to_text.sql`

```sql
-- Backup data terlebih dahulu jika diperlukan
-- Alter column specifications dari jsonb ke text
ALTER TABLE public.products 
  ALTER COLUMN specifications TYPE TEXT 
  USING specifications::TEXT;
```

**Catatan:**
- Data yang ada berupa JSON string akan tetap tersimpan sebagai text
- Tidak ada data kehilangan karena `2 produk` memiliki `specifications` terisi
- UI akan menampilkan sebagai textarea biasa (bukan key-value renderer)

### 1.2 Tidak ada alter kolom lain
Kolom berikut sudah ada di DB, hanya perlu ditambahkan UI:
- `color_variant` (text)
- `sku` (text)
- `lini_produk` (text)
- `color_hex` (text/char(7))
- `tags` (text)

---

## 2. POS (`bjs-racing-pos`) Changes

### 2.1 Update `initialProductState`
**File:** `src/components/ProductModal.jsx`

Tambahkan field-field baru:
```js
const initialProductState = {
  // ... existing fields ...
  specifications: "",
  color_variant: "",
  sku: "",
  lini_produk: "",
  color_hex: "",
  tags: "",
};
```

### 2.2 Update `useEffect` untuk populate data
**File:** `src/components/ProductModal.jsx`

Tambahkan mapping untuk field baru:
```js
setProduct({
  // ... existing mappings ...
  specifications: productToEdit.specifications || "",
  color_variant: productToEdit.color_variant || "",
  sku: productToEdit.sku || "",
  lini_produk: productToEdit.lini_produk || "",
  color_hex: productToEdit.color_hex || "",
  tags: productToEdit.tags || "",
});
```

### 2.3 Update `handleSubmit`
**File:** `src/components/ProductModal.jsx`

Tambahkan field-field baru ke `finalProduct`:
```js
const finalProduct = {
  ...product,
  // ... existing fields ...
  specifications: product.specifications || null,
  color_variant: product.color_variant || null,
  sku: product.sku || null,
  lini_produk: product.lini_produk || null,
  color_hex: product.color_hex || null,
  tags: product.tags || null,
};
```

### 2.4 Tambah Input Fields di Form
**File:** `src/components/ProductModal.jsx`

**Posisi penambahan:** Setelah section "Catatan" atau sebelum "Sinonim Pencarian"

#### Field: specifications (Textarea)
```jsx
<div className="md:col-span-2">
  <label htmlFor="specifications" className="block mb-1 text-sm font-medium text-slate-700">
    Spesifikasi (Text)
  </label>
  <textarea
    id="specifications"
    value={product.specifications || ""}
    onChange={handleChange}
    rows="4"
    className="w-full p-2 border rounded"
    placeholder="Masukkan spesifikasi produk. Bisa multiple paragraf dengan enter."
  />
  <p className="text-xs text-slate-500 mt-1">
    Gunakan enter untuk baris baru. Tampil di halaman detail produk tab Spesifikasi.
  </p>
</div>
```

#### Field: color_variant (Input text)
```jsx
<div>
  <label htmlFor="color_variant" className="block mb-1 text-sm font-medium text-slate-700">
    Varian Warna
  </label>
  <input
    id="color_variant"
    type="text"
    value={product.color_variant || ""}
    onChange={handleChange}
    className="w-full p-2 border rounded"
    placeholder="Cth: Red, Blue, Silver"
  />
</div>
```

#### Field: sku (Input text)
```jsx
<div>
  <label htmlFor="sku" className="block mb-1 text-sm font-medium text-slate-700">
    SKU (Stock Keeping Unit)
  </label>
  <input
    id="sku"
    type="text"
    value={product.sku || ""}
    onChange={handleChange}
    className="w-full p-2 border rounded"
    placeholder="Cth: PIL-300ML-BLU"
  />
</div>
```

#### Field: lini_produk (Input text)
```jsx
<div>
  <label htmlFor="lini_produk" className="block mb-1 text-sm font-medium text-slate-700">
    Lini Produk
  </label>
  <input
    id="lini_produk"
    type="text"
    value={product.lini_produk || ""}
    onChange={handleChange}
    className="w-full p-2 border rounded"
    placeholder="Cth: Premium, Ekonomi, Pro"
  />
</div>
```

#### Field: color_hex (Input text dengan color preview)
```jsx
<div>
  <label htmlFor="color_hex" className="block mb-1 text-sm font-medium text-slate-700">
    Warna (HEX Code)
  </label>
  <div className="flex items-center gap-2">
    <input
      id="color_hex"
      type="text"
      value={product.color_hex || ""}
      onChange={handleChange}
      className="w-full p-2 border rounded"
      placeholder="#FF5733"
      maxLength={7}
    />
    {product.color_hex && (
      <div 
        className="w-10 h-10 rounded border"
        style={{ backgroundColor: product.color_hex }}
        title={product.color_hex}
      />
    )}
  </div>
  <p className="text-xs text-slate-500 mt-1">
    Format: #RRGGBB. Akan muncul sebagai color swatch di UI.
  </p>
</div>
```

#### Field: tags (Input text)
```jsx
<div className="md:col-span-2">
  <label htmlFor="tags" className="block mb-1 text-sm font-medium text-slate-700">
    Tags
  </label>
  <input
    id="tags"
    type="text"
    value={product.tags || ""}
    onChange={handleChange}
    className="w-full p-2 border rounded"
    placeholder="Cth: bestseller, baru, limited"
  />
  <p className="text-xs text-slate-500 mt-1">
    Pisahkan dengan koma. Tags membantu pencarian dan filter.
  </p>
</div>
```

---

## 3. STORE (`bjs-racing-store`) Changes

### 3.1 Update Product Modal (jika ada)
STORE menggunakan `ImageUploader` terpisah, tetapi jika ada form edit produk di STORE, tambahkan field yang sama.

### 3.2 Update `ProductInfoTabs.jsx`
**File:** `src/components/ProductInfoTabs.jsx`

Ubah tab "Spesifikasi" dari JSON renderer ke text renderer:

```jsx
{activeTab === "spesifikasi" && (
  <div>
    {product.specifications ? (
      <div className="prose max-w-none text-slate-600 whitespace-pre-wrap">
        {product.specifications}
      </div>
    ) : (
      <p className="text-slate-600">Spesifikasi belum tersedia.</p>
    )}
  </div>
)}
```

**Catatan:** `whitespace-pre-wrap` agar enter/newline tetap terlihat.

### 3.3 Color Hex Preview (jika ingin tampil di store)
Opsional: tampilkan color swatch di halaman detail jika `color_hex` terisi.

---

## 4. Execution Order

1. **Migration SQL:** `ALTER TABLE specifications` ke TEXT
2. **POS - ProductModal.jsx:** Tambah state + input fields
3. **POS - handleSubmit:** Include field baru
4. **STORE - ProductInfoTabs.jsx:** Update tab spesifikasi
5. **Test:** Build + verify form

---

## 5. Notes

- `specifications` akan berubah dari JSON object ke plain text. Pastikan tidak ada proses lain yang bergantung pada format JSON.
- `tags` disimpan sebagai plain text, bukan array.
- `color_hex` tidak ada validasi format hex (bisa diisi bebas).
- Semua field baru bersifat opsional.

---

## 6. Storage RLS Policies

### 6.1 Problem
Upload gambar mengalami masalah karena **belum ada RLS policies** untuk bucket `produk-pilok` dan `produk-parts`. Tanpa policies, Supabase Storage memblokir operasi `SELECT`, `INSERT`, `UPDATE`, dan `DELETE`.

### 6.2 Required Policies
**Lokasi migration:** `supabase/migrations/20260822000003_storage_rls_policies.sql`

#### Bucket `produk-pilok`
```sql
-- Public read access untuk gambar Pilok
CREATE POLICY "Public Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'produk-pilok');

CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'produk-pilok');

CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'produk-pilok');

CREATE POLICY "Public Delete Access" ON storage.objects
  FOR DELETE USING (bucket_id = 'produk-pilok');
```

#### Bucket `produk-parts`
```sql
-- Public read access untuk gambar parts
CREATE POLICY "Public Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'produk-parts');

CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'produk-parts');

CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'produk-parts');

CREATE POLICY "Public Delete Access" ON storage.objects
  FOR DELETE USING (bucket_id = 'produk-parts');
```

### 6.3 Catatan
- Policies ini memberikan akses **public** ke bucket storage. Jika ingin dibatasi hanya untuk authenticated users atau admin, ubah `USING` clause sesuai kebutuhan.
- Jika bucket belum dibuat, buat terlebih dahulu di Supabase Dashboard: `produk-pilok` dan `produk-parts`.
- Pastikan bucket `produk-parts` sudah dibuat sebelum upload gambar non-Pilok.

### 6.4 Verification
Setelah policies dibuat, test upload dari POS:
1. Edit produk non-Pilok (misal: Baut)
2. Upload gambar → seharusnya berhasil tanpa error
3. Cek URL gambar di bucket `produk-parts/{kategori}/{merek}/...`

---

## 7. Upload Debugging & Fix

### 7.1 Problem
Upload gambar mengalami error:
```
Gagal upload gambar: Gagal memuat gambar
Error: Error {}
```

Error terjadi di fungsi `convertToWebP` pada event `img.onerror`, yang artinya browser gagal memuat file gambar ke dalam `Image` object. Kemungkinan penyebab:
- File bukan format gambar yang valid
- File corrupted
- File type tidak didukung browser (`imageCompression` mengembalikan blob dengan type yang tidak dikenali `Image`)
- File terlalu besar meskipun sudah di-compress

### 7.2 Debugging Logs Added
**File:** `src/components/ProductModal.jsx`

Tambahkan `console.log` di setiap tahap upload:
```js
console.log("[Upload] Starting upload:", { slot, name, type, size });
console.log("[Upload] Compression done:", { type, size });
console.log("[WebP] Converting file:", { name, type, size, objectUrl });
console.log("[WebP] Image loaded:", { width, height });
console.log("[WebP] Conversion success:", { webpType, webpSize });
console.log("[Upload] Uploading to bucket:", { bucket, filePath, webpType, webpSize });
console.log("[Upload] Success:", publicUrl);
console.error("[Upload] Full error:", error);
```

Tambahkan `URL.revokeObjectURL(objectUrl)` untuk menghindari memory leak.

### 7.3 Fix
Perbaikan yang dilakukan:
1. **Object URL cleanup:** Tambah `URL.revokeObjectURL(objectUrl)` di `onload`, `onerror`, dan `catch`
2. **Better error message:** `img.onerror` sekarang memberikan pesan yang lebih informatif: `"Gagal memuat gambar. Pastikan file adalah gambar yang valid (JPG/PNG/WebP)."`
3. **Try-catch di onload:** Tangani error di dalam `img.onload` dengan `try-catch` dan `URL.revokeObjectURL`
4. **Log detail:** Tambah logging untuk file type, size, dan conversion status

### 7.4 Verification
Setelah debugging logs ditambahkan:
1. Buka edit produk di POS
2. Upload color swatch
3. Cek console log untuk detail error
4. Identifikasi apakah masalah di:
   - `imageCompression` output (file type/size)
   - `Image` loading (format tidak didukung)
   - `canvas.toBlob` (konversi WebP gagal)
   - `supabase.storage.upload` (RLS/policy issue)

### 7.5 Possible Solutions Berdasarkan Hasil Debug
- Jika error di `imageCompression`: coba turunkan `maxSizeMB` atau `maxWidthOrHeight`
- Jika error di `img.onerror`: file mungkin bukan gambar valid, tambahkan validasi file type sebelum upload
- Jika error di `canvas.toBlob`: browser tidak support WebP encoding, fallback ke PNG/JPG
- Jika error di `supabase.storage.upload`:cek RLS policies bucket



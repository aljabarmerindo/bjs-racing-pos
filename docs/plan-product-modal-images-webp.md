# Plan: Lengkapi Modal Produk POS + Upload Gambar + WebP Conversion

**App:** `bjs-racing-pos` (React 18 + Vite 5 + Supabase)
**Target:** `/workspaces/bjs-racing-pos/src/components/ProductModal.jsx`
**Bucket:** `produk-pilok` (sama dengan store)
**Date:** 2026-08-22

---

## 1. Current State Analysis

### 1.1 ProductModal Fields (Existing)
| Field | DB Column | Status |
|-------|-----------|--------|
| `kode` | `kode` | ✅ |
| `nama` | `nama` | ✅ |
| `merek` | `merek` | ✅ |
| `kategori` | `kategori` | ✅ |
| `supplier` | `supplier` / `supplier_id` | ✅ |
| `harga_beli` | `harga_beli` | ✅ |
| `harga_jual` | `harga_jual` | ✅ |
| `harga_coret` | `harga_coret` | ✅ |
| `stok` | `stok` | ✅ |
| `stok_min` | `stok_min` | ✅ |
| `catatan` | `catatan` | ✅ |
| `search_synonyms` | `search_synonyms` | ✅ |
| `status` | `status` | ✅ |
| `satuan_dasar` | `satuan_dasar` | ✅ |
| `satuan_pembelian` | `satuan_pembelian` | ✅ |
| `nilai_konversi` | `nilai_konversi` | ✅ |
| `ukuran` | `ukuran` | ✅ |
| `harga_grosir` | `harga_grosir` | ✅ |
| `berat_gram` | `berat_gram` | ✅ |
| `panjang_cm` | `panjang_cm` | ✅ |
| `lebar_cm` | `lebar_cm` | ✅ |
| `tinggi_cm` | `tinggi_cm` | ✅ |

### 1.2 Missing Fields (DB exists but modal lacks)
| Field | DB Column | Impact |
|-------|-----------|--------|
| `image_url` | `image_url` | No product image |
| `image_url_2` | `image_url_2` | No secondary image |
| `image_url_3` | `image_url_3` | No tertiary image |
| `color_swatch_url` | `color_swatch_url` | No color variant image |
| `lini_produk` | `lini_produk` | Not editable, only filterable |
| `sku` | `sku` | Not editable, only searchable |
| `search_terms` | `search_terms` | Not editable (only `search_synonyms` exists) |

### 1.3 Critical Bug
On edit mode, `useEffect` in `ProductModal` only hydrates fields listed in `initialProductState`. Since `image_url`, `image_url_2`, `image_url_3`, `color_swatch_url`, `lini_produk`, `sku`, `search_terms` are NOT in `initialProductState`, they are **silently dropped** when editing a product.

---

## 2. Goals

1. Add image upload fields to `ProductModal`: `image_url`, `image_url_2`, `image_url_3`, `color_swatch_url`
2. Implement client-side WebP conversion before upload (quality 85)
3. Add missing text fields: `lini_produk`, `sku`, `search_terms`
4. Fix edit-mode hydration to preserve all DB columns
5. Show image previews in modal with remove option
6. Reuse existing `browser-image-compression` pattern from `PromoModal.jsx`

---

## 3. Dependencies

**Already installed in POS app:**
- `browser-image-compression` — for client-side compression
- `@supabase/supabase-js` — for storage upload

**No new dependencies needed.** Use Canvas API for WebP conversion (same as store app).

---

## 4. Implementation Plan

### 4.1 Update `initialProductState`
Add new fields:
```js
const initialProductState = {
  // ... existing fields ...
  image_url: "",
  image_url_2: "",
  image_url_3: "",
  color_swatch_url: "",
  lini_produk: "",
  sku: "",
  search_terms: "",
};
```

### 4.2 Fix `useEffect` hydration
Update the `setProduct({...})` call inside `useEffect` to include all new fields from `productToEdit`:
```js
image_url: productToEdit.image_url || "",
image_url_2: productToEdit.image_url_2 || "",
image_url_3: productToEdit.image_url_3 || "",
color_swatch_url: productToEdit.color_swatch_url || "",
lini_produk: productToEdit.lini_produk || "",
sku: productToEdit.sku || "",
search_terms: productToEdit.search_terms || "",
```

### 4.3 Add WebP conversion helper
Create a reusable helper function (similar to store app):
```js
const convertToWebP = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          } else {
            reject(new Error("Gagal konversi WebP"));
          }
        },
        "image/webp",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = URL.createObjectURL(file);
  });
};
```

### 4.4 Add image upload handler
```js
const handleImageUpload = async (e, slot) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    const webpFile = await convertToWebP(compressedFile);

    const productId = productToEdit?.id || Date.now();
    const filePath = `produk-pilok/public/${productId}-${slot}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("produk-pilok")
      .upload(filePath, webpFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("produk-pilok")
      .getPublicUrl(filePath);

    setProduct((prev) => ({ ...prev, [slot]: publicUrl }));
  } catch (error) {
    console.error("Error upload gambar:", error);
    alert(`Gagal upload gambar: ${error.message}`);
  }
};
```

### 4.5 Add image remove handler
```js
const handleRemoveImage = (slot) => {
  setProduct((prev) => ({ ...prev, [slot]: "" }));
};
```

### 4.6 Add UI sections to modal

#### Section A: Gambar Produk (Image Upload)
Place after `ukuran` field, before `harga_grosir`:

```jsx
<div className="md:col-span-2 mt-4">
  <h3 className="text-lg font-semibold mb-2 text-slate-800">Gambar Produk</h3>
  <p className="text-sm text-slate-500 mb-4">Format: JPG/PNG/WebP. Maks 1MB. Otomatis konversi ke WebP.</p>
  
  {/* Image 1 */}
  <div className="mb-3">
    <label className="block mb-1 text-sm font-medium text-slate-700">Gambar Utama (image_url)</label>
    <div className="flex items-center gap-3">
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageUpload(e, 'image_url')} className="hidden" id="img1" />
      <label htmlFor="img1" className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded transition-colors">
        Pilih Gambar
      </label>
      {product.image_url && (
        <button type="button" onClick={() => handleRemoveImage('image_url')} className="text-red-500 hover:text-red-700 text-sm">Hapus</button>
      )}
    </div>
    {product.image_url && <img src={product.image_url} alt="Preview" className="mt-2 h-32 object-contain border rounded" />}
  </div>

  {/* Image 2, Image 3, Color Swatch - similar pattern */}
</div>
```

#### Section B: Fields Tambahan
Place after the image section:

```jsx
<div className="md:col-span-2 mt-4">
  <h3 className="text-lg font-semibold mb-2 text-slate-800">Informasi Tambahan</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label htmlFor="lini_produk" className="block mb-1 text-sm font-medium text-slate-700">Lini Produk</label>
      <input id="lini_produk" type="text" value={product.lini_produk || ""} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Cth: Diton Premium" />
    </div>
    <div>
      <label htmlFor="sku" className="block mb-1 text-sm font-medium text-slate-700">SKU</label>
      <input id="sku" type="text" value={product.sku || ""} onChange={handleChange} className="w-full p-2 border rounded" />
    </div>
    <div>
      <label htmlFor="search_terms" className="block mb-1 text-sm font-medium text-slate-700">Search Terms</label>
      <input id="search_terms" type="text" value={product.search_terms || ""} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Pisahkan dengan koma" />
    </div>
  </div>
</div>
```

### 4.7 Update `handleSubmit`
Ensure new fields are included in `finalProduct`:
```js
const finalProduct = {
  ...product,
  // ... existing conversions ...
  image_url: product.image_url || null,
  image_url_2: product.image_url_2 || null,
  image_url_3: product.image_url_3 || null,
  color_swatch_url: product.color_swatch_url || null,
  lini_produk: product.lini_produk || null,
  sku: product.sku || null,
  search_terms: product.search_terms || null,
};
```

### 4.8 Update `Produk.jsx` table (optional but recommended)
Add image column to product table:
```jsx
<th className="text-left py-2 px-4">Gambar</th>
// In row:
<td className="py-2 px-4">
  {product.image_url ? (
    <img src={product.image_url} alt={product.nama} className="h-12 w-12 object-contain" />
  ) : (
    <div className="h-12 w-12 bg-slate-100 rounded" />
  )}
</td>
```

---

## 5. WebP Conversion Strategy

### Client-side (primary)
- Use `browser-image-compression` for resizing/compression (already installed)
- Use Canvas API `toBlob('image/webp', 0.85)` for format conversion
- Fallback: if Canvas fails (old browser), upload compressed JPG/PNG

### Why WebP?
- ~30-50% smaller than JPEG at same quality
- Supported by 97%+ browsers globally
- Already used in store app (`produk-pilok` bucket)
- Vercel Image Optimization can serve WebP automatically

### Upload path pattern
```
produk-pilok/public/{product_id-or-timestamp}-{slot}.webp
```
Slots: `main`, `2`, `3`, `swatch`

---

## 6. Execution Order

1. **Update `initialProductState`** — add new fields
2. **Fix `useEffect` hydration** — include all DB columns
3. **Add WebP helper + image upload handlers**
4. **Add image UI sections** to modal JSX
5. **Update `handleSubmit`** — pass new fields to DB
6. **Update `Produk.jsx` table** — add image column (optional)
7. **Test**: create new product with images → verify WebP in bucket → verify DB URLs
8. **Test**: edit existing product → verify images persist

---

## 7. Files to Modify

- `src/components/ProductModal.jsx` (primary)
- `src/pages/Produk.jsx` (table display, optional)

---

## 8. Validation Checklist

- [ ] New product can upload `image_url` (WebP)
- [ ] New product can upload `image_url_2` (WebP)
- [ ] New product can upload `image_url_3` (WebP)
- [ ] New product can upload `color_swatch_url` (WebP)
- [ ] Existing product edit preserves images
- [ ] Image preview shows in modal after upload
- [ ] Remove image button works
- [ ] New fields `lini_produk`, `sku`, `search_terms` save correctly
- [ ] Files in bucket are `.webp` extension
- [ ] No broken images in POS product list

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Canvas `toBlob('image/webp')` returns `null` | Fallback to upload compressed original format |
| Large images cause memory issues | `browser-image-compression` with `maxSizeMB: 1` and `maxWidthOrHeight: 1920` |
| Upload fails mid-way | Show error alert, keep form state intact |
| `produk-pilok` bucket full | Already optimized to WebP, ~70% smaller |

---

## 10. Out of Scope

- Migrating existing old images to WebP (already done for store app)
- Implementing `srcset` / responsive images
- Adding image crop/rotate in modal
- Batch image upload for products


---

## 11. Tambahan: Merek Motor & Tipe Motor (Non-Pilok)

### 11.1 Analisis DB
Tabel referensi sudah ada:
- `vehicle_brands`: `id` (int), `name` (text), `created_at`
- `vehicle_models`: `id` (int), `brand_id` (int, FK ke vehicle_brands), `name` (text), `created_at`

Saat ini kedua tabel **kosong**. Tabel `products` belum memiliki kolom foreign key ke tabel ini.

### 11.2 Kebutuhan
- Tambah kolom FK di `products`: `vehicle_brand_id` (int nullable), `vehicle_model_id` (int nullable)
- Tampilkan dropdown "Merek Motor" dan "Tipe Motor" di `ProductModal` hanya jika `kategori !== 'Pilok'`
- Untuk kategori "Pilok", field ini disembunyikan
- Dropdown "Tipe Motor" harus filter berdasarkan merek yang dipilih

### 11.3 Implementasi

#### DB Migration
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS vehicle_brand_id integer REFERENCES vehicle_brands(id),
  ADD COLUMN IF NOT EXISTS vehicle_model_id integer REFERENCES vehicle_models(id);

CREATE INDEX IF NOT EXISTS idx_products_vehicle_brand_id ON products(vehicle_brand_id);
CREATE INDEX IF NOT EXISTS idx_products_vehicle_model_id ON products(vehicle_model_id);
```

#### Seed data awal untuk vehicle_brands dan vehicle_models
Populkan tabel referensi dengan merek dan tipe motor umum:
```sql
INSERT INTO vehicle_brands (name) VALUES
  ('Honda'), ('Yamaha'), ('Suzuki'), ('Kawasaki'), ('TVS'), ('Yamaha'), ('Vespa'), ('Lainnya')
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_models (brand_id, name) VALUES
  (1, 'Vario'), (1, 'Nmax'), (1, 'Beat'), (1, 'Scoopy'), (1, 'PCX'), (1, 'Aerox'),
  (2, 'Nmax'), (2, 'Aerox'), (2, 'Mio'), (2, 'Fazzio'),
  (3, 'Beat'), (3, 'Suzuki'), (3, 'Address'),
  (4, 'Ninja'), (4, 'Z'), (4, 'W175'),
  (5, 'Jupiter'), (5, 'Beat'), (5, 'Raider'),
  (6, 'Vespa'), (6, 'LX'), (6, 'Primavera'),
  (7, 'Lainnya')
ON CONFLICT DO NOTHING;
```

#### Update initialProductState
```js
const initialProductState = {
  // ... existing fields ...
  vehicle_brand_id: "",
  vehicle_model_id: "",
};
```

#### Update useEffect hydration
```js
vehicle_brand_id: productToEdit.vehicle_brand_id || "",
vehicle_model_id: productToEdit.vehicle_model_id || "",
```

#### Tambah state untuk brand/model options
```js
const [vehicleBrands, setVehicleBrands] = useState([]);
const [vehicleModels, setVehicleModels] = useState([]);
const [loadingVehicleData, setLoadingVehicleData] = useState(false);

useEffect(() => {
  if (isOpen) {
    fetchVehicleBrands();
  }
}, [isOpen]);
```

#### Fetch helpers
```js
const fetchVehicleBrands = async () => {
  setLoadingVehicleData(true);
  const { data } = await supabase.from('vehicle_brands').select('*').order('name');
  setVehicleBrands(data || []);
  setLoadingVehicleData(false);
};

const fetchVehicleModels = async (brandId) => {
  if (!brandId) {
    setVehicleModels([]);
    return;
  }
  const { data } = await supabase.from('vehicle_models').select('*').eq('brand_id', brandId).order('name');
  setVehicleModels(data || []);
};
```

#### Conditional UI di modal
```jsx
{product.kategori !== 'Pilok' && (
  <div className="md:col-span-2 mt-4">
    <h3 className="text-lg font-semibold mb-2 text-slate-800">Spesifikasi Motor</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="vehicle_brand_id" className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
        <select id="vehicle_brand_id" value={product.vehicle_brand_id || ""} onChange={(e) => { handleChange(e); fetchVehicleModels(e.target.value); }} className="w-full p-2 border rounded bg-white">
          <option value="">-- Pilih Merek --</option>
          {vehicleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="vehicle_model_id" className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor</label>
        <select id="vehicle_model_id" value={product.vehicle_model_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-white" disabled={!product.vehicle_brand_id}>
          <option value="">-- Pilih Tipe --</option>
          {vehicleModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
  </div>
)}
```

#### Update handleSubmit
```js
const finalProduct = {
  ...product,
  vehicle_brand_id: product.vehicle_brand_id ? Number(product.vehicle_brand_id) : null,
  vehicle_model_id: product.vehicle_model_id ? Number(product.vehicle_model_id) : null,
};
```

### 11.4 Execution Order Update
1. Jalankan migration SQL di Supabase
2. Seed data ke `vehicle_brands` dan `vehicle_models`
3. Update `initialProductState`
4. Fix `useEffect` hydration
5. Tambah fetch state + handlers di modal
6. Tambah conditional UI di modal
7. Update `handleSubmit`
8. Test: produk kategori "Pilok" → field disembunyikan
9. Test: produk kategori lain → dropdown merek/tipe tampil dan tersimpan

---

## 12. Rekomendasi: Manajemen Kendaraan + Searchable Dropdown

### 12.1 Pendekatan Profesional yang Disarankan

**Gunakan pendekatan hybrid:**
1. **Seed data awal** via migration SQL — isi `vehicle_brands` dan `vehicle_models` dengan data umum Indonesia
2. **Searchable dropdown** di modal — gunakan kombinasi `select` + filter AJAX ringan (tanpa library berat)
3. **Halaman manajemen kendaraan** — CRUD standalone di bawah menu Master Data/Pengaturan

**Alasan pendekatan ini:**
- Data kendaraan banyak (puluhan merek, ratusan tipe), tidak efisif kalau load semua sekaligus di client
- User perlu kelola data kendaraan karena akan bertambah seiring berjalannya usaha
- Searchable dropdown mengurangi kesalahan input dan mempercepat entri data
- Tanpa dependency tambahan — cukup native HTML + Supabase

---

### 12.2 Struktur Data yang Disarankan

#### `vehicle_brands`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | serial PK | Auto-increment |
| `name` | text | Nama merek (Honda, Yamaha, Suzuki, dll) |
| `is_active` | boolean | Soft delete |
| `created_at` | timestamp | Default now() |

#### `vehicle_models`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | serial PK | Auto-increment |
| `brand_id` | int FK | Ref ke `vehicle_brands(id)` |
| `name` | text | Nama tipe (Vario, Nmax, Beat, dll) |
| `is_active` | boolean | Soft delete |
| `created_at` | timestamp | Default now() |

#### Relasi ke `products`
Tambahkan 2 kolom nullable:
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS vehicle_brand_id integer REFERENCES vehicle_brands(id),
  ADD COLUMN IF NOT EXISTS vehicle_model_id integer REFERENCES vehicle_models(id);
```

---

### 12.3 Data Awal yang Disarankan

Seed merek & tipe motor yang umum dipakai di Indonesia:

**Merek:** Honda, Yamaha, Suzuki, Kawasaki, TVS, Vespa, Lainnya

**Tipe per merek:**
- Honda: Vario, Nmax, Beat, Scoopy, PCX, Aerox, CRF, REBEL
- Yamaha: Nmax, Aerox, Mio, Fazzio, Xmax, MT
- Suzuki: Beat, Address, Burgman, GSX, V-Strom
- Kawasaki: Ninja, Z, W175, KLX, Versys
- TVS: Jupiter, Beat, Raider, Apache
- Vespa: Vespa, LX, Primavera, GTS
- Lainnya: Lainnya

---

### 12.4 Implementasi Searchable Dropdown

**Prinsip:** Jangan load semua data sekaligus. Gunakan 2-stage search:

**Stage 1 - Merek Motor:**
- Tampilkan semua merek dalam `<select>` biasa (data kecil, ~10 items)
- Atau jika ingin searchable: `<input>` + `<datalist>` atau custom dropdown dengan filter client-side

**Stage 2 - Tipe Motor:**
- Setelah merek dipilih, fetch tipe motor dari server berdasarkan `brand_id`
- Tampilkan dalam `<select>` biasa
- Jika ingin searchable: tambah `<input>` filter + AJAX search ke Supabase

**Rekomendasi UI:**
```jsx
{/* Merek Motor - Select biasa karena jumlah sedikit */}
<select id="vehicle_brand_id" onChange={handleBrandChange}>
  <option value="">-- Pilih Merek --</option>
  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
</select>

{/* Tipe Motor - Searchable dengan filter client-side */}
<div className="relative">
  <input 
    type="text" 
    placeholder="Cari tipe motor..." 
    onChange={(e) => filterModels(e.target.value)}
    disabled={!selectedBrand}
  />
  <select size="5" className="absolute z-10 w-full">
    {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
  </select>
</div>
```

**Alternatif jika ingin lebih advanced:** Gunakan library ringan seperti `react-select` atau `downshift` untuk searchable dropdown dengan keyboard navigation.

---

### 12.5 Halaman Manajemen Kendaraan

**Lokasi:** `/manajemen-kendaraan` atau `/pengaturan/kendaraan`

**Fitur:**
1. **Daftar Merek Motor** — tabel + tambah/edit/hapus
2. **Daftar Tipe Motor** — tabel + filter by merek + tambah/edit/hapus
3. **Quick Add** — form inline untuk tambah cepat merek/tipe

**Struktur UI:**
```
┌─────────────────────────────────────────┐
│ Manajemen Kendaraan                      │
├─────────────────────────────────────────┤
│ [Tab: Merek Motor] [Tab: Tipe Motor]     │
├─────────────────────────────────────────┤
│ Daftar Merek Motor:                      │
│ ┌─────┬──────────┬──────────┐           │
│ │ ID  │ Nama     │ Aksi     │           │
│ ├─────┼──────────┼──────────┤           │
│ │ 1   │ Honda    │ Edit/Hapus│           │
│ │ 2   │ Yamaha   │ Edit/Hapus│           │
│ └─────┴──────────┴──────────┘           │
│                                         │
│ [+ Tambah Merek Motor]                  │
└─────────────────────────────────────────┘
```

**Komponen yang dibutuhkan:**
- `VehicleBrandModal.jsx` — modal CRUD merek motor
- `VehicleModelModal.jsx` — modal CRUD tipe motor + dropdown merek
- `ManajemenKendaraan.jsx` — halaman utama dengan tab

**Route:** tambahkan di `App.jsx`:
```jsx
<Route path="/manajemen-kendaraan" element={<ManajemenKendaraan />} />
```

---

### 12.6 Integration dengan ProductModal

Di `ProductModal`, setelah merek dipilih:
1. Fetch `vehicle_models` berdasarkan `brand_id`
2. Simpan ke state `vehicleModels`
3. Tampilkan di dropdown tipe motor
4. Saat submit, kirim `vehicle_brand_id` dan `vehicle_model_id` ke Supabase

**Edge case handling:**
- Jika produk kategori "Pilok" → disembunyikan
- Jika merek dipilih lalu diubah → reset tipe motor ke `""`
- Jika tipe motor tidak ada di dropdown → user bisa manual input via halaman manajemen

---

### 12.7 Execution Order yang Disarankan

1. **Jalankan migration SQL** — tambah kolom FK di `products`
2. **Seed data awal** — insert merek & tipe motor umum
3. **Buat halaman Manajemen Kendaraan** — CRUD merek & tipe
4. **Tambahkan route** di `App.jsx`
5. **Update ProductModal** — tambah searchable dropdown
6. **Test end-to-end:**
   - Buat produk non-Pilok → pilih merek/tipe → simpan
   - Edit produk → merek/tipe ter-load
   - Hapus merek yang sedang dipakai produk → handle gracefully (jangan hard delete, pakai soft delete `is_active`)
   - Produk Pilok → field disembunyikan

---

### 12.8 Alternatif Implementasi (Lean)

Jika ingin lebih cepat tanpa halaman manajemen terpisah:
- **Skip** halaman manajemen kendaraan
- **Cukup** seed data awal via SQL
- **Modal produk** pakai select biasa (bukan searchable)
- **Keuntungan:** implementasi cepat, tidak perlu CRUD baru
- **Kerugian:** user tidak bisa tambah merek/tipe baru tanpa developer

**Rekomendasi:** Lakukan pendekatan penuh (dengan halaman manajemen) karena:
1. Data kendaraan akan bertambah seiring waktu
2. Admin POS butuh kontrol penuh
3. Investasi waktu awal ~2-3 jam untuk hemat masalah di kemudian hari

---

### 12.9 Catatan Teknis

**Soft delete:** Gunakan kolom `is_active` instead of hard delete, karena produk mungkin masih mereferensi merek/tipe tersebut.

**Cascade rule:** Saat merek dihapus, set `vehicle_brand_id = NULL` di produk yang menggunakan merek tersebut. Implementasi via trigger atau aplikasi logic.

**Index:** Tambahkan index pada `vehicle_brand_id` dan `vehicle_model_id` di tabel `products` untuk performa query filter.

**Validation:** Pastikan `vehicle_model_id` yang dipilih memang milik `vehicle_brand_id` yang dipilih (validasi di client + server).

---

## 13. Tambahan: Tabel Kode Motor (vehicle_codes)

### 13.1 Konsep
Kode motor adalah sistem identifikasi pendek untuk tipe motor spesifik.
Contoh: **KVB** = Honda Vario Carburetor (Karbu).

Tabel ini memungkinkan:
- Klasifikasi produk secara granular (bukan cuma brand/model)
- Auto-suggest produk berdasarkan kode motor
- Search yang lebih cepat di POS
- Integrasi dengan harga dinamis per tipe motor

### 13.2 Struktur Tabel Baru

#### `vehicle_codes`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | serial PK | Auto-increment |
| `code` | text unique | Kode pendek (KVB, NMAX-E, dll) |
| `name` | text | Nama lengkap (Honda Vario 125 Carburetor) |
| `vehicle_model_id` | int FK | Ref ke `vehicle_models(id)` |
| `vehicle_brand_id` | int FK | Ref ke `vehicle_brands(id)` — denormalisasi untuk query cepat |
| `is_active` | boolean | Soft delete |
| `created_at` | timestamp | Default now() |

**Denormalisasi sengaja:** Simpan `vehicle_brand_id` meskipun bisa di-join dari `vehicle_models`, untuk mempermudah query dan filter.

### 13.3 Data Awal yang Disarankan

```sql
INSERT INTO vehicle_codes (code, name, vehicle_model_id, vehicle_brand_id) VALUES
  -- Honda Vario variants
  ('KVB', 'Honda Vario 125 Carburetor', 1, 1),
  ('KVE', 'Honda Vario 125 Electronic', 1, 1),
  ('KV16', 'Honda Vario 160', 1, 1),
  -- Honda Beat
  ('KB', 'Honda Beat', 3, 1),
  ('KB-E', 'Honda Beat Electronic', 3, 1),
  -- Honda Nmax
  ('NMX', 'Honda Nmax', 2, 1),
  ('NMX-E', 'Honda Nmax Connected', 2, 1),
  -- Yamaha Nmax
  ('YN', 'Yamaha Nmax', 4, 2),
  -- Yamaha Aerox
  ('YA', 'Yamaha Aerox', 5, 2),
  -- Suzuki
  ('SB', 'Suzuki Beat', 6, 3),
  -- Kawasaki
  ('KN', 'Kawasaki Ninja', 7, 4),
  -- TVS
  ('TJ', 'TVS Jupiter', 8, 5)
ON CONFLICT DO NOTHING;
```

### 13.4 Update Tabel Products

Tambahkan kolom FK:
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS vehicle_code_id integer REFERENCES vehicle_codes(id);

CREATE INDEX IF NOT EXISTS idx_products_vehicle_code_id ON products(vehicle_code_id);
```

### 13.5 Implementasi UI di ProductModal

#### State tambahan
```js
const [vehicleCodes, setVehicleCodes] = useState([]);
```

#### Fetch helper
```js
const fetchVehicleCodes = async (brandId, modelId) => {
  let query = supabase.from('vehicle_codes').select('*').eq('is_active', true);
  
  if (brandId) query = query.eq('vehicle_brand_id', Number(brandId));
  if (modelId) query = query.eq('vehicle_model_id', Number(modelId));
  
  const { data } = await query.order('code');
  setVehicleCodes(data || []);
};
```

#### Conditional UI di modal
```jsx
{product.kategori !== 'Pilok' && (
  <div className="md:col-span-2 mt-4">
    <h3 className="text-lg font-semibold mb-2 text-slate-800">Spesifikasi Motor</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Merek Motor */}
      <div>
        <label htmlFor="vehicle_brand_id" className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
        <select id="vehicle_brand_id" value={product.vehicle_brand_id || ""} onChange={(e) => { handleChange(e); fetchVehicleModels(e.target.value); fetchVehicleCodes(e.target.value, null); }} className="w-full p-2 border rounded bg-white">
          <option value="">-- Pilih Merek --</option>
          {vehicleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      
      {/* Tipe Motor */}
      <div>
        <label htmlFor="vehicle_model_id" className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor</label>
        <select id="vehicle_model_id" value={product.vehicle_model_id || ""} onChange={(e) => { handleChange(e); fetchVehicleCodes(product.vehicle_brand_id, e.target.value); }} className="w-full p-2 border rounded bg-white" disabled={!product.vehicle_brand_id}>
          <option value="">-- Pilih Tipe --</option>
          {vehicleModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      
      {/* Kode Motor */}
      <div>
        <label htmlFor="vehicle_code_id" className="block mb-1 text-sm font-medium text-slate-700">Kode Motor</label>
        <select id="vehicle_code_id" value={product.vehicle_code_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-white" disabled={!vehicleCodes.length}>
          <option value="">-- Pilih Kode --</option>
          {vehicleCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
        </select>
      </div>
    </div>
  </div>
)}
```

#### Update handleSubmit
```js
const finalProduct = {
  ...product,
  vehicle_brand_id: product.vehicle_brand_id ? Number(product.vehicle_brand_id) : null,
  vehicle_model_id: product.vehicle_model_id ? Number(product.vehicle_model_id) : null,
  vehicle_code_id: product.vehicle_code_id ? Number(product.vehicle_code_id) : null,
};
```

### 13.6 Integrasi dengan Halaman Manajemen Kendaraan

Tambahkan tab keempat: **Kode Motor**

```
┌─────────────────────────────────────────────┐
│ Manajemen Kendaraan                          │
├─────────────────────────────────────────────┤
│ [Merek Motor] [Tipe Motor] [Kode Motor]      │
├─────────────────────────────────────────────┤
│ Kode | Nama | Merek | Tipe | Aksi            │
│ KVB  | Honda Vario 125 Carb | Honda | Vario │
│ KVE  | Honda Vario 125 Elec | Honda | Vario │
└─────────────────────────────────────────────┘
```

**Komponen baru:**
- `VehicleCodeModal.jsx` — modal CRUD kode motor + dropdown merek/tipe

### 13.7 Keuntungan Sistem Kode Motor

1. **Standardisasi** — semua produk pakai kode yang sama
2. **Cari cepat** — ketik "KVB" langsung dapat produk Honda Vario 125 carburetor
3. **Integrasi supplier** — supplier bisa referensikan kode motor
4. **Pelacakan kompatibilitas** — tahu mana produk yang cocok untuk tipe motor mana
5. **Reporting** — laporan penjualan per jenis kendaraan

### 13.8 Execution Order Update

1. Jalankan migration SQL — tambah tabel `vehicle_codes` + kolom di `products`
2. Seed data awal kode motor
3. Update `initialProductState`
4. Fix `useEffect` hydration
5. Tambah fetch state + handlers
6. Tambah 3-field cascade dropdown di modal (merek → tipe → kode)
7. Update `handleSubmit`
8. Test: produk non-Pilok → pilih merek/tipe/kode → tersimpan
9. Build halaman Manajemen Kendaraan dengan tab Kode Motor

---

## 14. Tambahan: Tabel Kategori Motor (vehicle_kategori)

### 14.1 Konsep
Kategori motor mengklasifikasikan jenis transmisi/tipe motor secara umum.
Contoh: **Matic**, **Bebek**, **Sport**, **Trail**, **Elektrik**.

Ini membentuk hierarchy 4-level:
```
Brand → Kategori → Model → Kode
Honda  → Matic   → Vario → KVB
Yamaha → Matic   → Nmax  → NMX
```

### 14.2 Struktur Tabel Baru

#### `vehicle_kategori`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | serial PK | Auto-increment |
| `name` | text unique | Nama kategori (Matic, Bebek, Sport, dll) |
| `icon` | text | Emoji/icon untuk UI (⚙️, 🏍️, dll) |
| `is_active` | boolean | Soft delete |
| `created_at` | timestamp | Default now() |

### 14.3 Data Awal yang Disarankan

```sql
INSERT INTO vehicle_kategori (name, icon) VALUES
  ('Matic', '⚙️'),
  ('Bebek', '🏍️'),
  ('Sport', '🔥'),
  ('Trail', '🌲'),
  ('Elektrik', '⚡'),
  ('Truk/Muatan', '🚛'),
  ('Lainnya', '📦')
ON CONFLICT DO NOTHING;
```

### 14.4 Update Tabel vehicle_models

Tambahkan kolom FK ke kategori:
```sql
ALTER TABLE vehicle_models 
  ADD COLUMN IF NOT EXISTS vehicle_kategori_id integer REFERENCES vehicle_kategori(id);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_kategori_id ON vehicle_models(vehicle_kategori_id);
```

### 14.5 Update Tabel products

Tambahkan kolom kategori motor:
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS vehicle_kategori_id integer REFERENCES vehicle_kategori(id);

CREATE INDEX IF NOT EXISTS idx_products_vehicle_kategori_id ON products(vehicle_kategori_id);
```

### 14.6 Data Seed untuk vehicle_models

Update seed data dengan FK kategori:
```sql
-- Honda models
INSERT INTO vehicle_models (brand_id, name, vehicle_kategori_id) VALUES
  (1, 'Vario', 1),        -- Matic
  (1, 'Beat', 1),         -- Matic
  (1, 'Scoopy', 1),       -- Matic
  (1, 'PCX', 1),          -- Matic
  (1, 'CRF', 3),          -- Sport
  (1, 'REBEL', 3)         -- Sport
ON CONFLICT DO NOTHING;

-- Yamaha models
INSERT INTO vehicle_models (brand_id, name, vehicle_kategori_id) VALUES
  (2, 'Nmax', 1),         -- Matic
  (2, 'Aerox', 1),        -- Matic
  (2, 'Mio', 1),          -- Matic
  (2, 'MT', 3)            -- Sport
ON CONFLICT DO NOTHING;

-- Suzuki models
INSERT INTO vehicle_models (brand_id, name, vehicle_kategori_id) VALUES
  (3, 'Beat', 1),         -- Matic
  (3, 'Address', 1),      -- Matic
  (3, 'GSX', 3)           -- Sport
ON CONFLICT DO NOTHING;
```

### 14.7 Update ProductModal UI

#### State tambahan
```js
const [vehicleKategoris, setVehicleKategoris] = useState([]);
```

#### Fetch helpers
```js
const fetchVehicleKategoris = async () => {
  const { data } = await supabase.from('vehicle_kategori').select('*').order('name');
  setVehicleKategoris(data || []);
};
```

#### UI Layout Baru
```jsx
{product.kategori !== 'Pilok' && (
  <div className="md:col-span-2 mt-4">
    <h3 className="text-lg font-semibold mb-2 text-slate-800">Spesifikasi Motor</h3>
    
    {/* Level 1: Kategori Motor */}
    <div className="mb-3">
      <label htmlFor="vehicle_kategori_id" className="block mb-1 text-sm font-medium text-slate-700">Kategori Motor</label>
      <select id="vehicle_kategori_id" value={product.vehicle_kategori_id || ""} onChange={(e) => { handleChange(e); /* reset brand/model/kode */ }} className="w-full p-2 border rounded bg-white">
        <option value="">-- Pilih Kategori --</option>
        {vehicleKategoris.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
      </select>
    </div>
    
    {/* Level 2-3: Merek & Tipe (cascade) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
      <div>
        <label htmlFor="vehicle_brand_id" className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
        <select id="vehicle_brand_id" value={product.vehicle_brand_id || ""} onChange={(e) => { handleChange(e); fetchVehicleModels(e.target.value); fetchVehicleCodes(e.target.value, null); }} className="w-full p-2 border rounded bg-white">
          <option value="">-- Pilih Merek --</option>
          {vehicleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="vehicle_model_id" className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor</label>
        <select id="vehicle_model_id" value={product.vehicle_model_id || ""} onChange={(e) => { handleChange(e); fetchVehicleCodes(product.vehicle_brand_id, e.target.value); }} className="w-full p-2 border rounded bg-white" disabled={!product.vehicle_brand_id}>
          <option value="">-- Pilih Tipe --</option>
          {vehicleModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
    
    {/* Level 4: Kode Motor */}
    <div>
      <label htmlFor="vehicle_code_id" className="block mb-1 text-sm font-medium text-slate-700">Kode Motor</label>
      <select id="vehicle_code_id" value={product.vehicle_code_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-white" disabled={!vehicleCodes.length}>
        <option value="">-- Pilih Kode --</option>
        {vehicleCodes.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
      </select>
    </div>
  </div>
)}
```

#### Update handleSubmit
```js
const finalProduct = {
  ...product,
  vehicle_kategori_id: product.vehicle_kategori_id ? Number(product.vehicle_kategori_id) : null,
  vehicle_brand_id: product.vehicle_brand_id ? Number(product.vehicle_brand_id) : null,
  vehicle_model_id: product.vehicle_model_id ? Number(product.vehicle_model_id) : null,
  vehicle_code_id: product.vehicle_code_id ? Number(product.vehicle_code_id) : null,
};
```

### 14.8 Update Halaman Manajemen Kendaraan

Tambahkan tab pertama: **Kategori Motor**

```
┌──────────────────────────────────────────────────────┐
│ Manajemen Kendaraan                                   │
├──────────────────────────────────────────────────────┤
│ [Kategori] [Merek] [Tipe] [Kode]                      │
├──────────────────────────────────────────────────────┤
│ Kategori Motor:                                       │
│ ┌─────┬──────────┬──────────┐                        │
│ │ ID  │ Nama     │ Icon     │                        │
│ ├─────┼──────────┼──────────┤                        │
│ │ 1   │ Matic    │ ⚙️       │                        │
│ │ 2   │ Bebek    │ 🏍️       │                        │
│ │ 3   │ Sport    │ 🔥       │                        │
│ └─────┴──────────┴──────────┘                        │
│                                                      │
│ [+ Tambah Kategori]                                  │
└──────────────────────────────────────────────────────┘
```

**Komponen baru:**
- `VehicleKategoriModal.jsx` — modal CRUD kategori motor

### 14.9 Keuntungan Menambah Kategori Motor

1. **Filter produk** — kasir bisa filter produk berdasarkan kategori motor (Matic vs Bebek)
2. **Recommendation** — sistem bisa rekomendasikan produk berdasarkan kategori motor pelanggan
3. **Pricing** — harga bisa disesuaikan per kategori (misal: oli matic vs oli bebek)
4. **Reporting** — laporan penjualan per kategori motor
5. **Integrasi service** — jika nanti ada modul service, bisa filter sparepart per kategori

### 14.10 Full Hierarchy Diagram

```
vehicle_kategori (Kategori Motor)
    └── vehicle_brands (Merek Motor)
            └── vehicle_models (Tipe Motor)
                    └── vehicle_codes (Kode Motor)
                            └── products (Produk)
```

Setiap level opsional:
- Produk Pilok: tidak perlu merek/tipe/kode
- Produk sparepart umum: perlu merek + tipe, tidak perlu kode
- Produk spesifik: perlu full hierarchy

### 14.11 Execution Order Final

1. Migration SQL: `vehicle_kategori` + update `vehicle_models` + update `products`
2. Seed data: kategori → brands → models → codes
3. Update `initialProductState` + `useEffect` hydration
4. Tambah fetch state + handlers untuk 4-level cascade
5. Tambah UI cascade di `ProductModal`: kategori → merek → tipe → kode
6. Update `handleSubmit`
7. Build halaman Manajemen Kendaraan dengan 4 tab
8. Test end-to-end semua level

---

## 15. Tambahan: Tabel Pivot Kompatibilitas Produk (product_vehicle_compatibilities)

### 15.1 Konsep
Satu sparepart sering compatible dengan banyak model motor sekaligus.
Contoh: **Kampas Rem Depan** bisa dipakai di Honda Vario, Beat, Scoopy, dll.

Tabel pivot ini menghubungkan:
- `products` (1) → (N) `vehicle_models` (N)

Melalui tabel relasi: `product_vehicle_compatibilities`

### 15.2 Struktur Tabel Pivot

#### `product_vehicle_compatibilities`
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| `id` | serial PK | Auto-increment |
| `product_id` | uuid FK | Ref ke `products(id)` ON DELETE CASCADE |
| `vehicle_model_id` | int FK | Ref ke `vehicle_models(id)` ON DELETE CASCADE |
| `vehicle_brand_id` | int FK | Ref ke `vehicle_brands(id)` — denormalisasi untuk query cepat |
| `vehicle_kategori_id` | int FK | Ref ke `vehicle_kategori(id)` — optional, untuk filter cepat |
| `is_primary` | boolean | Apakah ini model utama untuk produk |
| `notes` | text | Catatan khusus (opsional) |
| `created_at` | timestamp | Default now() |

**Unique constraint:** `UNIQUE(product_id, vehicle_model_id)` — mencegah duplikat

### 15.3 Alasan Desain

**Mengapa tabel pivot?**
- `products.vehicle_model_id` hanya bisa menyimpan **1 model**
- Tapi sparepart bisa compatible dengan **banyak model**
- Tabel pivot memungkinkan 1 produk ↔ N model motor

**Mengapa ada `vehicle_brand_id` dan `vehicle_kategori_id` di pivot?**
- Denormalisasi sengaja untuk query cepat
- Misal: "tampilkan semua kampas rem untuk Honda Matic" → tidak perlu join 3 tabel
- Performa filter di POS akan lebih cepat

**Mengapa ada `is_primary`?**
- Produk bisa punya "model utama" untuk tampil di halaman depan
- Contoh: Kampas Rem Vario → model utama = Honda Vario
- Di POS: tampilkan "Kompatible dengan: Vario, Beat, Scoopy"

### 15.4 Data Contoh

```sql
-- Kampas Rem Depan compatible dengan beberapa model Honda Matic
INSERT INTO product_vehicle_compatibilities (product_id, vehicle_model_id, vehicle_brand_id, vehicle_kategori_id, is_primary) VALUES
  ('product-uuid-1', 1, 1, 1, true),   -- Vario (primary)
  ('product-uuid-1', 3, 1, 1, false),  -- Beat
  ('product-uuid-1', 4, 1, 1, false)   -- Scoopy
ON CONFLICT DO NOTHING;
```

### 15.5 Update Tabel Products

Hapus kolom `vehicle_model_id` dan `vehicle_code_id` dari `products` (opsional).

**Pilihan desain:**

| Opsi | Deskripsi | Kapan Pakai |
|------|-----------|-------------|
| **A** | Simpan `vehicle_model_id` + `vehicle_code_id` di `products` untuk model utama | Jika mayoritas produk hanya compatible dengan 1 model |
| **B** | Hapus kolom FK dari `products`, simpan semua di pivot | Jika mayoritas produk compatible dengan banyak model |

**Rekomendasi: Opsi B** (lebih fleksibel, konsisten).

Jika pakai Opsi B:
```sql
ALTER TABLE products 
  DROP COLUMN IF EXISTS vehicle_brand_id,
  DROP COLUMN IF EXISTS vehicle_model_id,
  DROP COLUMN IF EXISTS vehicle_code_id,
  DROP COLUMN IF EXISTS vehicle_kategori_id;
```

Tapi tetap simpan kolom-kolom ini di `products` untuk keperluan lain jika dibutuhkan.

### 15.6 Update ProductModal

#### UI Baru: Multi-select Kompatibilitas

```jsx
{product.kategori !== 'Pilok' && (
  <div className="md:col-span-2 mt-4">
    <h3 className="text-lg font-semibold mb-2 text-slate-800">Kompatibilitas Kendaraan</h3>
    
    {/* Kategori Motor */}
    <div className="mb-3">
      <label className="block mb-1 text-sm font-medium text-slate-700">Kategori Motor</label>
      <select id="vehicle_kategori_id" value={product.vehicle_kategori_id || ""} onChange={handleKategoriChange} className="w-full p-2 border rounded bg-white">
        <option value="">-- Pilih Kategori --</option>
        {vehicleKategoris.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
      </select>
    </div>
    
    {/* Merek Motor */}
    <div className="mb-3">
      <label className="block mb-1 text-sm font-medium text-slate-700">Merek Motor</label>
      <select id="vehicle_brand_id" value={product.vehicle_brand_id || ""} onChange={handleBrandChange} className="w-full p-2 border rounded bg-white">
        <option value="">-- Pilih Merek --</option>
        {vehicleBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
    
    {/* Multi-select Tipe Motor */}
    <div className="mb-3">
      <label className="block mb-1 text-sm font-medium text-slate-700">Tipe Motor (Compatible)</label>
      <div className="border rounded p-2 max-h-48 overflow-y-auto">
        {vehicleModels.length === 0 ? (
          <p className="text-sm text-slate-500">Pilih merek terlebih dahulu</p>
        ) : (
          vehicleModels.map(model => {
            const isChecked = selectedVehicleModels.includes(model.id);
            return (
              <label key={model.id} className="flex items-center gap-2 py-1 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleVehicleModel(model.id)}
                  className="rounded"
                />
                <span className="text-sm">{model.name}</span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        {selectedVehicleModels.length} model dipilih
      </p>
    </div>
  </div>
)}
```

#### State tambahan
```js
const [selectedVehicleModels, setSelectedVehicleModels] = useState([]);
const [vehicleKategoris, setVehicleKategoris] = useState([]);
const [vehicleBrands, setVehicleBrands] = useState([]);
const [vehicleModels, setVehicleModels] = useState([]);
```

#### Toggle handler
```js
const toggleVehicleModel = (modelId) => {
  setSelectedVehicleModels(prev => 
    prev.includes(modelId) 
      ? prev.filter(id => id !== modelId)
      : [...prev, modelId]
  );
};
```

#### Update handleSubmit
```js
const finalProduct = {
  ...product,
  vehicle_kategori_id: product.vehicle_kategori_id ? Number(product.vehicle_kategori_id) : null,
  vehicle_brand_id: product.vehicle_brand_id ? Number(product.vehicle_brand_id) : null,
};

// Save pivot table
if (selectedVehicleModels.length > 0) {
  // Delete existing compatibilities
  await supabase.from('product_vehicle_compatibilities').delete().eq('product_id', id);
  
  // Insert new compatibilities
  const compatibilities = selectedVehicleModels.map(modelId => ({
    product_id: id,
    vehicle_model_id: modelId,
    vehicle_brand_id: Number(product.vehicle_brand_id),
    vehicle_kategori_id: product.vehicle_kategori_id ? Number(product.vehicle_kategori_id) : null,
    is_primary: false,
  }));
  
  await supabase.from('product_vehicle_compatibilities').insert(compatibilities);
}
```

### 15.7 Update Halaman Manajemen Kendaraan

Tambahkan fitur manajemen kompatibilitas:

```
┌──────────────────────────────────────────────────────────┐
│ Manajemen Kendaraan                                       │
├──────────────────────────────────────────────────────────┤
│ [Kategori] [Merek] [Tipe] [Kode] [Kompatibilitas]         │
├──────────────────────────────────────────────────────────┤
│ Kompatibilitas Produk:                                    │
│                                                          │
│ Pilih Produk: [Kampas Rem Depan ▼]                       │
│                                                          │
│ Model yang compatible:                                    │
│ ☑ Honda Vario                                            │
│ ☑ Honda Beat                                             │
│ ☐ Honda Scoopy                                           │
│ ☑ Yamaha Nmax                                            │
│                                                          │
│ [Simpan Kompatibilitas]                                   │
└──────────────────────────────────────────────────────────┘
```

**Komponen baru:**
- `VehicleCompatibilityManager.jsx` — UI manajemen kompatibilitas per produk

### 15.8 Query di POS untuk Filter Produk

```jsx
// Filter produk berdasarkan kategori motor di POS
const filterProductsByKategori = (kategoriId) => {
  return products.filter(p => 
    p.product_vehicle_compatibilities?.some(
      c => c.vehicle_kategori_id === kategoriId
    )
  );
};

// Filter produk berdasarkan merek motor
const filterProductsByBrand = (brandId) => {
  return products.filter(p => 
    p.product_vehicle_compatibilities?.some(
      c => c.vehicle_brand_id === brandId
    )
  );
};
```

### 15.9 Performa & Index

Buat index untuk query cepat:
```sql
CREATE INDEX idx_product_vehicle_compatibilities_product_id ON product_vehicle_compatibilities(product_id);
CREATE INDEX idx_product_vehicle_compatibilities_model_id ON product_vehicle_compatibilities(vehicle_model_id);
CREATE INDEX idx_product_vehicle_compatibilities_brand_id ON product_vehicle_compatibilities(vehicle_brand_id);
CREATE INDEX idx_product_vehicle_compatibilities_kategori_id ON product_vehicle_compatibilities(vehicle_kategori_id);
```

### 15.10 Keuntungan Sistem Pivot

1. **Fleksibel** — 1 produk bisa compatible dengan banyak model
2. **Akurat** — tidak ada asumsi "1 produk = 1 model"
3. **Mudah dikelola** — admin bisa tambah/hapus kompatibilitas tanpa edit produk
4. **Filter cepat** — query by brand/kategori/model sangat cepat dengan index
5. **Reporting** — laporan "produk apa saja yang compatible dengan Honda Vario?"
6. **Integrasi service** — jika nanti ada modul service, bisa cari sparepart berdasarkan model motor

### 15.11 Contoh Use Case

**Skenario:** Toko punya 100 jenis kampas rem.

| Produk | Kompatibilitas |
|--------|---------------|
| Kampas Rem Depan Vario | Honda Vario, Beat, Scoopy (3 model) |
| Kampas Rem Depan Nmax | Yamaha Nmax, Aerox (2 model) |
| Kampas Rem Depan Ninja | Kawasaki Ninja, Z (2 model) |

**Tanpa pivot:** Harus buat 7 produk terpisah → ribet, duplikasi data.

**Dengan pivot:** 3 produk + relasi kompatibilitas → clean, mudah maintain.

### 15.12 Execution Order Final Update

1. Migration SQL: `vehicle_kategori`, `vehicle_codes`, `product_vehicle_compatibilities`
2. Seed data: kategori → brands → models → codes
3. Update `products` table (hapus kolom FK jika pakai Opsi B)
4. Update `initialProductState` + `useEffect` hydration
5. Tambah state + fetch helpers untuk 4-level + pivot
6. Tambah UI cascade + multi-select kompatibilitas di modal
7. Update `handleSubmit` untuk save pivot data
8. Build halaman Manajemen Kendaraan dengan 5 tab (Kategori, Merek, Tipe, Kode, Kompatibilitas)
9. Add RLS policies untuk `product_vehicle_compatibilities`
10. Test end-to-end: create produk → assign multiple models → verify di POS

### 15.13 Catatan Teknis

**Soft delete pada pivot:** Gunakan `is_active` atau hard delete? 
- Rekomendasi: **soft delete** (`is_active`) karena relasi ini penting untuk histori

**Cascade delete:** Jika model motor dihapus, relasi ikut terhapus.
- Implementasi: `ON DELETE CASCADE` di FK

**Batch insert:** Saat assign banyak model, gunakan batch insert (max 100 per batch) untuk performa.

**Validation:** Pastikan tidak ada duplikat `(product_id, vehicle_model_id)` via unique constraint.

---

## 16. Saran Tambahan: Fitur Pendukung Produk

### 16.1 Batch Operations untuk Produk

**Fitur:** Ubah harga/stok/kategori banyak produk sekaligus.

**Mengapa perlu:**
- Saat harga beli naik, perlu update harga jual ratusan produk
- Saat stok opname, perlu update stok banyak produk
- Saat kategori baru dibuat, perlu reassign produk

**Implementasi:**
- Checkbox selection di tabel `Produk.jsx`
- Bulk action bar: "Update Harga Jual +10%", "Ubah Kategori ke Oli", "Set Stok Minimum"
- Confirmation dialog + preview perubahan sebelum apply

**UI:**
```
┌─────────────────────────────────────────┐
│ ☑ Kampas Rem Depan  ☑ Kampas Rem Belakang │
├─────────────────────────────────────────┤
│ Aksi Bulk:                               │
│ [Update Harga Jual ▼] [Apply]            │
│ [Ubah Kategori ▼]   [Apply]              │
│ [Set Stok Min ▼]    [Apply]              │
└─────────────────────────────────────────┘
```

---

### 16.2 Product Variants (Opsional)

**Fitur:** Satu produk dengan beberapa varian (warna, ukuran, kemasan).

**Struktur:**
```
products
└── product_variants
    ├── id
    ├── product_id (FK)
    ├── sku (unique)
    ├── harga_jual
    ├── stok
    ├── image_url
    ├── color_hex
    └── variant_label (misal: "150ml", "300ml")
```

**Kapan pakai:**
- Produk dengan kemasan berbeda (oli 0.8L vs 1L vs 4L)
- Warna cat yang sama merek tapi warna berbeda
- Ukuran kampas rem yang sama tapi ketebalan berbeda

**Kapan tidak pakai:**
- Jika setiap varian cukup dibuat produk terpisah dengan kode berbeda
- Simpelnya: jangan over-engineer

---

### 16.3 Low Stock Alert & Notifications

**Fitur:** Notifikasi saat stok di bawah `stok_min`.

**Implementasi:**
- Badge merah di tabel Produk: "Stok Rendah"
- Filter "Stok Rendah" di halaman Produk
- Notifikasi di dashboard POS: "5 produk stok rendah"
- Opsi: kirim notifikasi WhatsApp/email ke admin

**Query:**
```sql
SELECT * FROM products 
WHERE stok <= stok_min 
  AND status = 'Aktif'
  AND kategori != 'Pilok';
```

---

### 16.4 Expiry Date Tracking (Untuk Oli/Cat)

**Fitur:** Track expiry date untuk produk yang punya masa kadaluarsa.

**Kolom tambahan di products:**
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS is_perishable boolean DEFAULT false;
```

**UI:**
- Input expiry date di ProductModal (hanya muncul jika `is_perishable` dicentang)
- Warning di POS: "Produk ini akan expired dalam 30 hari"
- Filter di laporan: "Produk expired", "Produk hampir expired"

---

### 16.5 Supplier Product Mapping

**Fitur:** Hubungkan produk dengan supplier SKU dan harga beli terbaru.

**Tabel baru:**
```sql
CREATE TABLE supplier_products (
  id serial PRIMARY KEY,
  supplier_id integer REFERENCES suppliers(id),
  product_id uuid REFERENCES products(id),
  supplier_sku text,
  harga_beli_supplier numeric,
  last_synced_at timestamp,
  created_at timestamp DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);
```

**Manfaat:**
- Track harga beli dari berbagai supplier
- Auto-update harga beli saat import data supplier
- Bandingkan harga antar supplier

---

### 16.6 Product Audit Trail

**Fitur:** Track setiap perubahan produk (siapa, kapan, apa yang berubah).

**Tabel baru:**
```sql
CREATE TABLE product_audit_logs (
  id serial PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  user_id uuid REFERENCES auth.users(id),
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamp DEFAULT now()
);
```

**Trigger PostgreSQL:**
```sql
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_audit_logs (product_id, user_id, field_changed, old_value, new_value)
  VALUES (NEW.id, auth.uid(), 'harga_jual', OLD.harga_jual::text, NEW.harga_jual::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Manfaat:**
- Track siapa yang ubah harga produk
- Rollback perubahan jika ada kesalahan
- Compliance/audit untuk bisnis

---

### 16.7 Enhanced Search & Filter di POS

**Fitur:** Search produk di POS menjadi lebih powerful.

**Implementasi:**
- Full-text search di `nama`, `kode`, `sku`, `search_synonyms`, `search_terms`
- Filter by: kategori, merek, kategori motor, harga range, stok tersedia
- Search by kode motor: ketik "KVB" → tampilkan semua kampas rem Vario
- Recent products: tampilkan produk yang baru dipilih

**Query dengan PostgreSQL FTS:**
```sql
ALTER TABLE products ADD COLUMN search_vector tsvector;
UPDATE products SET search_vector = 
  to_tsvector('indonesian', nama || ' ' || kode || ' ' || sku || ' ' || search_synonyms || ' ' || search_terms);
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
```

---

### 16.8 Image Gallery per Product

**Fitur:** Multiple images per product dengan drag-drop reorder.

**Implementasi:**
- Upload hingga 5 gambar per produk
- Set gambar utama (utama, gambar 2, gambar 3, color swatch)
- Drag-drop untuk urutan gambar
- Zoom/lightbox saat klik gambar di POS

**UI:**
```
┌─────────────────────────────────────────┐
│ [Upload Gambar Utama]                   │
│                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │  1  │ │  2  │ │  3  │ │  4  │       │
│ │ [X] │ │ [X] │ │ [X] │ │ [X] │       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│ Drag untuk reorder                      │
└─────────────────────────────────────────┘
```

---

### 16.9 Recommended Products (Cross-sell)

**Fitur:** Rekomendasikan produk lain yang sering dibeli bersamaan.

**Implementasi:**
- Tabel `product_recommendations`: product_id, recommended_product_id, priority
- Di POS: "Pelanggan yang membeli X juga membeli Y"
- Di halaman produk: "Produk Terkait"

**Data source:**
- Manual assignment oleh admin
- Otomatis dari data transaksi (co-purchase analysis)

---

### 16.10 Dynamic Pricing Rules

**Fitur:** Harga bisa berubah berdasarkan kondisi tertentu.

**Aturan:**
- Harga grosir: otomatis diskon jika beli > N pcs
- Harga member: diskon khusus untuk customer tertentu
- Harga kuantitas: tier pricing (1 pcs = Rp 10.000, 10 pcs = Rp 9.000)
- Harga berdasarkan waktu: diskon akhir pekan

**Tabel:**
```sql
CREATE TABLE pricing_rules (
  id serial PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  rule_type text, -- 'quantity', 'member', 'time'
  min_quantity integer,
  discount_percentage numeric,
  customer_group_id integer,
  start_time time,
  end_time time,
  is_active boolean,
  created_at timestamp DEFAULT now()
);
```

---

### 16.11 Import Excel Enhancement

**Fitur:** Import produk dari Excel dengan mapping kolom lengkap.

**Kolom yang didukung:**
- kode, nama, merek, kategori, harga_beli, harga_jual, stok
- vehicle_kategori, vehicle_brand, vehicle_model, vehicle_code
- image_url (URL gambar eksternal)
- tags, search_synonyms, search_terms

**Validasi:**
- Check duplicate kode
- Validate harga (harga_jual > harga_beli)
- Validate vehicle references (brand/model/code harus ada di DB)
- Preview before import: "100 produk akan di-import, 5 duplikat, 2 error"

---

### 16.12 Product Status & Visibility

**Fitur:** Lebih granular dari sekadar Aktif/Tidak Aktif.

**Status yang disarankan:**
- `Aktif` — tampil di POS dan store
- `Tidak Aktif` — disembunyikan tapi data tetap ada
- `Diarsipkan` — tidak ditampilkan kecuali di halaman arsip
- `Draft` — belum siap dijual, hanya bisa diedit oleh admin
- `Habis` — stok 0, tampilkan "Segera Hadir" di store

**Kolom tambahan:**
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS visibility jsonb, -- { pos: true, store: true, web: true }
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false, -- Tampilkan di homepage
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0; -- Urutan tampil
```

---

### 16.13 Catatan Implementasi

**Prioritas:**
1. **High:** Batch operations, Low stock alerts, Enhanced search
2. **Medium:** Image gallery, Supplier mapping, Import enhancement
3. **Low:** Product variants, Audit trail, Dynamic pricing, Recommendations

**Dependency:**
- Batch operations butuh UI selection di tabel Produk
- Image gallery butuh upload multiple files
- Search FTS butuh migration SQL + re-index
- Variants butuh schema baru + UI kompleks

**Rekomendasi:** Implementasi bertahap, mulai dari yang high priority.

---

## 17. Update Berdasarkan Konfirmasi & Data Kendaraan

### 17.1 Konfirmasi Poin 1: Image URL Display di Modal Edit
**Tidak perlu upload ulang.** Di modal edit produk:
- Tampilkan URL dari `image_url`, `image_url_2`, `image_url_3` dalam readonly text input
- Tambahkan button "Copy URL" untuk setiap gambar
- User bisa copy-paste URL jika perlu edit manual
- Jika user ingin ganti gambar, tetap bisa via upload button

**UI:**
```
Gambar Utama:
[Readonly: https://...supabase.co/.../produk-pilok/...]
[Copy URL] [Ganti Gambar]

[Preview gambar]
```

### 17.2 Konfirmasi Poin 2: Supplier
Tidak perlu fitur baru. Cukup gunakan kolom `supplier` + `supplier_id` yang sudah ada di tabel `products`.

### 17.3 Konfirmasi Poin 3: Recommended Products (Automatic)
**Bukan manual assignment.** Rekomendasi dihasilkan dari data transaksi:

**Algoritma sederhana:**
1. Ambil semua transaksi yang mengandung produk X
2. Cari produk lain yang sering dibeli bersamaan (co-purchase)
3. Hitung confidence score = (jumlah_beli_bersama / total_transaksi_X) * 100
4. Tampilkan top 3-5 produk dengan score tertinggi

**Tabel baru:**
```sql
CREATE TABLE product_recommendations (
  id serial PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  confidence_score numeric DEFAULT 0,
  purchase_count integer DEFAULT 0,
  last_calculated_at timestamp,
  created_at timestamp DEFAULT now(),
  UNIQUE(product_id, recommended_product_id)
);
```

**Cron job / trigger:** Hitung ulang rekomendasi setiap hari atau setiap kali ada transaksi baru.

**UI di POS:**
```
┌─────────────────────────────────────────┐
│ Produk: Kampas Rem Depan Vario          │
│                                         │
│ Rekomendasi:                            │
│ - Kampas Rem Belakang Vario (85%)       │
│ - Oli Shell 15W40 (72%)                 │
│ - Kabel Rem (64%)                       │
└─────────────────────────────────────────┘
```

### 17.4 Konfirmasi Poin 4: Visibility
**Tidak diimplementasikan.** Fokus ke fitur yang lebih prioritas.

### 17.5 Konfirmasi Poin 5: Vehicle Compatibility Pivot

**Rekomendasi saya: Pakai tabel pivot `product_vehicle_compatibilities`**

**Alasan:**
- 1 sparepart bisa compatible dengan banyak model
- Tabel pivot menyediakan fleksibilitas maksimal
- Query cepat dengan index yang tepat
- Mudah dikelola via UI

**Struktur final:**
```sql
CREATE TABLE product_vehicle_compatibilities (
  id serial PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  vehicle_model_id integer REFERENCES vehicle_models(id) ON DELETE CASCADE,
  vehicle_brand_id integer REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  vehicle_kategori_id integer REFERENCES vehicle_kategori(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp DEFAULT now(),
  UNIQUE(product_id, vehicle_model_id)
);

CREATE INDEX idx_product_vehicle_compatibilities_product_id ON product_vehicle_compatibilities(product_id);
CREATE INDEX idx_product_vehicle_compatibilities_model_id ON product_vehicle_compatibilities(vehicle_model_id);
CREATE INDEX idx_product_vehicle_compatibilities_brand_id ON product_vehicle_compatibilities(vehicle_brand_id);
CREATE INDEX idx_product_vehicle_compatibilities_kategori_id ON product_vehicle_compatibilities(vehicle_kategori_id);
```

**Catatan:** Denormalisasi `vehicle_brand_id` dan `vehicle_kategori_id` di pivot untuk query cepat. Tapi **jangan** simpan kolom FK di `products` — murni di pivot.

### 17.6 Data Kendaraan yang Sudah Disiapkan

Format data di `/workspaces/bjs-racing-store/data-kendaraan/`:
```json
[
  {
    "vehicle_brand": "HONDA",
    "category": "Matik",
    "vehicle_model": "BeAT 110 Karburator",
    "vehicle_code": "KVY",
    "year_start": 2008,
    "year_end": 2012
  }
]
```

**Total data:**
- Honda: 38 entries
- Yamaha: 35 entries
- Suzuki: 21 entries
- Kawasaki: 16 entries
- Vespa: 13 entries

**Total: 123 entries**

**Mapping ke DB:**
- `vehicle_brands.name` ← `vehicle_brand` (HONDA, YAMAHA, dll)
- `vehicle_kategori.name` ← `category` (Matik, Bebek, Sport, dll)
- `vehicle_models.name` ← `vehicle_model`
- `vehicle_codes.code` ← `vehicle_code`
- `vehicle_codes.name` ← `vehicle_model` (nama lengkap)
- `vehicle_codes.year_start` ← `year_start`
- `vehicle_codes.year_end` ← `year_end`

### 17.7 Tambahan Kolom di vehicle_codes

Berdasarkan data yang ada, tambahkan kolom:
```sql
ALTER TABLE vehicle_codes 
  ADD COLUMN IF NOT EXISTS year_start integer,
  ADD COLUMN IF NOT EXISTS year_end integer;
```

### 17.8 Search by Kode Motor (Poin 7)

**Fitur:** Di POS, user bisa search produk dengan ketik kode motor.

**Implementasi:**
1. Tambah input search khusus "Search by Kode Motor" di POS
2. Query ke `product_vehicle_compatibilities` + `vehicle_codes`
3. Tampilkan produk yang compatible dengan kode motor tersebut

**Query:**
```jsx
const searchByVehicleCode = (code) => {
  const { data } = await supabase
    .from('product_vehicle_compatibilities')
    .select('*, vehicle_codes(code, name), products(*)')
    .eq('vehicle_codes.code', code.toUpperCase());
  
  return data?.map(c => c.products) || [];
};
```

**UI di POS:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search by Kode Motor: [KVB____]     │
│                                         │
│ Results:                                │
│ - Kampas Rem Depan Vario                │
│ - Kampas Rem Belakang Vario             │
│ - Oli Vario 125cc                       │
└─────────────────────────────────────────┘
```

### 17.9 Update Execution Order

1. Migration SQL: `vehicle_kategori`, `vehicle_codes` (dengan `year_start`, `year_end`), `product_vehicle_compatibilities`
2. Seed data dari `/workspaces/bjs-racing-store/data-kendaraan/`
3. Update `products` table (tidak perlu kolom FK, murni pivot)
4. Update `initialProductState` + `useEffect` hydration
5. Tambah state + fetch helpers untuk 4-level cascade + pivot
6. Tambah UI cascade + multi-select kompatibilitas di modal
7. Update `handleSubmit` untuk save pivot data
8. Build halaman Manajemen Kendaraan dengan 4 tab + search by kode
9. Build recommended products engine (automatic dari transaksi)
10. Integrasi search by kode motor di POS
11. Test end-to-end

### 17.10 Catatan Import Data

**Script import data kendaraan dari JSON:**
```bash
node scripts/import-vehicle-data.js
```

Script akan:
1. Baca semua file `.md` dari `/workspaces/bjs-racing-store/data-kendaraan/`
2. Parse JSON
3. Insert ke `vehicle_brands`, `vehicle_kategori`, `vehicle_models`, `vehicle_codes`
4. Handle duplicate dengan `ON CONFLICT DO NOTHING`

# Feed Image Storage — Setup Supabase Storage untuk POS

## Fitur
- Upload gambar langsung dari halaman Manajemen Feed ke Supabase Storage
- Otomatis kompres gambar sebelum upload (max 1MB, max 1200px)
- URL publik langsung dari Supabase Storage
- Pilih multiple produk terkait per post (search by nama, merek, kode produk)
- Moderasi komentar (tandai spam, hapus komentar)

---

## Prasyarat
- Akses ke Supabase Dashboard (`https://supabase.com/dashboard`)
- Hak akses untuk membuat Storage bucket
- Bucket `feed-images` sudah dibuat di Supabase Storage

---

## Langkah 1: Buat Storage Bucket di Supabase

1. Buka https://supabase.com/dashboard
2. Pilih project `bjs-racing-store` (project ID: `ykotzsmncvyfveypeevb`)
3. Di sidebar kiri, klik **Storage**
4. Klik **New bucket**
5. Isi:
   - **Name**: `feed-images`
   - **Public bucket**: ON (aktifkan)
   - **File size limit**: 50MB (atau sesuai kebutuhan)
   - **Allowed MIME types**: biarkan kosong untuk允许 semua
6. Klik **Create bucket**

### Set Policy agar Publik Bisa Baca Gambar

1. Di dalam bucket `feed-images`, klik tab **Policies**
2. Klik **New policy**
3. Pilih **For full customization**
4. Isi:
   - **Policy name**: `Public can view feed images`
   - **Allowed operation**: pilih **SELECT**
   - **Target roles**: pilih **anon** (public)
   - **Using expression**: `true`
5. Klik **Review** → **Save policy**

Alternatif: jalankan SQL migration ini di Supabase SQL Editor:

```sql
CREATE POLICY "Public can view feed images"
ON storage.objects FOR SELECT
USING (bucket_id = 'feed-images');
```

---

## Langkah 2: Environment Variables

Tidak perlu environment variable khusus untuk upload feed images. Upload menggunakan Supabase client yang sudah terkonfigurasi di POS app (`src/supabaseClient.js`).

Pastikan `SUPABASE_SERVICE_KEY` dan `PUBLIC_SUPABASE_ANON_KEY` sudah diisi di `.env` dan Vercel environment variables.

---

## Langkah 3: Cara Kerja Upload di POS App

### Frontend
- File: `src/pages/ManajemenFeed.jsx`
- Admin klik **"Upload dari Komputer"**, pilih gambar
- Preview lokal muncul
- Frontend kompres gambar (max 1MB, max 1200px) menggunakan `browser-image-compression`
- Upload langsung ke Supabase Storage bucket `feed-images`
- URL publik otomatis terisi di field **Media URL**
- Jika gagal, tampilkan error dan admin bisa paste URL manual

### Upload Flow
```
File input → Kompres → Upload ke Supabase Storage → Get public URL → Set ke form state
```

---

## Langkah 4: Testing

### Testing Lokal
1. Jalankan POS app:
   ```bash
   cd /workspaces/bjs-racing-pos
   npm run dev
   ```
2. Buka browser ke `http://localhost:3000`
3. Login sebagai admin
4. Buka **Manajemen Feed Post**
5. Klik **Tambah Post**
6. Klik **Upload dari Komputer**, pilih gambar
7. Verifikasi:
   - Preview muncul
   - URL otomatis terisi di field Media URL (format: `https://ykotzsmncvyfveypeevb.supabase.co/storage/v1/object/public/feed-images/...`)
   - File bisa diakses via URL tersebut

### Testing Production
1. Deploy POS app ke Vercel
2. Test langkah 1-7 seperti testing lokal

---

## Langkah 5: Verifikasi di Store App

1. Buka `https://bjsracing.com/blog`
2. Pastikan post baru dengan gambar dari Supabase Storage tampil dengan benar
3. Cek responsive di mobile dan desktop
4. Klik card, pastikan gambar tampil di halaman detail

---

## Catatan Penting

### Keamanan
- Bucket `feed-images` sudah di-set **public** untuk read
- Policy `SELECT` menggunakan `true` agar publik bisa baca gambar
- Upload hanya bisa dilakukan oleh admin melalui POS app (menggunakan authenticated Supabase client)

### URL Format
URL gambar yang disimpan di database:
```
https://ykotzsmncvyfveypeevb.supabase.co/storage/v1/object/public/feed-images/feed-1234567890-image.jpg
```

URL ini sudah di-whitelist di CSP Store (`*.supabase.co`), jadi tidak ada masalah keamanan.

### Backup
- Supabase Storage memiliki backup otomatis
- Jika nanti butuh migrasi ke Cloudinary atau storage lain, cukup ganti bucket name di kode

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Upload gagal, error "Bucket not found" | Pastikan bucket `feed-images` sudah dibuat di Supabase Dashboard |
| Upload gagal, error "Unauthorized" | Cek `SUPABASE_SERVICE_KEY` atau `PUBLIC_SUPABASE_ANON_KEY` sudah diisi |
| Gambar tidak tampil di Store | Cek policy bucket `feed-images` sudah di-set public (`SELECT` untuk `anon`) |
| Gambar broken icon | Cek URL gambar valid, pastikan file ada di bucket |

---

## File yang Terlibat

### Store App (`bjs-racing-store`)
- `src/pages/blog/index.astro` — feed listing
- `src/pages/blog/[slug].astro` — detail post
- `src/components/feed/FeedGrid.jsx` — grid layout
- `src/components/feed/FeedCard.jsx` — card component
- `src/components/feed/CommentSection.jsx` — komentar
- `src/components/BottomNav.jsx` — bottom nav dengan tab Feed
- `src/pages/sitemap.xml.ts` — dynamic sitemap
- `public/robots.txt` — robots rules
- `supabase/migrations/2026_08_20_create_feed_posts.sql` — database schema
- `vercel.json` — CSP headers (sudah include `*.supabase.co`)

### POS App (`bjs-racing-pos`)
- `src/pages/ManajemenFeed.jsx` — admin CRUD feed + upload UI
- `src/supabaseClient.js` — Supabase client configuration
- `.env` — environment variables lokal

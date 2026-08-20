# Google Drive Integration — Setup Lengkap GCP & Konfigurasi POS

## Ringkasan
Integrasi ini memungkinkan admin mengupload gambar langsung dari halaman **Manajemen Feed** di POS app ke Google Drive, dan link publik otomatis terisi di form. Upload dilakukan via backend API POS (`/api/upload-drive`) menggunakan service account, sehingga credential Google tidak pernah ke-expose ke browser.

---

## Prasyarat
- Akses ke [Google Cloud Console](https://console.cloud.google.com/)
- Hak akses untuk menambah environment variables di POS app
- Folder Google Drive khusus untuk menyimpan gambar feed

---

## Langkah 1: Buat Project di Google Cloud Platform (GCP)

1. Buka https://console.cloud.google.com/
2. Klik **project selector** di pojok kiri atas (nama project saat ini)
3. Klik **New Project**
4. Isi **Project name**: `bjs-racing-feed` (atau nama lain)
5. Klik **Create**
6. Setelah created, pastikan project yang aktif di pojok kiri atas adalah project yang baru dibuat

---

## Langkah 2: Enable Google Drive API

1. Di GCP Console, buka menu **APIs & Services → Library**
2. Di kolom pencarian, ketik: **Google Drive API**
3. Klik hasil **Google Drive API**
4. Klik tombol **Enable**
5. Tunggu beberapa detik hingga API aktif

---

## Langkah 3: Buat Service Account

Service account adalah identitas robot yang bisa mengakses Google Drive atas nama project, tanpa perlu login akun manusia.

1. Di GCP Console, buka **APIs & Services → Credentials**
2. Klik **Create Credentials** → pilih **Service account**
3. Isi **Service account name**: `feed-uploader`
4. Klik **Create and Continue**
5. **Role**: pilih **Editor** (atau lebih aman: cari dan pilih `Drive File` / `roles/drive.file` untuk akses terbatas ke folder tertentu)
6. Klik **Continue**
7. Biarkan bagian **Grant users access to this service account** kosong
8. Klik **Done**

Catatan: `roles/drive.file` hanya bisa mengakses file yang dibuat atau dibuka oleh service account tersebut, sehingga lebih aman daripada `Editor`.

---

## Langkah 4: Buat Service Account Key (JSON)

Key JSON ini akan digunakan oleh POS app untuk otentikasi ke Google Drive API.

1. Di halaman **Service Accounts**, klik service account yang baru dibuat (`feed-uploader`)
2. Buka tab **Keys**
3. Klik **Add Key** → **Create new key**
4. Pilih **Key type**: **JSON**
5. Klik **Create**
6. File JSON akan otomatis terdownload. Simpan dengan aman.
7. **PENTING**: File ini berisi kredensial akses Google Drive. Jangan upload ke GitHub atau expose ke public.

---

## Langkah 5: Siapkan Folder di Google Drive

1. Buka https://drive.google.com/
2. Klik **New** → **Folder**
3. Nama folder: `bjs-feed-images`
4. Klik **Create**
5. Buka folder yang baru dibuat
6. Salin **Folder ID** dari URL:
   - URL akan terlihat seperti: `https://drive.google.com/drive/folders/1aBcD2EfGhIjKlMnOpQrStUvWxYz123456`
   - Bagian setelah `/folders/` adalah **Folder ID**: `1aBcD2EfGhIjKlMnOpQrStUvWxYz123456`
7. Set sharing folder:
   - Klik kanan folder → **Share**
   - Ubah menjadi **Anyone with the link → Viewer**
   - Klik **Copy link** untuk testing nanti
8. Klik **Share** lagi, tambahkan service account email:
   - Email service account terlihat seperti: `feed-uploader@bjs-racing-feed.iam.gserviceaccount.com`
   - Paste di kolom invite
   - Grant permission: **Editor**
   - Klik **Send**

---

## Langkah 6: Konfigurasi Environment Variables di POS App

Edit file `.env` di direktori POS app (`/workspaces/bjs-racing-pos/.env`):

### Opsi A: Simpan JSON sebagai string (untuk Vercel)
Tambahkan 3 baris:
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_DRIVE_FOLDER_ID=1aBcD2EfGhIjKlMnOpQrStUvWxYz123456
VITE_GOOGLE_DRIVE_FOLDER_ID=1aBcD2EfGhIjKlMnOpQrStUvWxYz123456
```

Catatan: `GOOGLE_DRIVE_FOLDER_ID` untuk backend, `VITE_GOOGLE_DRIVE_FOLDER_ID` untuk frontend (Vite hanya expose env var prefixed `VITE_` ke browser).

### Opsi B: Simpan JSON sebagai file (untuk lokal/VPS)
1. Simpan file JSON yang terdownload sebagai `/workspaces/bjs-racing-pos/service-account.json`
2. Tambahkan di `.env`:
   ```
   GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH=/workspace/bjs-racing-pos/service-account.json
   GOOGLE_DRIVE_FOLDER_ID=1aBcD2EfGhIjKlMnOpQrStUvWxYz123456
   VITE_GOOGLE_DRIVE_FOLDER_ID=1aBcD2EfGhIjKlMnOpQrStUvWxYz123456
   ```

Catatan untuk Vercel: jika memakai Opsi B, file `service-account.json` harus di-upload ke Vercel sebagai file environment variable, atau lebih simpel pakai Opsi A dengan paste seluruh JSON ke environment variable.

### Juga update `.env.example`
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_DRIVE_FOLDER_ID=bjs-feed-images-folder-id
VITE_GOOGLE_DRIVE_FOLDER_ID=bjs-feed-images-folder-id
```

---

## Langkah 7: Install Dependencies

```bash
cd /workspaces/bjs-racing-pos
npm install googleapis multer
```

- `googleapis`: library resmi Google untuk mengakses Drive API
- `multer`: middleware untuk parse multipart/form-data (file upload) di Express/Vercel serverless

---

## Langkah 8: Cara Kerja Upload di POS App

### Backend (Production di Vercel)
- File: `api/couriers.js`
- Endpoint: `POST /api/upload-drive`
- Menerima file via `multipart/form-data`
- Upload ke Google Drive menggunakan service account
- Set permission file menjadi `anyone with link → Viewer`
- Return JSON:
  ```json
  {
    "success": true,
    "id": "FILE_ID",
    "url": "https://drive.google.com/uc?export=view&id=FILE_ID"
  }
  ```

### Backend (Lokal development)
- File: `server.js`
- Endpoint: `POST /api/upload-drive`
- Sama seperti production, tapi berjalan di Express dev server (`localhost:3001`)

### Frontend
- File: `src/pages/ManajemenFeed.jsx`
- Admin klik **"Upload dari Komputer"**, pilih gambar
- Preview lokal muncul
- Frontend kirim file ke `/api/upload-drive` via `fetch` + `FormData`
- Jika sukses, URL otomatis terisi di field **Media URL**
- Jika gagal, tampilkan error dan admin bisa paste URL manual

---

## Langkah 9: Testing

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
   - URL otomatis terisi di field Media URL
   - File muncul di Google Drive folder `bjs-feed-images`
   - URL bisa dibuka di browser baru

### Testing Production
1. Set environment variables di Vercel dashboard (Settings → Environment Variables):
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_DRIVE_FOLDER_ID` (untuk backend/serverless function)
   - `VITE_GOOGLE_DRIVE_FOLDER_ID` (untuk frontend, value yang sama dengan `GOOGLE_DRIVE_FOLDER_ID`)
2. Deploy ulang POS app
3. Test ulang langkah 1-7 seperti testing lokal

---

## Langkah 10: Verifikasi di Store App

1. Buka `https://bjsracing.com/blog`
2. Pastikan post baru dengan gambar Google Drive tampil dengan benar
3. Cek responsive di mobile dan desktop
4. Klik card, pastikan gambar tampil di halaman detail

---

## Catatan Penting

### Keamanan
- Service account JSON **hanya** ada di backend (POS app environment variables)
- Jangan pernah expose JSON ke browser atau commit ke Git
- Gunakan `roles/drive.file` jika memungkinkan untuk pembatasan akses
- Rotate service account key secara berkala (buat key baru, hapus key lama)

### Google Drive Public Link
Format URL yang disimpan di database:
```
https://drive.google.com/uc?export=view&id=FILE_ID
```

Format ini adalah direct view link, bukan share link yang biasa. Jika ingin pakai format lain:
- `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- Tapi format `uc?export=view&id=` lebih stabil untuk web embedding

### Rate Limit & Backup
- Google Drive API free tier: cukup untuk penggunaan normal
- Jika nanti kena rate limit, pertimbangkan migrate ke Cloudinary atau Supabase Storage
- Manual paste URL tetap tersedia sebagai fallback jika API gagal

### Troubleshooting
| Masalah | Solusi |
|---------|--------|
| Upload gagal, error "credentials tidak diatur" | Cek `.env` atau Vercel env vars, pastikan `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` atau `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH` sudah diisi |
| File tidak terlihat oleh publik | Cek permission file di Google Drive, pastikan sudah di-set "Anyone with the link → Viewer" |
| Folder tidak ditemukan service account | Pastikan folder sudah di-share dengan email service account dan grant Editor |
| Error CORS | Upload harus lewat backend API, jangan langsung dari browser ke Google Drive API |
| Warning "Google Drive folder ID belum diatur" muncul meskipun env var sudah diisi | Di Vercel, pastikan `VITE_GOOGLE_DRIVE_FOLDER_ID` sudah ditambahkan. Di lokal, pastikan `.env` memiliki `VITE_GOOGLE_DRIVE_FOLDER_ID`. Backend menggunakan `GOOGLE_DRIVE_FOLDER_ID`, frontend menggunakan `VITE_GOOGLE_DRIVE_FOLDER_ID` |
| Error "No more than 12 Serverless Functions" | Vercel Hobby plan limit. Upload-drive di-merge ke `api/couriers.js` untuk hemat slot. Jika nanti butuh lebih banyak endpoint, pertimbangkan upgrade ke Pro plan |

### Vercel Hobby Plan Limit
- Maksimal 12 serverless functions per deployment
- Saat ini POS app menggunakan 13 file API, tapi di-reduce jadi 12 dengan merge `/api/upload-drive` ke `api/couriers.js` via `vercel.json` rewrite
- Jika nanti perlu menambah endpoint lagi, opsi:
  1. Upgrade ke Vercel Pro
  2. Gabungkan lebih banyak endpoint ke file yang ada
  3. Pindah ke VPS dengan Express (`server.js`) sebagai single deployment

---

## Checklist Sebelum Live

- [ ] GCP project dibuat dan Drive API enabled
- [ ] Service account dibuat dan JSON key terdownload
- [ ] Folder `bjs-feed-images` dibuat dan sharing diset "Anyone with link → Viewer"
- [ ] Folder di-share dengan service account email (Editor)
- [ ] Environment variables di POS app sudah diisi (`GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` atau path, `GOOGLE_DRIVE_FOLDER_ID` untuk backend, dan `VITE_GOOGLE_DRIVE_FOLDER_ID` untuk frontend)
- [ ] `npm install googleapis multer` sudah dijalankan
- [ ] Testing lokal berhasil (upload sukses, URL terisi otomatis)
- [ ] Environment variables di Vercel sudah diisi
- [ ] Deploy production berhasil
- [ ] Testing di production berhasil
- [ ] Post pertama dibuat dan gambar tampil di `https://bjsracing.com/blog`

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

### POS App (`bjs-racing-pos`)
- `src/pages/ManajemenFeed.jsx` — admin CRUD feed + upload UI
- `api/couriers.js` — menangani `/api/upload-drive` (Google Drive upload)
- `server.js` — endpoint `/api/upload-drive` untuk lokal dev
- `vercel.json` — rewrite `/api/upload-drive` ke `api/couriers.js`
- `.env.example` — template environment variables
- `.env` — environment variables lokal

---

## Support
Jika ada pertanyaan atau masalah, cek:
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [googleapis NPM](https://www.npmjs.com/package/googleapis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

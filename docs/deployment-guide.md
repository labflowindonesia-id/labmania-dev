# Panduan Deployment LabFlow Assets ke Vercel

Dokumen ini berisi langkah-langkah lengkap untuk men-deploy aplikasi LabFlow Assets ke Vercel.

---

## 📋 Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- [x] Akun Vercel (sudah terlink dengan GitHub)
- [x] Akun Supabase dengan project production
- [x] Repository sudah di-push ke GitHub
- [x] Production credentials Supabase (terpisah dari development)

---

## 🔐 Step 1: Siapkan Production Credentials

### 1.1 Dapatkan Supabase Production Credentials

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project **production** Anda
3. Pergi ke **Settings → API**
4. Catat informasi berikut:

| Credential | Lokasi di Supabase |
|------------|-------------------|
| Project URL | Settings → API → Project URL |
| Anon Key | Settings → API → anon public |
| Service Role Key | Settings → API → service_role (⚠️ Secret!) |

### 1.2 Dapatkan Database Connection String

1. Di Supabase, pergi ke **Settings → Database**
2. Scroll ke bagian **Connection string**
3. Pilih tab **URI**
4. Pilih mode **Session** (untuk serverless)
5. Copy connection string (format: `postgresql://postgres.[ref]:[password]@...`)

### 1.3 Siapkan n8n Webhook (Opsional)

Jika menggunakan Chat AI:
- `N8N_WEBHOOK_URL`: URL webhook n8n Anda
- `N8N_WEBHOOK_API_KEY`: API key untuk autentikasi webhook

---

## 🚀 Step 2: Deploy di Vercel

### 2.1 Buat Project Baru

1. Buka [vercel.com](https://vercel.com) dan login
2. Klik tombol **"Add New..."** di pojok kanan atas
3. Pilih **"Project"**

### 2.2 Import Repository

1. Anda akan melihat daftar repository GitHub
2. Cari dan pilih repository: **labflowindonesia-id/labmania-dev**
3. Klik **"Import"**

### 2.3 Konfigurasi Project

Di halaman konfigurasi, isi sebagai berikut:

| Setting | Value |
|---------|-------|
| **Project Name** | `labmania` (atau sesuai keinginan) |
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `.` (default) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` (default) |

### 2.4 Tambahkan Environment Variables

> ⚠️ **PENTING**: Ini adalah langkah krusial! Jangan skip!

Klik **"Environment Variables"** untuk expand, lalu tambahkan satu per satu:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://[your-project-ref].supabase.co
Environment: Production, Preview, Development (semua tercentang)
```

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key lengkap)
Environment: Production, Preview, Development
```

#### Variable 3: SUPABASE_SERVICE_ROLE_KEY
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service role key lengkap)
Environment: Production, Preview, Development
```

#### Variable 4: DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
Environment: Production, Preview, Development
```

#### Variable 5: N8N_WEBHOOK_URL (Opsional - untuk Chat AI)
```
Name: N8N_WEBHOOK_URL
Value: https://[your-n8n-instance]/webhook/[webhook-id]
Environment: Production, Preview, Development
```

#### Variable 6: N8N_WEBHOOK_API_KEY (Opsional - untuk Chat AI)
```
Name: N8N_WEBHOOK_API_KEY
Value: [your-api-key]
Environment: Production, Preview, Development
```

### 2.5 Deploy!

1. Setelah semua environment variables ditambahkan
2. Klik tombol **"Deploy"**
3. Tunggu proses build (biasanya 2-4 menit)

---

## ✅ Step 3: Verifikasi Deployment

### 3.1 Cek Build Status

1. Vercel akan menampilkan log build realtime
2. Pastikan tidak ada error (tanda ❌)
3. Build sukses ditandai dengan "Ready" dan tanda ✓

### 3.2 Akses Aplikasi

Setelah deploy sukses:
1. Vercel akan memberikan URL seperti: `https://labmania-xxx.vercel.app`
2. Klik URL tersebut untuk membuka aplikasi
3. Anda akan diarahkan ke halaman login

### 3.3 Test Login

Coba login dengan akun yang ada:
1. Buka halaman login
2. Masukkan username, password, dan pilih role
3. Pastikan berhasil masuk ke dashboard

### 3.4 Verifikasi Fitur

Checklist verifikasi:
- [ ] Dashboard menampilkan data statistik
- [ ] Kalender menampilkan schedule events
- [ ] Charts berfungsi dengan data
- [ ] Menu inventory bisa diakses
- [ ] Menu instrumen bisa diakses
- [ ] File upload berfungsi (coba upload foto)
- [ ] Chat AI berfungsi (jika dikonfigurasi)

---

## ⚙️ Step 4: Konfigurasi Tambahan

### 4.1 Verifikasi Cron Job

1. Di Vercel dashboard, buka project Anda
2. Pergi ke **Settings → Cron Jobs**
3. Pastikan ada cron job untuk `/api/cron/backup`
4. Schedule harus: `0 0 1 * *` (setiap tanggal 1 jam 00:00 UTC)

### 4.2 Custom Domain (Opsional)

Jika ingin menggunakan domain sendiri:
1. Pergi ke **Settings → Domains**
2. Klik **"Add"**
3. Masukkan domain Anda (contoh: `lims.labflow.id`)
4. Ikuti instruksi untuk konfigurasi DNS

---

## 🔧 Troubleshooting

### Error: "Invalid API Key" atau "Unauthorized"

**Penyebab**: Environment variable Supabase tidak benar
**Solusi**:
1. Buka Vercel → Settings → Environment Variables
2. Cek apakah semua variable sudah benar
3. Pastikan tidak ada spasi/newline di value
4. Klik "Redeploy" setelah memperbaiki

### Error: Database Connection Refused

**Penyebab**: DATABASE_URL tidak benar atau format salah
**Solusi**:
1. Gunakan **Pooler connection string** dari Supabase
2. Format yang benar:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
3. Jangan gunakan direct connection untuk serverless

### Error: Build Failed

**Penyebab**: Dependencies atau type error
**Solusi**:
1. Cek build log di Vercel untuk error spesifik
2. Coba run `npm run build` di local untuk debug
3. Pastikan semua dependencies terinstall

### Halaman Blank / Loading Forever

**Penyebab**: JavaScript error atau environment variable missing
**Solusi**:
1. Buka browser DevTools (F12) → Console
2. Cek error message
3. Pastikan `NEXT_PUBLIC_*` variables sudah diset

### Data Tidak Muncul di Dashboard

**Penyebab**: Database tidak terkoneksi atau RLS blocking
**Solusi**:
1. Verifikasi `DATABASE_URL` benar
2. Cek apakah user sudah login (cookie)
3. Pastikan RLS policies sudah dikonfigurasi di Supabase

---

## 🔄 Re-deploy

Untuk deploy ulang setelah perubahan kode:

### Cara 1: Auto-deploy (Recommended)
- Push commit baru ke branch `main`
- Vercel akan otomatis rebuild dan deploy

### Cara 2: Manual Redeploy
1. Buka Vercel dashboard
2. Pilih project
3. Klik **"Deployments"** tab
4. Klik menu **"..."** pada deployment terbaru
5. Pilih **"Redeploy"**

---

## 📊 Monitoring

### Vercel Analytics
1. Buka project di Vercel
2. Klik tab **"Analytics"**
3. Monitor traffic, performance, dan error rates

### Logs
1. Pergi ke **Deployments** → pilih deployment
2. Klik **"Functions"** atau **"Logs"**
3. Lihat log realtime untuk debugging

---

## ✨ Tips Production

1. **Backup Rutin**: Cron job akan auto-backup setiap bulan, tapi pertimbangkan backup manual reguler
2. **Monitor Usage**: Pantau Supabase dashboard untuk database usage
3. **Update Dependencies**: Lakukan update dependencies secara berkala untuk keamanan
4. **Test di Preview**: Gunakan branch terpisah untuk test fitur baru sebelum merge ke main

---

## 📞 Bantuan

Jika mengalami masalah:
1. Cek [Vercel Documentation](https://vercel.com/docs)
2. Cek [Supabase Documentation](https://supabase.com/docs)
3. Review error logs di Vercel dashboard

---

*Dokumen ini dibuat pada: 3 Januari 2026*

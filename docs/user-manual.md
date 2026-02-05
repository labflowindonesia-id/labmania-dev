# 📖 Buku Panduan Pengguna LabFlow Assets

**Versi:** 1.0  
**Tanggal:** Februari 2026  
**Aplikasi:** LabFlow Assets - Sistem Manajemen Laboratorium

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Login ke Sistem](#2-login-ke-sistem)
3. [Dashboard](#3-dashboard)
4. [Modul Inventory](#4-modul-inventory)
   - 4.1 [Katalog Reagen](#41-katalog-reagen)
   - 4.2 [Katalog Standard](#42-katalog-standard)
   - 4.3 [Katalog Sample](#43-katalog-sample)
   - 4.4 [Katalog Barang](#44-katalog-barang)
   - 4.5 [Gudang Kimia](#45-gudang-kimia)
   - 4.6 [Gudang Barang](#46-gudang-barang)
   - 4.7 [Log Penggunaan](#47-log-penggunaan)
   - 4.8 [Pesanan](#48-pesanan)
   - 4.9 [Training Usage](#49-training-usage)
   - 4.10 [Laporan Pengeluaran](#410-laporan-pengeluaran)
   - 4.11 [Document Library](#411-document-library)
5. [Modul Instrumen](#5-modul-instrumen)
   - 5.1 [Database Instrumen](#51-database-instrumen)
   - 5.2 [Log Kalibrasi](#52-log-kalibrasi)
   - 5.3 [Maintenance](#53-maintenance)
6. [Fitur AI Chat](#6-fitur-ai-chat)
7. [Menu Admin](#7-menu-admin)
8. [Pengaturan Umum](#8-pengaturan-umum)
9. [FAQ & Troubleshooting](#9-faq--troubleshooting)

---

## 1. Pendahuluan

**LabFlow Assets** adalah sistem manajemen laboratorium terintegrasi yang dirancang untuk membantu pengelolaan:
- **Inventory** (reagen, standard, sample, barang consumable)
- **Gudang** (penerimaan dan pelacakan stok kimia & barang)
- **Instrumen** (database alat, jadwal kalibrasi, maintenance)
- **Training** (pencatatan penggunaan bahan untuk training)
- **Pelaporan** (laporan pengeluaran dan penggunaan)

### Persyaratan Sistem
- Browser modern (Chrome, Firefox, Edge, Safari)
- Koneksi internet untuk akses database cloud
- Resolusi layar minimal 1366x768

---

## 2. Login ke Sistem

### Mengakses Halaman Login

1. Buka browser dan akses URL aplikasi: `http://localhost:3000` (atau URL produksi)
2. Anda akan melihat halaman login dengan tampilan modern

### Cara Login

| Field | Keterangan |
|-------|------------|
| **Username** | Masukkan username yang diberikan administrator |
| **Login As** | Pilih role: `Analyst`, `Manager`, atau `Admin` |
| **Password** | Masukkan password akun Anda |

**Langkah-langkah:**
1. Isi username pada kolom pertama
2. Pilih role sesuai hak akses Anda dari dropdown
3. Masukkan password (klik ikon mata 👁 untuk melihat/sembunyikan)
4. Klik tombol **"Sign In"**

> [!TIP]
> Jika mengalami masalah login, klik tombol **"Contact Support"** di pojok kanan atas untuk menghubungi tim teknis.

### Role Pengguna

| Role | Hak Akses |
|------|-----------|
| **Analyst** | Akses penuh ke fitur inventory dan instrumen |
| **Manager** | Analyst + akses Backup Data |
| **Admin** | Manager + Manajemen User |

---

## 3. Dashboard

Setelah login berhasil, Anda akan diarahkan ke **Dashboard** - halaman utama yang menampilkan ringkasan informasi penting.

### Komponen Dashboard

#### 3.1 Kartu Statistik (Stats Cards)
Empat kartu di bagian atas menampilkan:

| Kartu | Warna | Informasi |
|-------|-------|-----------|
| **Bahan Kimia Expired** | 🔴 Merah | Jumlah bahan kimia yang akan expired dalam 30 hari |
| **Stok Menipis** | 🟡 Kuning | Jumlah item dengan stok di bawah minimum |
| **Stok Habis** | ⚫ Abu-abu | Jumlah item yang perlu di-restock |
| **Kalibrasi Mendatang** | 🔵 Biru | Jumlah instrumen yang perlu dikalibrasi dalam 30 hari |

#### 3.2 Kalender Jadwal
Menampilkan jadwal kalibrasi, maintenance, dan reminder dalam dua tampilan:
- **Tab Mingguan**: Jadwal 7 hari ke depan
- **Tab Bulanan**: Kalender bulanan dengan titik indikator event

**Legenda Warna Event:**
- 🔵 Biru: Kalibrasi terjadwal
- 🟢 Hijau: Maintenance
- 🔴 Merah: Event expired/lewat jadwal

#### 3.3 Chart Status Instrumen
Grafik pie chart yang menampilkan distribusi status instrumen:
- ✅ Terkalibrasi (Hijau)
- ⏰ Jadwal Mendatang (Biru)
- ⚠️ Lewat Jatuh Tempo (Merah)
- 🔧 Dalam Perbaikan (Kuning)

#### 3.4 Chart Status Stok Inventory
Grafik bar yang membandingkan status stok per kategori:
- Reagen, Standard, Barang, Consumable
- Status: Tersedia, Menipis, Habis

#### 3.5 Tren Penggunaan Bulanan
Grafik line yang menampilkan tren penggunaan reagen dan consumable dalam beberapa bulan terakhir.

#### 3.6 Panel Peringatan
Dua panel di bagian bawah:
- **Bahan Kimia Mendekati Expired**: Daftar bahan yang akan segera expired dengan sisa hari
- **Kalibrasi Mendatang**: Daftar instrumen yang perlu dikalibrasi

---

## 4. Modul Inventory

Akses modul inventory melalui sidebar menu **INVENTORY**. Klik untuk expand/collapse submenu.

---

### 4.1 Katalog Reagen

**Navigasi:** Sidebar → INVENTORY → Katalog Reagen

Halaman ini menampilkan **daftar master reagen** yang terdaftar di sistem.

#### Fitur Utama:
- **Tampilan Grid/List**: Menampilkan reagen dengan gambar dan informasi
- **Filter & Search**: Cari reagen berdasarkan nama, kategori, atau status
- **Tambah Reagen Baru**: Klik tombol **"+ Tambah Reagen"**

#### Informasi yang Ditampilkan:
| Field | Deskripsi |
|-------|-----------|
| **Nama Reagen** | Nama lengkap reagen |
| **Gambar** | Foto/gambar reagen |
| **Kategori** | Klasifikasi reagen (Solvent, Acid, Base, dll) |
| **Total Stock** | Jumlah stok tersedia di gudang |
| **Status** | Tersedia / Menipis / Habis |

#### Menambah Reagen Baru:
1. Klik **"+ Tambah Reagen"**
2. Isi form:
   - Nama Reagen (wajib)
   - Kategori
   - Satuan (mL, g, pcs, dll)
   - Upload gambar (maks 5MB)
3. Klik **"Simpan"**

---

### 4.2 Katalog Standard

**Navigasi:** Sidebar → INVENTORY → Katalog Standard

Halaman ini mengelola **standard reference material** untuk keperluan kalibrasi dan QC.

#### Fitur Utama:
- Daftar standard dengan konsentrasi dan satuan
- Filter berdasarkan jenis dan status
- Link ke data stok di gudang

#### Informasi yang Ditampilkan:
| Field | Deskripsi |
|-------|-----------|
| **Nama Standard** | Nama reference material |
| **Konsentrasi** | Nilai konsentrasi (contoh: 1000 ppm) |
| **Total Stock** | Jumlah stok tersedia |
| **Status** | Status ketersediaan |

---

### 4.3 Katalog Sample

**Navigasi:** Sidebar → INVENTORY → Katalog Sample

Halaman ini mengelola **sampel QC dan sampel referensi** untuk keperluan validasi dan training.

#### Fitur Utama:
- Daftar sample dengan matriks dan tanggal expired
- Tracking jumlah stok sample
- Informasi lokasi penyimpanan

#### Contoh Data:
- Wine Sample QC-001 (Matrix: Wine, Expiry: 31/12/2027)
- Sampel Test (Matrix: Test)

---

### 4.4 Katalog Barang

**Navigasi:** Sidebar → INVENTORY → Katalog Barang

Halaman ini mengelola **barang consumable dan peralatan** laboratorium.

#### Kategori Barang:
| Kategori | Contoh |
|----------|--------|
| **Consumable** | Pipet Tips, Whatman Filter, Microscope Slider |
| **Barang** | Labu Takar, Gelas Beaker, Peralatan Lab |

#### Fitur:
- Filter berdasarkan kategori (Consumable/Barang)
- Tracking stok minimum dan maksimum
- Alert ketika stok menipis

---

### 4.5 Gudang Kimia

**Navigasi:** Sidebar → INVENTORY → Gudang Kimia

Halaman ini mengelola **stok fisik bahan kimia** (reagen, standard, sample) per batch/kontainer.

#### Konsep Penting:
- **Katalog** = Master data (nama, spesifikasi)
- **Gudang** = Stok fisik (batch, jumlah, tanggal expired)

#### Informasi per Kontainer:
| Field | Deskripsi |
|-------|-----------|
| **Nama Item** | Nama bahan kimia |
| **Batch/Lot** | Nomor batch dari supplier |
| **Jumlah** | Sisa stok (mL, g, pcs) |
| **Tanggal Terima** | Tanggal barang diterima |
| **Expired Date** | Tanggal kadaluarsa |
| **Lokasi** | Lokasi penyimpanan |
| **Harga/unit** | Harga per unit |

#### Penerimaan Barang Baru:
1. Klik **"+ Terima Barang"**
2. Pilih item dari katalog
3. Isi detail:
   - Nomor Batch
   - Jumlah & Satuan
   - Tanggal Expired
   - Lokasi Penyimpanan
   - Harga per Unit
4. Klik **"Simpan"**

> [!IMPORTANT]
> Pastikan mengisi nomor batch yang benar karena digunakan untuk traceability.

---

### 4.6 Gudang Barang

**Navigasi:** Sidebar → INVENTORY → Gudang Barang

Halaman ini mengelola **stok fisik barang consumable** per batch.

#### Fitur:
- Tracking stok per batch
- Filter berdasarkan kategori (Consumable/Barang)
- Penerimaan barang baru dengan harga

#### Contoh Data:
| Item | Kategori | Jumlah | Satuan |
|------|----------|--------|--------|
| Pipet Tips | Consumable | 50 | pcs |
| Labu Takar | Barang | 10 | pcs |

---

### 4.7 Log Penggunaan

**Navigasi:** Sidebar → INVENTORY → Log Penggunaan

Halaman ini mencatat **riwayat penggunaan bahan** secara manual.

#### Mencatat Penggunaan:
1. Klik **"+ Catat Penggunaan"**
2. Pilih item yang digunakan
3. Masukkan jumlah yang dipakai
4. Tambahkan catatan (opsional)
5. Klik **"Simpan"**

#### Informasi Log:
- Tanggal & waktu penggunaan
- Item yang digunakan
- Jumlah
- User yang mencatat
- Catatan/keterangan

---

### 4.8 Pesanan

**Navigasi:** Sidebar → INVENTORY → Pesanan

Halaman ini mengelola **pemesanan/pengadaan** barang dan bahan kimia.

#### Status Pesanan:
| Status | Warna | Deskripsi |
|--------|-------|-----------|
| **Pending** | 🟡 | Menunggu persetujuan |
| **Approved** | 🔵 | Disetujui, dalam proses |
| **Completed** | 🟢 | Barang sudah diterima |
| **Cancelled** | 🔴 | Pesanan dibatalkan |

#### Membuat Pesanan Baru:
1. Klik **"+ Buat Pesanan"**
2. Pilih item dari katalog atau masukkan manual
3. Isi jumlah dan estimasi harga
4. Submit untuk persetujuan

---

### 4.9 Training Usage

**Navigasi:** Sidebar → INVENTORY → Training Usage

Halaman ini mencatat **penggunaan bahan untuk kegiatan training/pelatihan**.

#### Konsep Training Set:
- Satu "Training Set" = Satu sesi training
- Berisi daftar bahan yang digunakan
- Otomatis mengurangi stok saat dieksekusi

#### Membuat Training Set:
1. Klik **"+ Buat Training Set"**
2. Beri nama training
3. Tambahkan item yang akan digunakan:
   - Pilih dari Reagent, Sample, atau Standard
   - Tentukan jumlah yang dipakai
4. **Eksekusi** training untuk mengurangi stok

#### Contoh Data:
- **Hands-On HPLC Training**: Labu Takar (2 pcs), Gelas Beaker (1 pcs), Calcium Carbonate (10g)
- **Sample QC Training**: Wine Sample QC-001 (1ml)

---

### 4.10 Laporan Pengeluaran

**Navigasi:** Sidebar → INVENTORY → Laporan Pengeluaran

Halaman ini menampilkan **ringkasan biaya/pengeluaran** dari penggunaan bahan.

#### Informasi yang Ditampilkan:
- Total biaya per periode
- Breakdown per kategori (Reagen, Consumable, Standard)
- Grafik tren pengeluaran

---

### 4.11 Document Library

**Navigasi:** Sidebar → INVENTORY → Document Library

Halaman ini menyimpan **dokumen penting** seperti:
- **MSDS** (Material Safety Data Sheet)
- **CoA** (Certificate of Analysis)
- **SOP** (Standard Operating Procedure)

#### Upload Dokumen:
1. Klik **"+ Upload Dokumen"**
2. Pilih kategori dokumen
3. Upload file (PDF, max 10MB)
4. Kaitkan dengan item terkait (opsional)

---

## 5. Modul Instrumen

Akses modul instrumen melalui sidebar menu **INSTRUMEN**.

---

### 5.1 Database Instrumen

**Navigasi:** Sidebar → INSTRUMEN → Database Instrumen

Halaman ini menampilkan **daftar semua instrumen** laboratorium.

#### Informasi Instrumen:
| Field | Deskripsi |
|-------|-----------|
| **Nama Instrumen** | Nama dan model alat |
| **Merk** | Produsen/manufacturer |
| **Lokasi** | Penempatan alat (Lab, Ruang) |
| **PIC** | Person in Charge (penanggung jawab) |
| **Status** | Status kalibrasi |
| **Sisa Hari** | Hari hingga jadwal kalibrasi berikutnya |

#### Status Kalibrasi:
| Status | Warna | Deskripsi |
|--------|-------|-----------|
| **Terkalibrasi** | 🟢 | Dalam masa berlaku kalibrasi |
| **Jadwal Mendatang** | 🔵 | ≤30 hari menuju jadwal kalibrasi |
| **Lewat Jatuh Tempo** | 🔴 | Sudah melewati jadwal kalibrasi |

#### Menambah Instrumen:
1. Klik **"+ Tambah Instrumen"**
2. Isi informasi:
   - Nama, Merk, Model
   - Lokasi, PIC
   - Interval kalibrasi (bulan)
   - Tanggal kalibrasi terakhir
3. Klik **"Simpan"**

---

### 5.2 Log Kalibrasi

**Navigasi:** Sidebar → INSTRUMEN → Log Kalibrasi

Halaman ini menyimpan **riwayat kalibrasi** semua instrumen.

#### Informasi Log:
| Field | Deskripsi |
|-------|-----------|
| **Tanggal** | Tanggal pelaksanaan kalibrasi |
| **Instrumen** | Nama alat yang dikalibrasi |
| **Kalibrator** | Petugas/vendor kalibrasi |
| **Hasil** | Pass/Fail |
| **Sertifikat** | Link ke dokumen sertifikat (PDF) |

#### Mencatat Kalibrasi:
1. Klik **"+ Catat Kalibrasi"**
2. Pilih instrumen
3. Isi detail:
   - Tanggal kalibrasi
   - Nama kalibrator/vendor
   - Hasil kalibrasi
   - Upload sertifikat (PDF)
4. Klik **"Simpan"**

> [!TIP]
> Setelah mencatat kalibrasi, status instrumen akan otomatis terupdate ke "Terkalibrasi".

---

### 5.3 Maintenance

**Navigasi:** Sidebar → INSTRUMEN → Maintenance

Halaman ini mengelola **jadwal dan riwayat maintenance** instrumen.

#### Jenis Maintenance:
- **Preventive**: Perawatan berkala terjadwal
- **Corrective**: Perbaikan setelah kerusakan
- **Emergency**: Perbaikan darurat

---

## 6. Fitur AI Chat

**Navigasi:** Sidebar → AI → Chat AI

Fitur chatbot AI untuk:
- Tanya jawab tentang penggunaan sistem
- Analisis data inventory
- Rekomendasi pengelolaan stok

---

## 7. Menu Admin

> [!NOTE]
> Menu ini hanya muncul untuk user dengan role **Admin** atau **Manager**.

### 7.1 Manajemen User (Admin Only)

**Navigasi:** Sidebar → ADMIN → Manajemen User

Fitur:
- Tambah user baru
- Edit informasi user
- Reset password
- Ubah role user
- Nonaktifkan user

### 7.2 Backup Data

**Navigasi:** Sidebar → DATA → Backup Data

Fitur:
- Download backup data (format ZIP)
- Riwayat backup
- Restore data (dengan approval)

---

## 8. Pengaturan Umum

### Toggle Mode Gelap/Terang
- Klik tombol 🌙 **Mode Gelap** / ☀️ **Mode Terang** di sidebar footer

### Logout
- Klik tombol **"Logout"** merah di sidebar footer
- Anda akan diarahkan kembali ke halaman login

### Notifikasi
- Klik ikon 🔔 di header untuk melihat notifikasi
- Notifikasi otomatis untuk:
  - Bahan kimia mendekati expired (H-30)
  - Jadwal kalibrasi mendatang (H-30)
  - Stok menipis

---

## 9. FAQ & Troubleshooting

### Q: Tidak bisa login?
**A:** Pastikan:
- Username dan password benar
- Role yang dipilih sesuai
- Hubungi admin jika lupa password

### Q: Data tidak muncul di dashboard?
**A:** 
- Refresh halaman (F5)
- Periksa koneksi internet
- Data akan muncul setelah ada input ke sistem

### Q: Bagaimana cara mengurangi stok?
**A:** Ada dua cara:
1. **Log Penggunaan**: Untuk penggunaan harian manual
2. **Training Usage**: Untuk penggunaan training (otomatis mengurangi stok saat eksekusi)

### Q: Bagaimana sistem menghitung H-30?
**A:** Sistem otomatis memeriksa:
- Tanggal expired bahan kimia
- Tanggal kalibrasi instrumen
- Jika ≤30 hari, akan muncul notifikasi

### Q: Cara menghubungi support?
**A:** 
- Klik **"Contact Support"** di halaman login
- Isi formulir dengan informasi lengkap
- Tim support akan menghubungi Anda

---

## 📞 Kontak Support

**LabFlow Indonesia**  
Email: support@labflow.id  
WhatsApp: +62-xxx-xxxx-xxxx

---

> *Dokumen ini dibuat untuk versi LabFlow Assets 1.0. Fitur dapat berubah pada versi selanjutnya.*

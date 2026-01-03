# Panduan Fitur LabFlow Assets

Dokumen ini menjelaskan semua fitur dan menu yang tersedia dalam aplikasi LabFlow Assets LIMS.

---

## 📊 1. Dashboard

Halaman utama yang menampilkan ringkasan data laboratorium secara real-time.

### 1.1 Kartu Statistik
| Kartu | Deskripsi |
|-------|-----------|
| **Reagen Expired** | Jumlah reagen yang akan expired dalam 30 hari |
| **Stok Menipis** | Item dengan stok di bawah minimum level |
| **Stok Habis** | Item dengan stok nol |
| **Kalibrasi Mendatang** | Instrumen yang perlu dikalibrasi dalam 30 hari |

### 1.2 Kalender Jadwal
- **Tampilan Mingguan**: Jadwal 7 hari ke depan
- **Tampilan Bulanan**: Kalender satu bulan penuh
- **Jenis Event**:
  - 🔵 Kalibrasi instrumen
  - 🟡 Maintenance terjadwal
  - 🔴 Reagen expired
  - 🟢 Pesanan

### 1.3 Chart Visualisasi
| Chart | Informasi |
|-------|-----------|
| **Status Instrumen** | Pie chart distribusi status kalibrasi |
| **Status Stok Inventory** | Bar chart perbandingan stok per kategori |
| **Tren Penggunaan Bulanan** | Line chart penggunaan reagen & consumable |

### 1.4 Daftar Quick Access
- **Reagen Mendekati Expired**: Top 5 reagen dengan expiry terdekat
- **Kalibrasi Mendatang**: Top 5 instrumen yang harus dikalibrasi

---

## 📦 2. Inventory

### 2.1 Katalog Reagen
> Menu: **Inventory → Katalog Reagen**

Mengelola database master semua jenis reagen kimia.

| Kolom | Deskripsi |
|-------|-----------|
| Nama Reagen | Nama lengkap reagen |
| No. CAS | Chemical Abstracts Service number |
| Supplier | Nama pemasok |
| Lokasi Penyimpanan | TC 1 / TC 2 / TC 3 |
| Bentuk | Solid / Liquid / Gas |
| Stok Minimum | Level minimum untuk alert |
| Dokumen MSDS | Upload file PDF keselamatan |
| Foto Produk | Upload gambar produk |

**Fitur**:
- ➕ Tambah reagen baru
- ✏️ Edit detail reagen
- 🗑️ Hapus reagen
- 📄 Upload MSDS document
- 🔍 Detail page dengan info lengkap

---

### 2.2 Katalog Standard
> Menu: **Inventory → Katalog Standard**

Mengelola database master standar referensi.

| Kolom Tambahan | Deskripsi |
|----------------|-----------|
| Formula Kimia | Rumus kimia standar |
| Ukuran | Nilai dan satuan ukuran |

---

### 2.3 Katalog Barang
> Menu: **Inventory → Katalog Barang**

Mengelola database master barang dan consumable.

| Kolom | Deskripsi |
|-------|-----------|
| Nama Barang | Nama item |
| Brand | Merek produk |
| Kategori | Barang / Consumable |
| Satuan Stok | unit, pack, pcs, set, roll, ml, L, g, kg |
| Lokasi | Lokasi penyimpanan |

---

### 2.4 Gudang Kimia
> Menu: **Inventory → Gudang Kimia**

Menampilkan stok aktual reagen dan standar di gudang.

| Kolom | Deskripsi |
|-------|-----------|
| Nama | Nama item |
| Tipe Katalog | Reagent / Standard |
| Tanggal Terima | Kapan diterima |
| Ukuran | Nilai dan satuan awal |
| Sisa | Jumlah tersisa saat ini |
| Expired | Tanggal kadaluarsa |
| Diterima Oleh | Nama penerima (KEP/GEP/Manager) |
| Status | Tersedia / Sedang Digunakan / Habis |

**Fitur**:
- 📥 Terima barang baru
- ✏️ Update sisa stok
- 📊 Filter berdasarkan status

---

### 2.5 Gudang Barang
> Menu: **Inventory → Gudang Barang**

Menampilkan stok aktual barang dan consumable.

| Kolom | Deskripsi |
|-------|-----------|
| Nama | Nama item |
| Spesifikasi | Detail spesifikasi |
| Lot No | Nomor lot/batch |
| Kuantitas | Jumlah saat ini |
| Tanggal Terima | Kapan diterima |
| Diterima Oleh | Nama penerima |

---

### 2.6 Log Penggunaan
> Menu: **Inventory → Log Penggunaan**

Mencatat setiap penggunaan inventaris.

| Field | Deskripsi |
|-------|-----------|
| Tanggal | Kapan digunakan |
| User | Siapa yang menggunakan |
| Item | Barang yang digunakan |
| Tipe | barang / consumable / reagent / standard |
| Jumlah | Berapa banyak digunakan |
| Catatan | Keterangan tambahan |

**Fitur**:
- ➕ Catat penggunaan baru
- 🔗 Auto-update stok gudang
- 📊 History penggunaan

---

### 2.7 Pesanan
> Menu: **Inventory → Pesanan**

Sistem manajemen pesanan pembelian inventaris.

| Status | Deskripsi |
|--------|-----------|
| **Pending** | Menunggu persetujuan |
| **Approved** | Disetujui oleh manager |
| **Rejected** | Ditolak |
| **Received** | Barang sudah diterima |
| **Cancelled** | Dibatalkan |

**Fitur**:
- ➕ Buat pesanan baru (semua role)
- ✅ Approve/Reject (Manager/Admin only)
- 📦 Terima barang
- 📋 Detail pesanan

---

### 2.8 Training Usage
> Menu: **Inventory → Training Usage**

Mengelola set peralatan untuk training/pelatihan.

| Field | Deskripsi |
|-------|-----------|
| Nama Training | Nama set training |
| Peserta per Set | Jumlah peserta yang dilayani |
| Items | Daftar item dalam set |

**Fitur**:
- ➕ Buat training set baru
- 📦 Tambah item ke set
- 📝 Gunakan set (auto-reduce stock)

---

## 🔬 3. Instrumen

### 3.1 Database Instrumen
> Menu: **Instrumen → Database Instrumen**

Daftar lengkap semua instrumen laboratorium.

| Kolom | Deskripsi |
|-------|-----------|
| Nama Instrumen | Nama alat |
| Brand/Model | Merek dan model |
| Serial Number | Nomor seri |
| Asset Number | Nomor aset |
| PIC Alat | KEP / GEP (penanggung jawab) |
| Lokasi | TC 1 / TC 2 / TC 3 |
| Tipe Aset | Instrumen / Peralatan |
| Status | Terkalibrasi / Jadwal Mendatang / Lewat Jatuh Tempo / Dalam Perbaikan |
| Vendor Kalibrasi | Perusahaan kalibrasi |
| Interval Kalibrasi | Periode kalibrasi (bulan) |
| Foto | Upload foto instrumen |

**Detail Page**:
- Info lengkap instrumen
- Riwayat kalibrasi
- Riwayat maintenance
- Edit semua field

---

### 3.2 Log Kalibrasi
> Menu: **Instrumen → Log Kalibrasi**

Mencatat semua aktivitas kalibrasi.

| Field | Deskripsi |
|-------|-----------|
| Tanggal Kalibrasi | Kapan dilakukan |
| Instrumen | Alat yang dikalibrasi |
| Nama Kalibrator | Teknisi/Perusahaan |
| Telepon Kalibrator | Kontak kalibrator |
| Dokumen Job Report | Upload sertifikat PDF |
| Catatan | Keterangan tambahan |

**Fitur**:
- ➕ Input kalibrasi baru
- 📄 Upload sertifikat
- ✏️ Edit log
- 🗑️ Hapus log

---

### 3.3 Maintenance
> Menu: **Instrumen → Maintenance**

Log perbaikan dan perawatan instrumen.

| Field | Deskripsi |
|-------|-----------|
| Tanggal | Kapan dilakukan |
| Instrumen | Alat yang di-maintenance |
| Tipe | Corrective / Preventive / Inspection |
| Deskripsi Masalah | Apa yang rusak/dicek |
| Tindakan | Apa yang dilakukan |
| Foto | Dokumentasi foto |
| Status | Completed / Scheduled / Pending |

---

## 🤖 4. Chat AI
> Menu: **AI → Chat AI**

Asisten AI untuk membantu analisis data laboratorium.

### Kemampuan:
- Menjawab pertanyaan tentang stok inventaris
- Memberikan info jadwal kalibrasi
- Mengingatkan reagen yang mendekati expired
- Summary kondisi laboratorium

### Konteks Otomatis:
AI menerima konteks real-time dari database:
- Ringkasan stok (total, menipis, habis)
- 5 kalibrasi terdekat
- 5 reagen mendekati expired

> ⚠️ **Terms of Conditions** berlaku saat menggunakan Chat AI

---

## 👤 5. Admin

### 5.1 Manajemen User
> Menu: **Admin → Manajemen User** *(Admin Only)*

Mengelola akun pengguna sistem.

| Field | Deskripsi |
|-------|-----------|
| Username | Nama login unik |
| Nama Lengkap | Nama display |
| Role | Admin / Manager / Analyst |
| Password | Set/reset password |

**Fitur**:
- ➕ Buat user baru
- ✏️ Edit user
- 🔒 Reset password
- 🗑️ Hapus user

---

### 5.2 Backup Data
> Menu: **Data → Backup Data** *(Admin & Manager)*

Fitur backup database manual.

**Fitur**:
- 📥 Download backup ZIP
- Berisi file CSV untuk setiap tabel

**Automated Backup**:
- Otomatis setiap tanggal 1 jam 00:00 UTC
- Tersimpan di Supabase Storage

---

## 🎨 6. Fitur Umum

### 6.1 Theme Mode
- **Light Mode**: Tampilan terang
- **Dark Mode**: Tampilan gelap
- Toggle via tombol di sidebar footer

### 6.2 User Info
- Menampilkan nama user dan badge role
- Terletak di sidebar footer

### 6.3 Responsive Design
- Desktop-first design
- Sidebar collapsible untuk tablet/mobile

---

*Dokumen ini dibuat pada: 3 Januari 2026*



## Ringkasan Temuan

Aplikasi mengalami masalah performa utama pada layer **Backend/Database** dan **Middleware**. Masalah terbesar adalah pola query database "N+1" yang menyebabkan pengambilan data menjadi eksponensial seiring bertambahnya data, serta logika middleware yang melakukan request database berulang yang tidak perlu.

## 1. Backend & Database Bottlenecks

### A. N+1 Query Problem (Kritis)
Pada service utama (`reagent.service.ts`, `item.service.ts`), aplikasi menggunakan pola yang sangat tidak efisien:
1.  Mengambil **semua** item dari katalog (misal: 1000 reagen).
2.  Melakukan loop pada setiap item.
3.  Di dalam loop, melakukan query database *lagi* untuk menghitung stok.

**Dampak:**
Jika ada 100 reagen, aplikasi melakukan 101 query database (1 query untuk list, 100 query untuk stok). Ini menyebabkan halaman loading sangat lama.

**Lokasi Masalah:**
- `src/lib/services/reagent.service.ts` (Method `getAll`)
- `src/lib/services/item.service.ts` (Method `getAll`)
- `src/lib/services/instrument.service.ts` (Method `getAll` - memuat relasi secara manual di beberapa tempat)

**Rekomendasi:**
Gunakan **SQL JOIN** dan **Aggregation** (GROUP BY) untuk mengambil data katalog beserta jumlah stoknya dalam **satu query**.

### B. Missing Indexes (Penting)
Meskipun file `supabase/performance-indexes.sql` ada, perlu dipastikan apakah index tersebut sudah diaplikasikan di production. Tanpa index, database harus melakukan *Full Table Scan* untuk setiap pencarian atau filter.

**Table yang butuh perhatian:**
- `warehouse_chemicals`: Kolom `catalog_id`, `expired_date`, `status` sering dipakai filter.
- `instruments`: Kolom `next_calibration_date`, `status`.
- `usage_logs`: Kolom `date`, `item_type`.

### C. Pola Penggunaan ORM Drizzle
Penggunaan `db.query.table.findMany` dengan `with: { ... }` pada Drizzle umumnya efisien (melakukan 1 query tambahan untuk relasi), namun jika dikombinasikan dengan logic manual di TypeScript (seperti filtering array di memori setelah fetch semua data), ini membebani server.

**Temuan:**
- `InstrumentService.getAll`: Mengambil semua instrumen, lalu melakukan filtering `search` dan `status` menggunakan JavaScript `filter()` di memori, bukan di database (SQL `WHERE`).
- **Dampak:** Jika database punya 10.000 instrumen, aplikasi akan download 10.000 baris ke server, baru mem-filter 10 baris yang dibutuhkan. Ini memakan RAM dan Bandwidth DB yang besar.

## 2. Middleware & Auth Overhead

### A. Session Check Berulang
Middleware (`src/middleware.ts` dan `src/lib/supabase/middleware.ts`) melakukan validasi session ke Supabase Auth pada **setiap request**.
- `await supabase.auth.getUser()` memanggil API Supabase setiap kali user membuka halaman atau request API.

**Dampak:**
Latency jaringan ke Supabase Auth menambah waktu loading setiap halaman sekitar 100-300ms.

**Rekomendasi:**
Implementasikan caching strategi yang lebih agresif atau optimasi matcher middleware agar tidak berjalan di file statis (sudah ada, tapi perlu review coverage).

### B. Client-Side Auth Provider
`AuthProvider` (`src/components/providers/auth-provider.tsx`) melakukan fetch session saat mounting.
- Jika middleware sudah cek session, client-side cek lagi. Double request.

## 3. Frontend Optimization

### A. Client Components
Banyak komponen yang ditandai `"use client"` di level atas (`layout.tsx`, `sidebar`, `header`). Ini mengurangi manfaat Server Side Rendering (SSR) Next.js.
- Sebaiknya `"use client"` didorong ke bawah (daun komponen) agar data fetching awal bisa dilakukan di server dan dikirim sebagai HTML jadi.

### B. Pola Fetching Data
Dashboard (`src/app/api/dashboard/route.ts`) melakukan banyak query terpisah menggunakan `Promise.all`. Meskipun paralel, query-query ini bisa digabungkan atau dioptimasi.

## Kesimpulan & Rencana Perbaikan

Prioritas perbaikan berdasarkan dampak:

1.  **High Priority (Perbaikan Langsung Terasa):**
    - Refactor `reagent.service.ts` dan `item.service.ts` untuk menggunakan SQL Aggregation (menghilangkan N+1 query).
    - Pindahkan logic filtering dari Memory (JavaScript) ke Database (SQL WHERE clause) pada semua service (`instrument.service.ts`, dll).

2.  **Medium Priority:**
    - Pastikan semua Database Index terpasang.
    - Optimasi Dashboard API query.

3.  **Low Priority:**
    - Optimasi Middleware dan Auth caching.

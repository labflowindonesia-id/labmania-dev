# Lessons Learned: Database Connection & Query Errors

> **Tanggal:** 2 Februari 2026  
> **Proyek:** LabFlow LIMS  
> **Kategori:** Database, Supabase, Drizzle ORM

---

## 🔴 Issue 1: Database Connection Failed

### Problem
```
Error: getaddrinfo ENOTFOUND db.vxmiigidblwbpyqhhlcu.supabase.co
Error: Tenant or user not found
```

### Root Cause
Supabase migrated from **PgBouncer** to **Supavisor** (Jan 2024):
- Old pooler hostname (`db.xxx.supabase.co`) hanya resolve ke **IPv6**
- Network tidak mendukung IPv6 → connection failed

### Solution
Gunakan **Shared Pooler** dengan IPv4 support:
```env
# ❌ OLD (IPv6 only - tidak bekerja)
DATABASE_URL=postgres://postgres:xxx@db.xxx.supabase.co:6543/postgres

# ✅ NEW (IPv4 compatible)
DATABASE_URL=postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-{N}-{REGION}.pooler.supabase.com:5432/postgres
```

### Prevention Checklist
- [ ] Selalu ambil connection string dari **Supabase Dashboard → Settings → Database**
- [ ] Pilih **"Using the Shared Pooler"** yang bertanda **IPv4 COMPATIBLE**
- [ ] Gunakan format username `postgres.{PROJECT_REF}` bukan `postgres` saja
- [ ] Test koneksi dengan `nslookup` sebelum deploy

---

## 🔴 Issue 2: Column Name Mismatch

### Problem
```
Error: column warehouse_chemicals.storage_location does not exist
Error: column warehouse_items.item_id does not exist
```

### Root Cause
Query Supabase menggunakan nama kolom yang **tidak sesuai dengan schema database**:

| Kolom di Query | Kolom Sebenarnya |
|----------------|------------------|
| `storage_location` | *(tidak ada)* |
| `item_id` | `catalog_id` |
| `remaining_quantity` | `current_quantity` |

### Solution
Validasi kolom terhadap **Drizzle schema** (`src/lib/db/schema/*.ts`)

### Prevention Checklist

#### Saat Menulis Query Supabase:
- [ ] Buka file schema Drizzle terkait sebelum menulis query
- [ ] Gunakan **nama kolom database** (snake_case), bukan property TypeScript (camelCase)
- [ ] Cross-check dengan `SELECT column_name FROM information_schema.columns WHERE table_name = 'xxx'`

#### Saat Menambah/Mengubah Kolom:
- [ ] Update **Drizzle schema** (`src/lib/db/schema/*.ts`)
- [ ] Buat **migration SQL** di `supabase/migrations/`
- [ ] Run migration di Supabase Dashboard
- [ ] Update **semua query** yang menggunakan tabel tersebut

---

## 📝 Quick Reference: Column Names

### `warehouse_chemicals`
```typescript
// Drizzle Schema → Database Columns
catalogId     → catalog_id
catalogType   → catalog_type
name          → name
receivedDate  → received_date
sizeValue     → size_value
sizeUnit      → size_unit
remainingAmount → remaining_amount
unit          → unit
expiredDate   → expired_date
// ⚠️ TIDAK ADA: storage_location
```

### `warehouse_items`
```typescript
// Drizzle Schema → Database Columns
catalogId       → catalog_id       // ❌ BUKAN item_id
currentQuantity → current_quantity // ❌ BUKAN remaining_quantity
name            → name
category        → category
```

---

## 🛡️ Prevention Best Practices

### 1. Environment Setup
```bash
# Simpan backup .env.local yang bekerja
cp .env.local .env.local.backup

# Dokumentasikan format connection string
# DATABASE_URL format: postgresql://postgres.{REF}:{PASS}@aws-{N}-{REGION}.pooler.supabase.com:5432/postgres
```

### 2. Query Development
```typescript
// ✅ SELALU validasi kolom sebelum query
const columns = await supabase.from('warehouse_chemicals')
  .select('*')
  .limit(1);
console.log(Object.keys(columns.data?.[0] || {}));

// ✅ Gunakan type-safe queries dengan Drizzle
import { db } from '@/lib/db';
const items = await db.query.warehouseChemicals.findMany();
```

### 3. Error Handling
```typescript
// ✅ SELALU log error details
const { data, error } = await supabase.from('table').select('...');
if (error) {
  console.error('Query failed:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
}
```

### 4. Testing Checklist
- [ ] Test API locally sebelum deploy
- [ ] Check terminal logs untuk error queries
- [ ] Verify data muncul di UI, bukan hanya 200 OK

---

## 📚 Resources

- [Supabase Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supavisor IPv4 Migration](https://github.com/orgs/supabase/discussions/17817)
- [Drizzle ORM Schema](https://orm.drizzle.team/docs/schemas)

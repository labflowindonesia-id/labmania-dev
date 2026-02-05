# Cost Per Test & Document Storage - Implementation Plan

> **Mode**: PLANNING | **Date**: 2026-02-02 | **Project**: LabFlow Assets

---

## Overview

Menambahkan dua fitur baru ke aplikasi LabFlow Assets:

1. **Cost per Test**: Tracking biaya otomatis ketika training set dieksekusi, dengan laporan visual pengeluaran
2. **Cost per Usage**: Tracking biaya saat analis menggunakan item via usage log
3. **MSDS & CoA Document Library**: Perpustakaan terpusat untuk dokumen MSDS dan CoA

---

## User Requirements Summary

| Aspect | Decision |
|--------|----------|
| Price Input Location | Warehouse entry (saat receiving/edit) |
| Price Calculation Method | FEFO for reagent/standard, FIFO for consumables |
| Consumable Unit | Normalize to `pcs` only (no roll/pack) |
| Cost Conversion | Proportional calculation based on unit |
| Cost Logging | Detail per item (nama, qty, harga, subtotal) |
| Document Storage | Centralized library at `/inventory/documents` |
| Document Access | Via dedicated library page only |

---

## Cost Calculation Logic

### Consumables (warehouse_items)
```
Harga input: Per PCS (normalized)
Formula: cost = quantity_used × unit_cost

Example:
- Pipette Tips: Rp 500/pcs
- Used: 10 pcs
- Cost: 10 × 500 = Rp 5,000
```

### Reagents/Standards (warehouse_chemicals)
```
Harga input: Per bottle/package (total_price + size_value)
Formula: cost_per_unit = total_price / size_value
         cost = quantity_used × cost_per_unit

Example:
- Ethanol 2000mL, Rp 1,000,000
- cost_per_ml = 1,000,000 / 2000 = Rp 500/mL
- Used: 500mL
- Cost: 500 × 500 = Rp 250,000
```

---

## Database Schema Changes

### 1. Modify `warehouse_items` Table
```sql
ALTER TABLE warehouse_items ADD COLUMN unit_cost DECIMAL(15,2);
-- Comment: Harga per pcs (normalized unit)
```

### 2. Modify `warehouse_chemicals` Table
```sql
ALTER TABLE warehouse_chemicals ADD COLUMN total_price DECIMAL(15,2);
ALTER TABLE warehouse_chemicals ADD COLUMN unit_cost_base DECIMAL(15,4);
-- Comment: total_price = harga per bottle/package
-- Comment: unit_cost_base = price per unit (Rp/mL atau Rp/g), calculated from total_price/size_value
-- unit_cost_base disimpan untuk mencegah drift jika size_value di-edit
```

### 3. Modify `reagent_catalog` Table
```sql
ALTER TABLE reagent_catalog ADD COLUMN coa_document TEXT;
-- Comment: URL ke file CoA di Supabase Storage (quick access reference)
```

### 4. Modify `standard_catalog` Table
```sql
ALTER TABLE standard_catalog ADD COLUMN coa_document TEXT;
-- Comment: URL ke file CoA di Supabase Storage (quick access reference)
```

### 5. Modify `usage_logs` Table
```sql
ALTER TABLE usage_logs ADD COLUMN unit_cost DECIMAL(15,4);
ALTER TABLE usage_logs ADD COLUMN total_cost DECIMAL(15,2);
ALTER TABLE usage_logs ADD COLUMN warehouse_item_id UUID; -- FK to warehouse_items or warehouse_chemicals
ALTER TABLE usage_logs ADD COLUMN warehouse_type VARCHAR(20); -- 'chemical' or 'item'
-- Comment: Snapshot harga saat penggunaan + traceability ke batch
```

### 6. Create `training_cost_logs` Table
```sql
CREATE TABLE training_cost_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_set_id UUID REFERENCES training_sets(id) ON DELETE SET NULL,
    training_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by UUID REFERENCES profiles(id),
    participants INTEGER NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(64) UNIQUE, -- Hash untuk cegah double execution
    created_at TIMESTAMP DEFAULT NOW(),
    -- Unique constraint untuk guard double-click
    CONSTRAINT unique_training_execution UNIQUE (training_set_id, executed_by, DATE_TRUNC('minute', executed_at))
);
```

### 7. Create `training_cost_log_items` Table (Enhanced Traceability)
```sql
CREATE TABLE training_cost_log_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_cost_log_id UUID REFERENCES training_cost_logs(id) ON DELETE CASCADE,
    
    -- Item identification
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- 'consumable' | 'reagent' | 'standard' | 'barang'
    
    -- Traceability: link ke sumber batch
    catalog_id UUID,           -- FK ke catalog (reagent_catalog, standard_catalog, items_catalog)
    warehouse_item_id UUID,    -- FK ke warehouse_items (for consumable/barang)
    warehouse_chemical_id UUID,-- FK ke warehouse_chemicals (for reagent/standard)
    
    -- Quantity & Cost snapshot (immutable)
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_cost DECIMAL(15,4) NOT NULL,  -- Snapshot harga per unit saat eksekusi
    total_cost DECIMAL(15,2) NOT NULL
);
```

### 8. Create `documents` Table (Centralized Document Library)
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Document metadata
    name VARCHAR(255) NOT NULL,          -- Display name
    document_type VARCHAR(20) NOT NULL,  -- 'msds' | 'coa'
    file_url TEXT NOT NULL,              -- Supabase Storage URL
    file_size INTEGER,                   -- Bytes
    mime_type VARCHAR(100),
    
    -- Catalog reference for organization
    catalog_type VARCHAR(20) NOT NULL,   -- 'reagent' | 'standard'
    catalog_id UUID NOT NULL,            -- FK to reagent_catalog atau standard_catalog
    
    -- Audit
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk search/filter yang cepat
CREATE INDEX idx_documents_catalog ON documents(catalog_type, catalog_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_name ON documents USING gin(to_tsvector('indonesian', name));
```

> **Note**: Field `msds_document` dan `coa_document` di catalog tetap dipertahankan sebagai "quick access reference" untuk akses langsung dari halaman detail. Tabel `documents` adalah source of truth untuk library.

---

## File Changes

### [MODIFY] `src/lib/db/schema/inventory.ts`
- Add `unitCost` to `warehouseItems`
- Add `totalPrice`, `unitCostBase` to `warehouseChemicals`
- Add `coaDocument` to `reagentCatalog` and `standardCatalog`
- Add `unitCost`, `totalCost`, `warehouseItemId`, `warehouseType` to `usageLogs`
- Create `trainingCostLogs` with `idempotencyKey` and unique constraint
- Create `trainingCostLogItems` with full traceability fields
- Create `documents` table for centralized library
- Add relations

---

### [MODIFY] `src/lib/services/training.service.ts`
- Update `processTraining()` to:
  1. Generate idempotency_key dari (training_set_id + participants + timestamp_rounded)
  2. Check existing log dengan idempotency_key untuk cegah double-execution
  3. Use transaction (db.transaction) untuk atomic operation: reduce stok + insert log
  4. Calculate cost per item using conversion formula with unit_cost_base
  5. Store warehouse_item_id/warehouse_chemical_id di log items
  6. Return cost summary in response

---

### [MODIFY] `src/lib/services/usage-log.service.ts`
- Update create method to:
  1. Look up price from warehouse item
  2. Calculate cost using conversion
  3. Store `unit_cost` and `total_cost` in log

---

### [NEW] `src/lib/services/cost.service.ts`
```typescript
// Methods:
// - calculateItemCost(itemType, warehouseId): { unitCost, unitCostBase }
// - generateIdempotencyKey(trainingSetId, participants, userId): string
// - checkDuplicateExecution(idempotencyKey): boolean
// - getTrainingCostStats(filters): { thisMonth, lastMonth, ytd }
// - getTrainingCostTrends(period, limit): CostTrendData[]
// - getUsageCostStats(filters): same as training
```

---

### [NEW] `src/lib/services/document.service.ts`
```typescript
// Methods:
// - getAllDocuments(filters: { search, type, catalogType }): DocumentItem[]
// - getDocumentById(id): DocumentItem | null
// - uploadDocument(type, catalogId, catalogType, file): DocumentItem
// - deleteDocument(id): boolean
// - syncCatalogField(catalogType, catalogId, documentUrl): void // Update quick-access field di catalog
```

---

### [MODIFY] `src/app/api/inventory/training/[id]/route.ts`
- Update POST handler to return cost data in response

---

### [MODIFY] `src/app/api/inventory/usage-logs/route.ts`
- Update POST handler to calculate and store costs

---

### [NEW] `src/app/api/reports/training-costs/route.ts`
- GET: List training cost logs with pagination
- Response includes items breakdown

---

### [NEW] `src/app/api/reports/training-costs/stats/route.ts`
- GET: Return stats (thisMonth, lastMonth, ytd)

---

### [NEW] `src/app/api/reports/training-costs/trends/route.ts`
- GET: Return monthly trends for chart

---

### [NEW] `src/app/api/inventory/documents/route.ts`
- GET: List documents with search/filter
- POST: Upload document (multipart)
- DELETE: Remove document

---

### [MODIFY] `src/app/(dashboard)/inventory/training/page.tsx`
- Update stock check dialog to show cost preview table
- Add cost column in results

---

### [NEW] `src/app/(dashboard)/inventory/training/reports/page.tsx`
- Summary cards (this month, last month, YTD)
- Wave/Area chart for monthly trends
- Log table with expandable detail

---

### [MODIFY] `src/app/(dashboard)/inventory/usage-logs/page.tsx`
- Add cost columns to table
- Show unit cost and total cost

---

### [NEW] `src/app/(dashboard)/inventory/documents/page.tsx`
- Document library with:
  - Search input
  - Type filter (MSDS/CoA)
  - Catalog type filter (Reagent/Standard)
  - Card list with preview & download buttons
  - Upload dialog

---

### [NEW] `src/components/charts/cost-trend-chart.tsx`
- Area chart using shadcn/ui ChartContainer
- Smooth curve with `type="natural"`
- Gradient fill, trending indicator

---

### [NEW] `supabase/migrations/20260202_cost_tracking.sql`
- SQL migration file for all schema changes

---

## UI Mockups

### Cost Preview in Stock Check Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Hasil Pengecekan Stok                                      │
│ Training: HPLC Dasar | Peserta: 12 orang                   │
├─────────────────────────────────────────────────────────────┤
│ Item         │ Tipe    │ Qty      │ @Harga   │ Subtotal    │
├──────────────┼─────────┼──────────┼──────────┼─────────────┤
│ Acetonitril  │ Reagen  │ 2000 mL  │ @500/mL  │ Rp 1,000,000│
│ Vial HPLC    │ Cons.   │ 24 pcs   │ @2,500   │ Rp 60,000   │
│ Std Caffeine │ Std     │ 10 mL    │ @15,000  │ Rp 150,000  │
├─────────────────────────────────────────────────────────────┤
│                         💰 Total Estimasi: Rp 1,210,000    │
│                                                             │
│   ⚠️ Estimasi berdasarkan stok FEFO yang akan digunakan    │
│                                                             │
│                        [Tutup]  [Proses & Kurangi Stok]    │
└─────────────────────────────────────────────────────────────┘
```

### Training Cost Reports Page
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Laporan Biaya Training                                  │
│                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐  📅 Januari 2026       │
│ │ Bulan   │ │ Bulan   │ │  YTD    │                        │
│ │ Ini     │ │ Lalu    │ │         │  Filter: [Semua ▼]     │
│ │ 5.2 jt  │ │ 3.8 jt  │ │ 12.4 jt │                        │
│ │ +36.8%↑ │ │         │ │         │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Tren Pengeluaran Bulanan                                ││
│ │                                                          ││
│ │        ╭───╮          ╭───╮                             ││
│ │   ╭───╯    ╰──╮  ╭───╯    ╰───                          ││
│ │ ──╯           ╰──╯                                       ││
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                             ││
│ │  Jan   Feb   Mar   Apr   May   Jun                      ││
│ │                                                          ││
│ │ 📈 Trending up by 5.2%  |  Januari - Juni 2026          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Riwayat Eksekusi Training                                  │
│ ───────────────────────────────────────────────────────────│
│ □  Tanggal   │ Training       │ Peserta │ Total    │      │
│ ├────────────┼────────────────┼─────────┼──────────┼──────┤
│ │  02 Feb    │ HPLC Dasar     │ 12      │ 1.21 jt  │  [▸] │
│ │  28 Jan    │ GC-MS Lanjutan │ 8       │ 620 rb   │  [▸] │
│ │  20 Jan    │ Spektro UV-Vis │ 15      │ 340 rb   │  [▸] │
└─────────────────────────────────────────────────────────────┘
```

### Training Cost Log Detail (Expanded)
```
┌─────────────────────────────────────────────────────────────┐
│ Detail: HPLC Dasar - 02 Feb 2026                           │
│ Dieksekusi oleh: Admin | 12 peserta (3 set)                │
├─────────────────────────────────────────────────────────────┤
│ Item             │ Tipe    │ Qty      │ @Harga  │ Subtotal │
│ Acetonitril      │ Reagen  │ 2000 mL  │ 500     │ 1,000,000│
│ Vial HPLC        │ Cons.   │ 24 pcs   │ 2,500   │ 60,000   │
│ Std Caffeine     │ Std     │ 10 mL    │ 15,000  │ 150,000  │
├─────────────────────────────────────────────────────────────┤
│                                     Total: Rp 1,210,000    │
└─────────────────────────────────────────────────────────────┘
```

### Document Library Page
```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Perpustakaan Dokumen                                    │
│                                                             │
│ [🔍 Cari nama dokumen...        ] [Upload +]               │
│                                                             │
│ [Semua] [MSDS] [CoA]   |   [Semua Katalog ▼]               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📋 Acetonitril HPLC Grade                               ││
│ │    🧪 Reagen | MSDS | Uploaded: 15 Jan 2026             ││
│ │                                      [👁 Preview] [⬇️]  ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ 📋 Methanol Pro Analysis                                ││
│ │    🧪 Reagen | MSDS | Uploaded: 12 Jan 2026             ││
│ │                                      [👁 Preview] [⬇️]  ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ 📋 Caffeine Standard 1000ppm                            ││
│ │    ⚗️ Standard | CoA | Uploaded: 10 Jan 2026            ││
│ │                                      [👁 Preview] [⬇️]  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Menampilkan 3 dari 45 dokumen                    [1][2][3]>│
└─────────────────────────────────────────────────────────────┘
```

### Usage Logs Page (Updated with Cost)
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Log Penggunaan                               [+ Tambah] │
│ ───────────────────────────────────────────────────────────│
│ Tanggal│Pengguna│Item        │Tipe   │Qty   │@Harga│Total │
│ ───────┼────────┼────────────┼───────┼──────┼──────┼──────│
│ 02 Feb │ Ana   │ Ethanol    │Reagen │500mL │500   │250rb │
│ 02 Feb │ Budi  │ Pipette Tip│Cons.  │20pcs │500   │10rb  │
│ 01 Feb │ Ana   │ Std NaCl   │Std    │5mL   │20rb  │100rb │
└─────────────────────────────────────────────────────────────┘
```

---

## Task Breakdown

### Phase 1: Database Schema (Agent: backend-specialist)
| # | Task | Priority | Deps |
|---|------|----------|------|
| 1.1 | Add `totalPrice` to warehouse_chemicals schema | P0 | - |
| 1.2 | Add `unitCost` to warehouse_items schema | P0 | - |
| 1.3 | Add `coaDocument` to reagent/standard catalogs | P0 | - |
| 1.4 | Add `unitCost`, `totalCost` to usage_logs | P0 | - |
| 1.5 | Create `trainingCostLogs` table | P0 | - |
| 1.6 | Create `trainingCostLogItems` table | P0 | 1.5 |
| 1.7 | Create and document migration SQL | P0 | 1.1-1.6 |

### Phase 2: Service Layer (Agent: backend-specialist)
| # | Task | Priority | Deps |
|---|------|----------|------|
| 2.1 | Create `cost.service.ts` with calculation helpers | P0 | 1.7 |
| 2.2 | Enhance `processTraining()` with cost logging | P0 | 2.1 |
| 2.3 | Update usage-log service with cost calculation | P0 | 2.1 |
| 2.4 | Add cost stats and trends methods | P1 | 1.7 |
| 2.5 | Create `document.service.ts` | P1 | 1.3 |

### Phase 3: API Layer (Agent: backend-specialist)
| # | Task | Priority | Deps |
|---|------|----------|------|
| 3.1 | Update training process endpoint with cost response | P0 | 2.2 |
| 3.2 | Update usage-logs POST with cost fields | P0 | 2.3 |
| 3.3 | Create `/api/reports/training-costs` routes | P1 | 2.4 |
| 3.4 | Create `/api/inventory/documents` routes | P1 | 2.5 |

### Phase 4: Frontend - Cost Tracking (Agent: frontend-specialist)
| # | Task | Priority | Deps |
|---|------|----------|------|
| 4.1 | Update warehouse receiving forms with price input | P0 | 1.7 |
| 4.2 | Add cost columns to stock check dialog | P0 | 3.1 |
| 4.3 | Add cost columns to usage logs table | P0 | 3.2 |
| 4.4 | Create Training Cost Reports page | P1 | 3.3 |
| 4.5 | Create cost trend chart component | P1 | 4.4 |

### Phase 5: Frontend - Document Library (Agent: frontend-specialist)
| # | Task | Priority | Deps |
|---|------|----------|------|
| 5.1 | Create Document Library page | P1 | 3.4 |
| 5.2 | Add PDF preview modal | P1 | 5.1 |
| 5.3 | Add document upload dialog | P1 | 5.1 |
| 5.4 | Add sidebar navigation link | P2 | 5.1 |

---

## Verification Plan

### Automated Tests

| # | Test Type | Description | Command |
|---|-----------|-------------|---------|
| V.1 | TypeScript | Check type errors | `npx tsc --noEmit` |
| V.2 | Build | Ensure production build succeeds | `npm run build` |

### Manual Browser Tests

| # | Test | Steps |
|---|------|-------|
| V.3 | **Cost Calculation - Consumable** | 1. Go to `/inventory/warehouse-items` → Add item → Input unit cost Rp 500/pcs <br> 2. Go to `/inventory/training` → Create training with that item <br> 3. Execute training for 5 participants <br> 4. Verify cost shown = quantity × 500 |
| V.4 | **Cost Calculation - Reagent** | 1. Go to `/inventory/warehouse-chemicals` → Add reagent → Input total price Rp 1,000,000 for 2000mL <br> 2. Create training using 500mL <br> 3. Execute → Verify cost = Rp 250,000 |
| V.5 | **Usage Log Cost** | 1. Go to `/inventory/usage-logs` → Add new log <br> 2. Verify cost columns show calculated values |
| V.6 | **Training Cost Report** | 1. Execute a training <br> 2. Go to `/inventory/training/reports` <br> 3. Verify log appears in table with correct cost |
| V.7 | **Document Upload** | 1. Go to `/inventory/documents` <br> 2. Click Upload → Select PDF <br> 3. Verify document appears in list |
| V.8 | **Document Preview** | 1. Click preview on any document <br> 2. Verify PDF modal opens |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing price data | Cost = 0 | Show warning, require price for execution |
| Large PDF uploads | Storage quota | 10MB limit already configured |
| Price changes over time | Inaccurate history | Store `unit_cost` snapshot in log items |
| Unit conversion errors | Wrong cost | Add unit validation, test edge cases |

---

## Navigation Changes

Add to sidebar navigation (`src/app/(dashboard)/layout.tsx`):

```
Inventory
├── Dashboard
├── Reagents
├── Standards  
├── Items
├── Warehouse Chemicals
├── Warehouse Items
├── Orders
├── Training Usage
│   └── Cost Reports  ← NEW
├── Usage Logs
└── Documents         ← NEW
```

---

## Next Steps

1. **Review this plan** and confirm approach
2. Run `/create` or confirm to begin implementation
3. Start with Phase 1 (Database Schema)

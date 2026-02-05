# Sample Tracking Feature

## Goal
Add **Sample** (QC Sample) as a new catalog type, mirroring existing Reagent/Standard patterns exactly.

---

## Architecture Analysis (Based on Existing Code)

**Reagent/Standard Catalog Pattern:**
- Catalog = Master data (name, form, location, minimumStockLevel, photo)
- `currentStock` = Calculated count of warehouse entries (per-bottle/per-unit)
- `status` = Calculated from warehouse data: `available | low_stock | out_of_stock | expired`
- `nearestExpDate` = Calculated from warehouse batch dates
- Photo upload uses `images` storage bucket

**Sample will follow the same pattern exactly.**

---

## Proposed Changes

### Database Layer

#### [NEW] `sample_catalog` table (mirror `reagent_catalog`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `sample_name` | varchar(255) | e.g., "Anggur Putih Botol" |
| `matrix` | varchar(100) | e.g., "Wine", "Water", "Oil" |
| `storage_location` | enum | TC 1, TC 2 (same as reagent) |
| `form` | enum | solid, liquid, gas |
| `minimum_stock_level` | integer | Alert threshold (per-bottle count) |
| `photo` | text | Storage URL (bucket: `images`) |
| `created_at` / `updated_at` | timestamp | Audit |

#### [MODIFY] `warehouse_chemicals.catalog_type`
Add `'sample'` to existing values:
```typescript
catalog_type: 'reagent' | 'standard' | 'sample'
```

> **Note:** No changes to `warehouse_chemicals` table structure - only add sample as a type option.

---

### Backend Changes

#### [NEW] `src/lib/services/sample.service.ts`
Mirror `reagent.service.ts` exactly:
- `SampleWithStock` interface with calculated `currentStock`, `status`, `nearestExpDate`
- `getAll(filters)` - paginated list with status/search filters
- `getById(id)` - single sample with stock info
- `create(data)` / `update(id, data)` / `delete(id)`
- `getWarehouseItems(catalogId)` - fetch warehouse entries

**Status Calculation (same as reagent):**
```typescript
// Status logic from reagent.service.ts:
// - expired: nearestExpDate < today
// - out_of_stock: currentStock === 0
// - low_stock: currentStock <= minimumStockLevel
// - available: otherwise
```

#### [NEW] `src/app/api/inventory/samples/*`
- `route.ts`: GET (list) + POST (create)
- `[id]/route.ts`: GET + PUT + DELETE

#### [MODIFY] `src/lib/services/warehouse-chemical.service.ts`
Update type only:
```typescript
catalogType: 'reagent' | 'standard' | 'sample'
```

#### [MODIFY] `src/types/index.ts`
Add `SampleCatalog` interface and update `WarehouseChemical.catalogType`.

---

### Frontend Changes

#### [NEW] `src/app/(dashboard)/inventory/samples/page.tsx`
Mirror `reagents/page.tsx` exactly:
- Card grid layout with photos
- Status badges: Tersedia, Stok Menipis, Habis, Expired
- Form fields: Name, Matrix, Location, Form, Min Stock, Photo (upload to `images` bucket)
- CRUD dialogs

#### [NEW] `src/app/(dashboard)/inventory/samples/[id]/page.tsx`
Detail page with warehouse batches list.

#### [MODIFY] `src/app/(dashboard)/inventory/warehouse-chemicals/page.tsx`
**Minimal changes only:**
1. Add `<SelectItem value="sample">Sample</SelectItem>` to type filter (line ~417)
2. Add `<SelectItem value="sample">Sample</SelectItem>` to catalog type dropdown in dialog (line ~283)
3. Fetch sample catalog: `useCatalogItems("/api/inventory/samples", ...)`
4. Add amber badge styling:
```tsx
item.catalogType === "sample" 
  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
```

> **No layout changes** - same table, same columns.

#### [MODIFY] `src/app/(dashboard)/inventory/training/page.tsx`
Add `sample` to item type dropdown for training set items.

#### [MODIFY] Sidebar navigation
Add "Samples" menu item under Inventory section.

---

## Tasks

- [ ] **Task 1:** Create `sample_catalog` table migration
- [ ] **Task 2:** Create `sample.service.ts` (copy reagent.service.ts pattern)
- [ ] **Task 3:** Create `/api/inventory/samples/*` routes
- [ ] **Task 4:** Update types + warehouse-chemical service catalogType
- [ ] **Task 5:** Create `/inventory/samples` page (copy reagents pattern)
- [ ] **Task 6:** Add sample type to warehouse-chemicals page (filter + dialog)
- [ ] **Task 7:** Add sample to training set item types
- [ ] **Task 8:** Add Samples to sidebar navigation

---

## Verification Plan

### Manual Testing

1. **Sample Catalog CRUD**
   - Create sample with photo → Appears in grid
   - Edit sample → Changes saved
   - Delete sample → Removed from list

2. **Stock Calculation**
   - Create sample with min_stock=3
   - Add 0 warehouse entries → Status = "Habis"
   - Add 2 entries → Status = "Stok Menipis"
   - Add 5 entries → Status = "Tersedia"

3. **Warehouse Integration**
   - Receive sample in warehouse → Appears with amber badge
   - Filter by "Sample" → Shows only samples
   - Existing reagent/standard entries unchanged

4. **Training Set**
   - Add sample to training set → Works
   - Execute training → Usage deducted, stock decreases

5. **Regression Check**
   - Reagent catalog works ✓
   - Standard catalog works ✓
   - Warehouse chemicals works ✓

---

## Done When
- [ ] Sample catalog mirrors reagent catalog behavior exactly
- [ ] Status/stock calculated from warehouse (not catalog field)
- [ ] Photo upload works with `images` bucket
- [ ] Warehouse page shows samples alongside reagent/standard
- [ ] All existing features unchanged

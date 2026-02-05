# Clean Code & Arsitektur

Dokumen ini berisi mengenai kualitas kode (Clean Code) dan arsitektur aplikasi Labmania, dengan fokus pada standarisasi API dan pola Rendering Frontend.

## 1. Backend & API Standardization

### Temuan: Redudansi Logic
Saat ini, setiap API route (`src/app/api/...`) menulis ulang logika error handling `try-catch` dan validasi secara manual.

**Contoh Saat Ini (`src/app/api/instruments/route.ts`):**
```typescript
export async function GET(request: NextRequest) {
    try {
        // ... logic ...
        return NextResponse.json(result);
    } catch (error) {
        console.error('Get instruments API error:', error); // Redundant logging code
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 }); // Redundant error response
    }
}
```

### Rekomendasi: Higher-Order Functions & Zod Validation
Gunakan pattern wrapper untuk menstandarisasi response dan error handling.

**Proposal Solusi (`src/lib/api-wrapper.ts`):**
```typescript
// Wrapper untuk menangani try-catch standar
export const apiHandler = (handler: Function) => async (req: NextRequest, ...args: any[]) => {
    try {
        return await handler(req, ...args);
    } catch (error) {
        // Centralized logging & error mapping
        console.error(error);
        if (error instanceof ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
```

### Rekomendasi: Centralized Error Handling (Middleware Error)

Selain API Wrapper, kita perlu membuat mekanisme error handling yang terpusat (Custom Error Classes) agar pesan error konsisten di seluruh aplikasi.

**1. Buat Custom Error Class & Handler (`src/lib/api-utils.ts`):**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public data?: Record<string, any>,
    public headers?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class AuthError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTH_ERROR')
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed') {
    super(400, message, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND')
  }
}

export function handleApiError(error: unknown, dictionary?: Record<string, any>) {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: dictionary?.validation_failed || 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    }, { status: 400 })
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      ...error.data
    }, {
      status: error.statusCode,
      headers: error.headers
    })
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json({
      success: false,
      error: dictionary?.server_error || error.message
    }, { status: 500 })
  }

  // Handle unknown errors
  return NextResponse.json({
    success: false,
    error: dictionary?.server_error || 'Internal server error'
  }, { status: 500 })
}
```

**2. Integrasi dengan API Routes:**
Gunakan `handleApiError` di dalam blok `catch` pada setiap route handler.

```typescript
// src/app/api/example/route.ts
export async function GET() {
    try {
        // ... logic ...
        throw new NotFoundError("Item tidak ditemukan");
    } catch (error) {
        return handleApiError(error);
    }
}
```

**Manfaat:**
- Developer cukup throw `new NotFoundError("Instrumen tidak ditemukan")` di service layer.
- Format response error standar dan konsisten (`success: false`, `error`, `code`).
- Menangani validasi Zod secara otomatis.

**Hasil Code yang Lebih Bersih:**
```typescript
export const GET = apiHandler(async (req) => {
    const filters = parseFilters(req.url); // Reusable helper
    const result = await instrumentService.getAll(filters);
    return NextResponse.json(result);
});
```

## 2. Frontend Architecture ("use client" Overuse)

### Temuan: Ketergantungan pada Client-Side Fetching
Hampir semua halaman di `(dashboard)` menggunakan `"use client"` di level teratas (`page.tsx`) dan mengambil data menggunakan `useEffect` (via custom hook `useFetch`).

**Contoh (`src/app/(dashboard)/instruments/database/page.tsx`):**
- File diawali `"use client"`.
- Menggunakan `useState` untuk data instrumen.
- Data di-fetch saat komponen mount.

**Dampak:**
1.  **SEO & Performance:** Search Engine tidak melihat konten awal (kosong sampai fetch selesai). User melihat loading spinner lebih lama.
2.  **Waterfall Request:** Browser download JS -> Parse JS -> Execute React -> Fetch API -> Tunggu Response -> Render.

### Rekomendasi: Server Components & Hydration Boundary

Pindahkan data fetching ke **Server Component** (Page level), dan lempar data sebagai props ke **Client Component** yang hanya menangani interaksi.

**Pola yang Disarankan:**

1.  **Page Level (`page.tsx`) - Server Component:**
    - Langsung panggil Service (bukan fetch API URL).
    - Tidak ada `useState` atau `useEffect`.

    ```typescript
    // src/app/(dashboard)/instruments/page.tsx
    // Default adalah Server Component
    import { instrumentService } from "@/lib/services";

    export default async function InstrumentPage({ searchParams }) {
        const data = await instrumentService.getAll({ ...searchParams });
        
        return (
            // Pass initial data to client component
            <InstrumentListClient initialData={data} />
        );
    }
    ```

2.  **Client Component (`client.tsx`):**
    - Menerima `initialData`.
    - Menggunakan `useState` hanya untuk interaksi (buka modal, form input).
    - Jika filter berubah, gunakan `router.push('?search=...')` agar Server Component me-refresh data, atau gunakan `useTransition` untuk optimasi.

## 3. Maintenance & Scalability

### A. Type Safety
Saat ini tipe data sering diduplikasi antara `schema.ts` (Drizzle) dan interface manual di frontend.
**Solusi:** Gunakan `zod` untuk inferensi tipe otomatis yang bisa dibagi (shared types) antara backend dan frontend.

### B. Service Layer
Service layer saat ini mencampur logika database dan logika bisnis (seperti formatting tanggal/status).
**Solusi:** Pisahkan DTO (Data Transfer Object) dari Entity Database. Service harus mengembalikan data yang sudah bersih/diformat untuk UI, atau biarkan UI memformat raw data.

## Rencana Implementasi Clean Code

1.  **Buat Utilitas API Wrapper:** Buat `lib/api-utils.ts` untuk standarisasi response.
2.  **Refactor Satu Halaman (Pilot Project):** Ubah `Instruments Page` menjadi Server Component yang memanggil `instrumentService` langsung.
3.  **Refactor Auth Provider:** Pindahkan logika pengecekan session se-minimal mungkin di client, percayakan pada middleware dan `layout.tsx` server component.

### Checklist Implementasi Error Handling Global (Middleware Pattern)

Target implementasi `apiHandler` (High Order Function) untuk menggantikan try-catch manual di seluruh API Route:

- [ ] **Auth Module**
  - [ ] `src/app/api/auth/login/route.ts`
  - [ ] `src/app/api/auth/logout/route.ts`
  - [ ] `src/app/api/auth/session/route.ts`

- [ ] **Admin Module**
  - [ ] `src/app/api/admin/users/route.ts`
  - [ ] `src/app/api/admin/backup/download/route.ts`

- [ ] **Instrument Module**
  - [ ] `src/app/api/instruments/route.ts`
  - [ ] `src/app/api/instruments/[id]/route.ts`
  - [ ] `src/app/api/instruments/calibration/route.ts`
  - [ ] `src/app/api/instruments/maintenance/route.ts`

- [ ] **Inventory Module**
  - [ ] `src/app/api/inventory/items/route.ts`
  - [ ] `src/app/api/inventory/reagents/route.ts`
  - [ ] `src/app/api/inventory/orders/route.ts`
  - [ ] `src/app/api/inventory/usage-logs/route.ts`
  - [ ] `src/app/api/inventory/warehouse-chemicals/route.ts`
  - [ ] `src/app/api/inventory/warehouse-items/route.ts`

- [ ] **Other Modules**
  - [ ] `src/app/api/dashboard/route.ts`
  - [ ] `src/app/api/schedule/route.ts`
  - [ ] `src/app/api/support/route.ts`
  - [ ] `src/app/api/upload/route.ts`

---
*Dibuat untuk referensi maintenance tim Labmania.*

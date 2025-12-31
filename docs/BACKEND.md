# Labmania Backend Documentation

## Overview

Labmania LIMS uses a modern backend architecture with:
- **Supabase** - PostgreSQL database, authentication, and file storage
- **Drizzle ORM** - Type-safe database queries
- **Next.js API Routes** - RESTful API endpoints

---

## Quick Start

### 1. Create Supabase Projects

Create **two** Supabase projects (Development and Production):

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Select your organization
4. Enter project name: `labmania-dev` (or `labmania-prod`)
5. Generate and **save** the database password
6. Select region: **Southeast Asia (Singapore)**
7. Click "Create new project"

### 2. Configure Environment Variables

Create `.env.local` file in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Database Connection (Settings > Database > Connection string URI)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# n8n Webhook
N8N_WEBHOOK_URL=https://n8n.srv1128584.hstgr.cloud/webhook/a9128815-4c87-4b25-b740-1325f8515890
```

**Get values from Supabase Dashboard:**
- Project URL & Anon Key: Settings > API
- Service Role Key: Settings > API
- Database URL: Settings > Database > Connection string

### 3. Generate & Run Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Push to database
npx drizzle-kit push
```

### 4. Configure Supabase Auth

In Supabase Dashboard > Authentication > Providers:
- Enable **Email** provider
- Disable "Confirm email" (we use auto-confirm)

### 5. Create First Admin User

Use Drizzle Studio or SQL Editor to create initial admin:

```sql
-- First create auth user in Supabase Auth dashboard or via SQL
INSERT INTO profiles (id, username, full_name, role)
VALUES (
  '[auth-user-id]',
  'admin',
  'Administrator',
  'admin'
);
```

---

## Project Structure

```
src/
├── lib/
│   ├── supabase/           # Supabase client utilities
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   ├── middleware.ts   # Auth middleware helper
│   │   └── admin.ts        # Admin client (service role)
│   ├── db/
│   │   ├── index.ts        # Drizzle connection
│   │   └── schema/         # Database schemas
│   │       ├── users.ts
│   │       ├── inventory.ts
│   │       └── instruments.ts
│   └── services/           # Business logic layer
│       ├── auth.service.ts
│       ├── user.service.ts
│       ├── reagent.service.ts
│       ├── standard.service.ts
│       ├── item.service.ts
│       ├── order.service.ts
│       ├── training.service.ts
│       ├── usage-log.service.ts
│       ├── warehouse-chemical.service.ts
│       ├── warehouse-item.service.ts
│       ├── instrument.service.ts
│       ├── schedule.service.ts
│       ├── storage.service.ts
│       └── chat.service.ts
├── app/
│   └── api/                # API routes
│       ├── auth/
│       ├── admin/
│       ├── dashboard/
│       ├── inventory/
│       ├── instruments/
│       ├── schedule/
│       ├── upload/
│       └── chat/
└── middleware.ts           # Next.js auth middleware
```

---

## API Reference

### Authentication

#### POST `/api/auth/login`
Login with username, password, and role.

**Request:**
```json
{
  "username": "admin",
  "password": "123",
  "role": "admin"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "full_name": "Administrator",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{ "error": "Username tidak ditemukan" }
{ "error": "Password salah" }
{ "error": "Role tidak sesuai" }
```

#### POST `/api/auth/logout`
Logout current user.

**Response (200):**
```json
{ "success": true }
```

#### GET `/api/auth/session`
Get current session info.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

---

### Admin (Admin only)

#### GET `/api/admin/users`
List all users.

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "admin",
      "fullName": "Administrator",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/users`
Create new user.

**Request:**
```json
{
  "username": "analyst1",
  "password": "password123",
  "fullName": "Analyst One",
  "role": "analyst"
}
```

**Response (201):**
```json
{ "user": { ... } }
```

#### PUT `/api/admin/users/[id]`
Update user.

**Request:**
```json
{
  "fullName": "Updated Name",
  "role": "manager"
}
```

#### DELETE `/api/admin/users/[id]`
Delete user.

**Response (200):**
```json
{ "success": true }
```

---

### Dashboard

#### GET `/api/dashboard`
Get dashboard statistics.

**Response (200):**
```json
{
  "reagentCount": 50,
  "standardCount": 25,
  "itemCount": 100,
  "instrumentCount": 20,
  "pendingOrderCount": 5,
  "upcomingCalibrations": 3,
  "recentLogs": [...]
}
```

---

### Inventory - Reagents

#### GET `/api/inventory/reagents`
List reagents with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name or CAS |
| status | string | Filter: active, low_stock, expired |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "reagents": [...],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### POST `/api/inventory/reagents`
Create reagent.

**Request:**
```json
{
  "name": "Acetone",
  "casNumber": "67-64-1",
  "brand": "Sigma-Aldrich",
  "packSize": "2.5L",
  "unit": "L",
  "minStock": 5,
  "hazardClass": "Flammable"
}
```

#### PUT `/api/inventory/reagents/[id]`
Update reagent.

#### DELETE `/api/inventory/reagents/[id]`
Delete reagent.

---

### Inventory - Standards

#### GET `/api/inventory/standards`
List standards with optional filters.

#### POST `/api/inventory/standards`
Create standard.

**Request:**
```json
{
  "name": "Certified Reference Material",
  "catalogNumber": "CRM-001",
  "concentration": "1000 ppm",
  "matrixType": "Aqueous",
  "expiryDate": "2025-12-31"
}
```

---

### Inventory - Items

#### GET `/api/inventory/items`
List consumable items.

#### POST `/api/inventory/items`
Create item.

**Request:**
```json
{
  "name": "Disposable Pipette Tips",
  "category": "Consumables",
  "unit": "box",
  "minStock": 10
}
```

---

### Inventory - Orders

#### GET `/api/inventory/orders`
List orders.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, approved, rejected |

#### POST `/api/inventory/orders`
Create order.

**Request:**
```json
{
  "title": "Monthly Reagent Order",
  "notes": "Urgent needed",
  "items": [
    { "reagentId": "uuid", "quantity": 5 }
  ]
}
```

#### POST `/api/inventory/orders/[id]/approve`
Approve order (Manager/Admin only).

**Request:**
```json
{
  "approved": true,
  "notes": "Approved for procurement"
}
```

---

### Inventory - Training Sets

#### GET `/api/inventory/training`
List training sets.

#### GET `/api/inventory/training/[id]`
Get training set details.

#### POST `/api/inventory/training`
Create training set.

---

### Inventory - Usage Logs

#### GET `/api/inventory/usage-logs`
List usage logs.

#### POST `/api/inventory/usage-logs`
Create usage log.

---

### Inventory - Warehouse

#### GET `/api/inventory/warehouse-chemicals`
List warehouse chemicals.

#### GET `/api/inventory/warehouse-items`
List warehouse items.

---

### Instruments

#### GET `/api/instruments`
List instruments.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | terkalibrasi, jadwal_mendatang, lewat_jatuh_tempo, dalam_perbaikan |
| search | string | Search by name or ID |

**Response (200):**
```json
{
  "instruments": [
    {
      "id": "uuid",
      "name": "HPLC System",
      "instrumentId": "INS-001",
      "status": "terkalibrasi",
      "lastCalibrationDate": "2024-01-01",
      "nextCalibrationDate": "2025-01-01"
    }
  ]
}
```

#### GET `/api/instruments/[id]`
Get instrument details.

#### POST `/api/instruments`
Create instrument.

#### PUT `/api/instruments/[id]`
Update instrument.

#### DELETE `/api/instruments/[id]`
Delete instrument.

---

### Calibration Logs

#### GET `/api/instruments/calibration`
List calibration logs.

#### POST `/api/instruments/calibration`
Create calibration log.

**Request:**
```json
{
  "instrumentId": "uuid",
  "performedDate": "2024-01-15",
  "performedBy": "Technician Name",
  "result": "pass",
  "notes": "All parameters within spec"
}
```

---

### Maintenance Logs

#### GET `/api/instruments/maintenance`
List maintenance logs.

#### POST `/api/instruments/maintenance`
Create maintenance log.

---

### Schedule

#### GET `/api/schedule`
Get calendar events.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| generateAll | boolean | Include auto-generated events |
| month | number | Filter by month (1-12) |
| year | number | Filter by year |

---

### Chat

#### POST `/api/chat`
Send message to AI assistant.

**Request:**
```json
{
  "message": "What reagents are low on stock?",
  "sessionId": "optional-session-id"
}
```

**Response (200):**
```json
{
  "response": "Based on current inventory...",
  "sessionId": "session-uuid"
}
```

---

### File Upload

#### GET `/api/upload?action=buckets`
List available storage buckets.

**Response (200):**
```json
{
  "buckets": [
    { "name": "images", "config": { "maxSize": 5242880, "allowedTypes": [...] } },
    { "name": "documents", "config": { ... } },
    { "name": "calibration-reports", "config": { ... } },
    { "name": "maintenance-photos", "config": { ... } }
  ]
}
```

#### POST `/api/upload`
Upload file.

**Request (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | File | File to upload |
| bucket | string | Target bucket name |
| folder | string | Optional folder path |

**Response (200):**
```json
{
  "success": true,
  "path": "instruments/uuid/filename.jpg",
  "publicUrl": "https://....supabase.co/storage/v1/object/public/..."
}
```

#### DELETE `/api/upload?bucket=images&path=instruments/uuid/filename.jpg`
Delete file.

---

## Database Schema

### Users
- `profiles` - User profiles linked to Supabase Auth

### Inventory
- `reagent_catalog` - Reagent master data
- `standard_catalog` - Standard master data
- `items_catalog` - Items/Consumables master data
- `warehouse_chemicals` - Individual chemical stock items
- `warehouse_items` - Individual item stock
- `orders` - Purchase orders
- `order_items` - Order line items
- `usage_logs` - Usage tracking
- `training_sets` - Training set configurations
- `training_set_items` - Training set components

### Instruments
- `instruments` - Instrument master data
- `calibration_logs` - Calibration history
- `maintenance_logs` - Maintenance history
- `schedule_events` - Calendar events

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| **Admin** | Full access + User management |
| **Manager** | CRUD all data + Approve orders |
| **Analyst** | CRUD all data (no approval) |

---

## Error Responses

All API errors follow this format:

```json
{
  "error": "Error message in Indonesian"
}
```

**Common Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / not logged in |
| 403 | Forbidden / insufficient permissions |
| 404 | Resource not found |
| 500 | Server error |

---

## Vercel Deployment

### Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel`
- Supabase production project ready

### Step 1: Initialize Vercel Project

```bash
vercel login
vercel
```

### Step 2: Set Environment Variables

In Vercel Dashboard > Project > Settings > Environment Variables:

**Production:**
| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Prod > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Prod > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Prod > Settings > API |
| `DATABASE_URL` | Supabase Prod > Settings > Database |
| `N8N_WEBHOOK_URL` | Your n8n webhook |

### Step 3: Deploy

```bash
vercel --prod
```

### Branch Configuration
- `main` branch → Production
- `develop` branch → Preview/Development

---

## Troubleshooting

### "Username tidak ditemukan"
- Ensure user exists in `profiles` table
- Check username spelling

### "Role tidak sesuai"
- User must login with their assigned role
- Check `role` column in `profiles` table

### Database connection error
- Verify `DATABASE_URL` is correct
- Check if Supabase project is active

### Chat not responding
- Verify `N8N_WEBHOOK_URL` is accessible
- Check n8n workflow is active

### File upload failed
- Check bucket name is valid
- Verify file type is allowed for bucket
- Ensure file size within limit

---

## Related Documentation

- [RLS Policies](./RLS.md) - Row Level Security documentation

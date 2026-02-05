// ============================================
// INVENTORY TYPES
// ============================================

// Status Types
export type StockStatus = "available" | "low_stock" | "out_of_stock" | "expired"
export type ItemForm = "solid" | "liquid" | "gas"
export type StorageLocation = "TC 1" | "TC 2" | "TC 3"
export type StockUnit = "unit" | "pack" | "pcs" | "set" | "roll"
export type ItemCategory = "barang" | "consumable"
export type WarehouseItemStatus = "tersedia" | "sedang_digunakan" | "habis"

// Reagent Catalog
export interface ReagentCatalog {
    id: string
    reagentName: string
    casNumber: string
    supplier: string
    storageLocation: StorageLocation
    form: ItemForm
    msdsDocument?: string
    productPhoto?: string
    stock: number
    minimumStockLevel: number
    status: StockStatus
    orderId?: string
    nearestExpDate?: Date
    nextOrderNeeded?: Date
    lastOrderedDate?: Date
    orderStatus?: string
}

// Standard Stock Catalog
export interface StandardStockCatalog {
    id: string
    standardName: string
    casNumber: string
    chemicalFormula?: string
    supplier: string
    stock: number
    minimumStockLevel: number
    status: StockStatus
    sizeValue: number
    sizeUnit: string
    form: ItemForm
    storageLocation: StorageLocation
    msdsDocument?: string
    photo?: string
    daysUntilExpiry?: number
    nearestExpDate?: Date
    orderId?: string
    nextOrderNeeded?: Date
    lastOrderDate?: Date
    orderStatus?: string
}

// Sample Catalog (QC Samples)
export interface SampleCatalog {
    id: string
    sampleName: string
    matrix: string | null
    storageLocation: StorageLocation
    form: ItemForm
    photo?: string | null
    minimumStockLevel: number
    currentStock?: number
    status?: StockStatus
    nearestExpDate?: Date | null
    createdAt?: Date
    updatedAt?: Date
}

// Items & Consumable Catalog
export interface ItemsCatalog {
    id: string
    name: string
    brand: string
    category: ItemCategory
    stockUnit: StockUnit
    minimumStockLevel: number
    location: string
    orderId?: string
    orderDate?: Date
    stockStatus: StockStatus
    nextOrderNeeded?: Date
    currentQuantity: number
}

// Warehouse - Chemicals (Reagents, Standards & Samples)
export interface WarehouseChemical {
    id: string
    catalogId: string
    catalogType: "reagent" | "standard" | "sample"
    name: string
    receivedDate: Date
    remainingAmount: number
    sizeValue: number
    sizeUnit: string
    unit: string
    expiredDate: Date
    isExpired: boolean
    daysUntilExpiry: number
    receivedBy: string
    orderDetailId?: string
    status: WarehouseItemStatus
}

// Warehouse - Items & Consumables
export interface WarehouseItem {
    id: string
    catalogId: string
    name: string
    specification?: string
    lotNo?: string
    category: ItemCategory
    currentQuantity: number
    unit: StockUnit
    receivedDate: Date
    receivedBy: string
    orderDetailId?: string
}

// Usage Logs
export interface UsageLog {
    id: string
    date: Date
    userName: string
    usageItem: string
    itemType: "barang" | "consumable" | "reagent" | "standard"
    quantityUsed: number
    notes?: string
}

// Orders
export type OrderStatus = "pending" | "approved" | "rejected" | "received" | "cancelled"

export interface OrderItem {
    id: string
    itemType: "reagent" | "standard" | "barang" | "consumable"
    itemId: string
    itemName: string
    quantity: number
    unit: string
}

export interface Order {
    id: string
    orderNumber: string
    orderDate: Date
    orderedBy: string
    status: OrderStatus
    items: OrderItem[]
    approvedBy?: string
    approvedDate?: Date
    notes?: string
}

// Training Usage
export interface TrainingUsageSet {
    id: string
    trainingName: string
    participantsPerSet: number
    equipment: { name: string; quantity: number }[]
    consumables: { name: string; quantity: number; unit: string }[]
    reagentsAndStandards: { name: string; quantity: number; unit: string }[]
}

// ============================================
// INSTRUMENT TYPES
// ============================================

export type InstrumentStatus = "terkalibrasi" | "jadwal_mendatang" | "lewat_jatuh_tempo" | "dalam_perbaikan"
export type CalibrationStatus = "sudah_dijadwalkan" | "belum_dijadwalkan"
export type AssetType = "instrumen" | "peralatan"
export type MaintenanceType = "corrective" | "preventive" | "inspection"
export type MaintenanceStatus = "completed" | "scheduled" | "pending"

// Instrument Database
export interface Instrument {
    id: string
    name: string
    brand: string
    model: string
    calibrationVendor: string
    calibrationInterval: number // in months
    lastCalibrationDate: Date
    nextCalibrationDate: Date
    daysUntilDue: number
    pic: string
    status: InstrumentStatus
    scheduleStatus: CalibrationStatus
    assetType: AssetType
    location: StorageLocation
    photo?: string
}

// Calibration Log
export interface CalibrationLog {
    id: string
    performedDate: Date
    instrumentId: string
    instrumentName: string
    calibratorName: string
    calibratorPhone: string
    jobReportDocument?: string
    notes?: string
    assetType: AssetType
}

// Maintenance Log
export interface MaintenanceLog {
    id: string
    performedBy: string
    instrumentId: string
    instrumentName: string
    instrumentLocation: StorageLocation
    maintenanceType: MaintenanceType
    issueDescription: string
    maintenanceActions: string
    maintenancePhoto?: string
    maintenanceDate: Date
    status: MaintenanceStatus
    daysSinceLast?: number
}

// ============================================
// USER TYPES
// ============================================

export type UserRole = "manager" | "analyst"

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

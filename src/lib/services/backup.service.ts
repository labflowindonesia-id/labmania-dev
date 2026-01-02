import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import AdmZip from 'adm-zip';
import { format } from 'date-fns';

/**
 * Convert an array of objects to CSV format
 */
function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create header row
    const headerRow = headers.map(h => `"${h}"`).join(',');

    // Create data rows
    const dataRows = data.map(row => {
        return headers.map(h => {
            const value = row[h];
            if (value === null || value === undefined) {
                return '""';
            }
            if (typeof value === 'object') {
                // Stringify objects and arrays
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}

export interface BackupResult {
    buffer: Buffer;
    filename: string;
}

export interface TableBackupResult {
    tableName: string;
    success: boolean;
    rowCount?: number;
    error?: string;
}

class BackupService {
    /**
     * Generate a ZIP file containing CSV exports of all key database tables
     */
    async generateBackupZip(): Promise<{ backup: BackupResult; results: TableBackupResult[] }> {
        const zip = new AdmZip();
        const results: TableBackupResult[] = [];
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const filename = `labmania_backup_${dateStr}.zip`;

        // Define tables to backup
        const tablesToBackup = [
            { name: 'profiles', query: () => db.select().from(schema.profiles) },
            { name: 'instruments', query: () => db.select().from(schema.instruments) },
            { name: 'calibration_logs', query: () => db.select().from(schema.calibrationLogs) },
            { name: 'maintenance_logs', query: () => db.select().from(schema.maintenanceLogs) },
            { name: 'reagent_catalog', query: () => db.select().from(schema.reagentCatalog) },
            { name: 'standard_catalog', query: () => db.select().from(schema.standardCatalog) },
            { name: 'items_catalog', query: () => db.select().from(schema.itemsCatalog) },
            { name: 'warehouse_chemicals', query: () => db.select().from(schema.warehouseChemicals) },
            { name: 'warehouse_items', query: () => db.select().from(schema.warehouseItems) },
            { name: 'orders', query: () => db.select().from(schema.orders) },
            { name: 'order_items', query: () => db.select().from(schema.orderItems) },
            { name: 'usage_logs', query: () => db.select().from(schema.usageLogs) },
            { name: 'training_sets', query: () => db.select().from(schema.trainingSets) },
            { name: 'training_set_items', query: () => db.select().from(schema.trainingSetItems) },
        ];

        // Process each table
        for (const table of tablesToBackup) {
            try {
                const data = await table.query();

                if (data.length === 0) {
                    // Add empty CSV with just headers if no data
                    const emptyContent = `No data in ${table.name} table\n`;
                    zip.addFile(`${table.name}.csv`, Buffer.from(emptyContent, 'utf-8'));
                    results.push({
                        tableName: table.name,
                        success: true,
                        rowCount: 0,
                    });
                } else {
                    // Convert to CSV using custom function
                    const csv = convertToCSV(data as Record<string, unknown>[]);
                    zip.addFile(`${table.name}.csv`, Buffer.from(csv, 'utf-8'));
                    results.push({
                        tableName: table.name,
                        success: true,
                        rowCount: data.length,
                    });
                }
            } catch (error) {
                console.error(`Error backing up table ${table.name}:`, error);
                results.push({
                    tableName: table.name,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Add backup metadata
        const metadata = {
            generatedAt: new Date().toISOString(),
            tables: results,
            totalTables: tablesToBackup.length,
            successfulBackups: results.filter(r => r.success).length,
        };
        zip.addFile('_backup_metadata.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'));

        // Generate ZIP buffer
        const buffer = zip.toBuffer();

        return {
            backup: { buffer, filename },
            results,
        };
    }

    /**
     * Get backup summary without generating the full backup
     */
    async getBackupSummary(): Promise<{
        tableCount: number;
        tables: string[];
    }> {
        const tables = [
            'profiles',
            'instruments',
            'calibration_logs',
            'maintenance_logs',
            'reagent_catalog',
            'standard_catalog',
            'items_catalog',
            'warehouse_chemicals',
            'warehouse_items',
            'orders',
            'order_items',
            'usage_logs',
            'training_sets',
            'training_set_items',
        ];

        return {
            tableCount: tables.length,
            tables,
        };
    }
}

export const backupService = new BackupService();

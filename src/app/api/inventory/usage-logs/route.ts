import { NextRequest, NextResponse } from 'next/server';
import { usageLogService } from '@/lib/services';
import { warehouseChemicalService } from '@/lib/services/warehouse-chemical.service';
import { warehouseItemService } from '@/lib/services/warehouse-item.service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            search: searchParams.get('search') || undefined,
            itemType: searchParams.get('itemType') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        };

        const result = await usageLogService.getAll(filters);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Usage logs GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data usage logs' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.date || !body.userId || !body.usageItem || !body.itemType || !body.quantityUsed) {
            return NextResponse.json(
                { error: 'Tanggal, user, item, tipe item, dan jumlah wajib diisi' },
                { status: 400 }
            );
        }

        // Validate that quantityUsed is positive
        const quantityUsed = parseFloat(body.quantityUsed);
        if (quantityUsed <= 0) {
            return NextResponse.json(
                { error: 'Jumlah penggunaan harus lebih dari 0' },
                { status: 400 }
            );
        }

        // Reduce stock from warehouse based on item type
        // Also capture cost data for reporting
        let unitCost: string | null = null;
        let totalCost: string | null = null;
        let warehouseType: string | null = null;

        if (body.warehouseItemId && body.quantityUsed) {

            if (body.itemType === 'reagent' || body.itemType === 'standard' || body.itemType === 'sample') {
                // Reduce stock from warehouse chemicals (reagent/standard/sample)
                const chemical = await warehouseChemicalService.getById(body.warehouseItemId);
                if (chemical) {
                    const currentAmount = parseFloat(chemical.remainingAmount);
                    const newAmount = Math.max(0, currentAmount - quantityUsed);

                    // Update remaining amount and status
                    const newStatus = newAmount <= 0 ? 'habis' : 'tersedia';
                    await warehouseChemicalService.update(body.warehouseItemId, {
                        remainingAmount: newAmount.toString(),
                        status: newStatus,
                    });

                    // Calculate cost from unitCostBase (price per mL/g)
                    if (chemical.unitCostBase) {
                        unitCost = chemical.unitCostBase;
                        const cost = quantityUsed * parseFloat(chemical.unitCostBase);
                        totalCost = cost.toFixed(2);
                    }
                    warehouseType = 'chemical';
                }
            } else if (body.itemType === 'consumable') {
                // Reduce stock from warehouse items
                const item = await warehouseItemService.getById(body.warehouseItemId);
                if (item) {
                    const currentQuantity = item.currentQuantity;
                    const newQuantity = Math.max(0, currentQuantity - quantityUsed);

                    await warehouseItemService.update(body.warehouseItemId, {
                        currentQuantity: newQuantity,
                    });

                    // Calculate cost from unitCost (price per pcs)
                    if (item.unitCost) {
                        unitCost = item.unitCost;
                        const cost = quantityUsed * parseFloat(item.unitCost);
                        totalCost = cost.toFixed(2);
                    }
                    warehouseType = 'item';
                }
            }
        }

        const usageLog = await usageLogService.create({
            date: body.date,
            userId: body.userId,
            usageItem: body.usageItem,
            itemType: body.itemType,
            quantityUsed: body.quantityUsed,
            unit: body.unit || null,
            unitCost: unitCost,
            totalCost: totalCost,
            warehouseItemId: body.warehouseItemId || null,
            warehouseType: warehouseType,
            notes: body.notes || null,
        });

        return NextResponse.json({ usageLog }, { status: 201 });
    } catch (error) {
        console.error('Usage logs POST error:', error);
        return NextResponse.json(
            { error: 'Gagal membuat usage log baru' },
            { status: 500 }
        );
    }
}


import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const maintenanceType = searchParams.get('maintenanceType') || '';

        const logs = await db.query.maintenanceLogs.findMany({
            orderBy: desc(schema.maintenanceLogs.maintenanceDate),
            with: {
                instrument: true,
                performedByUser: true,
            },
        });

        // Transform to include instrument name and performer name
        let logsWithDetails = logs.map(log => ({
            ...log,
            instrumentName: log.instrument?.name || 'Unknown',
            instrumentLocation: log.instrument?.location || 'Unknown',
            performedByName: log.performedByUser?.fullName || 'Unknown',
        }));

        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            logsWithDetails = logsWithDetails.filter(log =>
                log.instrumentName.toLowerCase().includes(searchLower)
            );
        }

        if (status && status !== 'all') {
            logsWithDetails = logsWithDetails.filter(log => log.status === status);
        }

        if (maintenanceType && maintenanceType !== 'all') {
            logsWithDetails = logsWithDetails.filter(log => log.maintenanceType === maintenanceType);
        }

        // Calculate pagination
        const total = logsWithDetails.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedLogs = logsWithDetails.slice(offset, offset + limit);

        return NextResponse.json({
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error('Get maintenance logs API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!body.instrumentId || !body.maintenanceType) {
            return NextResponse.json(
                { error: 'Instrument ID dan tipe maintenance harus diisi' },
                { status: 400 }
            );
        }

        const [log] = await db.insert(schema.maintenanceLogs).values({
            instrumentId: body.instrumentId,
            maintenanceType: body.maintenanceType,
            maintenanceDate: body.maintenanceDate || new Date().toISOString().split('T')[0],
            performedBy: user.id, // Use current user's ID
            issueDescription: body.issueDescription || null,
            maintenanceActions: body.maintenanceActions || null,
            status: body.status || 'pending',
        }).returning();

        return NextResponse.json({ log }, { status: 201 });
    } catch (error) {
        console.error('Create maintenance log API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { scheduleService } from '@/lib/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const generateAll = searchParams.get('generateAll') === 'true';

        let events;

        if (generateAll) {
            // Generate all events including instrument calibrations and expiring chemicals
            events = await scheduleService.generateCalendarEvents();
        } else if (startDate && endDate) {
            events = await scheduleService.getByDateRange(startDate, endDate);
        } else {
            events = await scheduleService.getAll();
        }

        return NextResponse.json({ events });
    } catch (error) {
        console.error('Get schedule API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title || !body.date || !body.type) {
            return NextResponse.json(
                { error: 'Judul, tanggal, dan tipe harus diisi' },
                { status: 400 }
            );
        }

        const event = await scheduleService.create(body);
        return NextResponse.json({ event }, { status: 201 });
    } catch (error) {
        console.error('Create schedule API error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}

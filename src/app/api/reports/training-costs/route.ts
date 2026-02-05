import { NextRequest, NextResponse } from 'next/server';
import { costService } from '@/lib/services';

/**
 * GET /api/reports/training-costs
 * Get training cost reports with stats, trends, and paginated logs
 * Now includes manual usage logs with costs
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const view = searchParams.get('view') || 'all'; // 'stats' | 'trends' | 'logs' | 'usageLogs' | 'all'

        const response: {
            stats?: Awaited<ReturnType<typeof costService.getTrainingCostStats>>;
            trends?: Awaited<ReturnType<typeof costService.getTrainingCostTrends>>;
            logs?: Awaited<ReturnType<typeof costService.getTrainingCostLogs>>;
            usageLogs?: Awaited<ReturnType<typeof costService.getUsageCostLogs>>;
        } = {};

        // Get stats (already includes both training + usage logs)
        if (view === 'all' || view === 'stats') {
            response.stats = await costService.getTrainingCostStats();
        }

        // Get trends (already includes both training + usage logs)
        if (view === 'all' || view === 'trends') {
            const months = parseInt(searchParams.get('months') || '6');
            response.trends = await costService.getTrainingCostTrends(months);
        }

        // Get paginated training logs
        if (view === 'all' || view === 'logs') {
            const filters = {
                startDate: searchParams.get('startDate') || undefined,
                endDate: searchParams.get('endDate') || undefined,
                trainingSetId: searchParams.get('trainingSetId') || undefined,
                page: parseInt(searchParams.get('page') || '1'),
                limit: parseInt(searchParams.get('limit') || '8'),
            };
            response.logs = await costService.getTrainingCostLogs(filters);
        }

        // Get paginated usage logs with costs
        if (view === 'all' || view === 'usageLogs') {
            const filters = {
                startDate: searchParams.get('startDate') || undefined,
                endDate: searchParams.get('endDate') || undefined,
                page: parseInt(searchParams.get('usageLogsPage') || '1'),
                limit: parseInt(searchParams.get('usageLogsLimit') || '8'),
            };
            response.usageLogs = await costService.getUsageCostLogs(filters);
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error('Training cost reports GET error:', error);
        return NextResponse.json(
            { error: 'Gagal mengambil data laporan biaya training' },
            { status: 500 }
        );
    }
}

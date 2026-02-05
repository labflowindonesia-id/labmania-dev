import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    const results: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        tests: {},
    };

    // Test 1: Raw SQL query
    try {
        console.log('[Debug] Testing raw SQL...');
        const rawResult = await db.execute(sql`SELECT 1 as test`);
        results.tests = { ...results.tests as object, rawSql: { success: true, data: rawResult } };
        console.log('[Debug] Raw SQL success:', rawResult);
    } catch (error) {
        const err = error as Error & { code?: string; cause?: unknown };
        console.error('[Debug] Raw SQL error:', err);
        results.tests = {
            ...results.tests as object, rawSql: {
                success: false,
                message: err.message,
                code: err.code,
                cause: String(err.cause),
                stack: err.stack?.split('\n').slice(0, 5),
                fullError: JSON.stringify(err, Object.getOwnPropertyNames(err))
            }
        };
    }

    // Test 2: Simple count from warehouse_chemicals
    try {
        console.log('[Debug] Testing warehouse_chemicals count...');
        const count = await db.select({ count: sql<number>`count(*)` }).from(schema.warehouseChemicals);
        results.tests = { ...results.tests as object, chemicalsCount: { success: true, count: count[0]?.count } };
        console.log('[Debug] Chemicals count success:', count);
    } catch (error) {
        const err = error as Error & { code?: string; cause?: unknown };
        console.error('[Debug] Chemicals count error:', err);
        results.tests = {
            ...results.tests as object, chemicalsCount: {
                success: false,
                message: err.message,
                code: err.code,
                cause: String(err.cause),
            }
        };
    }

    // Test 3: Simple select from instruments
    try {
        console.log('[Debug] Testing instruments select...');
        const instruments = await db.select({ id: schema.instruments.id }).from(schema.instruments).limit(1);
        results.tests = { ...results.tests as object, instrumentsSelect: { success: true, data: instruments } };
        console.log('[Debug] Instruments select success:', instruments);
    } catch (error) {
        const err = error as Error & { code?: string; cause?: unknown };
        console.error('[Debug] Instruments select error:', err);
        results.tests = {
            ...results.tests as object, instrumentsSelect: {
                success: false,
                message: err.message,
                code: err.code,
            }
        };
    }

    // Test 4: Check if we can access Supabase directly
    try {
        console.log('[Debug] Testing Supabase client...');
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data, error } = await supabase.from('instruments').select('id').limit(1);
        if (error) throw error;
        results.tests = { ...results.tests as object, supabaseClient: { success: true, data } };
        console.log('[Debug] Supabase client success:', data);
    } catch (error) {
        const err = error as Error;
        console.error('[Debug] Supabase client error:', err);
        results.tests = {
            ...results.tests as object, supabaseClient: {
                success: false,
                message: err.message,
            }
        };
    }

    return NextResponse.json(results, { status: 200 });
}

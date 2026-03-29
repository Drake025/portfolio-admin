import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';

export async function POST() {
    let pool;
    try {
        pool = createPool();
    } catch (e) {
        return NextResponse.json({ error: 'Database connection failed: ' + e.message }, { status: 500 });
    }

    const results = [];
    const migrations = [
        `ALTER TABLE sites ADD COLUMN IF NOT EXISTS github_url TEXT`,
        `ALTER TABLE sites ADD COLUMN IF NOT EXISTS screenshot_url TEXT`,
        `ALTER TABLE sites ADD COLUMN IF NOT EXISTS tech_stack TEXT DEFAULT ''`,
        `ALTER TABLE sites ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`,
    ];

    for (const query of migrations) {
        const colName = query.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        try {
            await pool.query(query);
            results.push({ column: colName, status: 'added' });
        } catch (e) {
            if (e.message?.includes('already exists')) {
                results.push({ column: colName, status: 'exists' });
            } else {
                results.push({ column: colName, status: 'error', error: e.message });
            }
        }
    }

    try { await pool.end(); } catch {}
    return NextResponse.json({ results });
}

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
    const results = [];

    const migrations = [
        { name: 'github_url', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS github_url TEXT` },
        { name: 'screenshot_url', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS screenshot_url TEXT` },
        { name: 'tech_stack', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS tech_stack TEXT DEFAULT ''` },
        { name: 'featured', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false` },
        { name: 'demo_url', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS demo_url TEXT` },
        { name: 'tags', query: `ALTER TABLE sites ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT ''` },
    ];

    for (const m of migrations) {
        try {
            await sql.query(m.query);
            results.push({ column: m.name, status: 'ok' });
        } catch (e) {
            results.push({ column: m.name, status: 'error', error: e.message });
        }
    }

    return NextResponse.json({ results });
}

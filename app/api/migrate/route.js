import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function POST() {
    const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connStr) return NextResponse.json({ error: 'No database connection string found' }, { status: 500 });

    const pool = new Pool({ connectionString: connStr });
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
            await pool.query(m.query);
            results.push({ column: m.name, status: 'added' });
        } catch (e) {
            if (e.message.includes('already exists')) {
                results.push({ column: m.name, status: 'exists' });
            } else {
                results.push({ column: m.name, status: 'error', error: e.message });
            }
        }
    }

    await pool.end();
    return NextResponse.json({ results });
}

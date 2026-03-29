import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/sites/[id]/versions
export async function GET(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;
    const { id } = await params;
    try {
        const r = await sql`SELECT * FROM versions WHERE site_id=${id} ORDER BY version_number DESC`;
        return NextResponse.json({ versions: r.rows });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/logs — recent logs across all sites
export async function GET(request) {
    const { error } = requireAuth(request);
    if (error) return error;
    try {
        const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');
        const r = await sql`
            SELECT bl.*, s.name as site_name, s.slug as site_slug
            FROM build_logs bl LEFT JOIN sites s ON bl.site_id=s.id
            ORDER BY bl.created_at DESC LIMIT ${limit}
        `;
        return NextResponse.json({ logs: r.rows });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { addLog } from '@/lib/logs';

// POST /api/sites/[id]/rollback/[versionId]
export async function POST(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { id: siteId, versionId } = await params;

    try {
        const sr = await sql`SELECT * FROM sites WHERE id=${siteId}`;
        if (!sr.rows.length) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

        const vr = await sql`SELECT * FROM versions WHERE id=${versionId} AND site_id=${siteId}`;
        if (!vr.rows.length) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        const ver = vr.rows[0];

        await sql`UPDATE versions SET status='ready' WHERE site_id=${siteId} AND status='deployed'`;
        await sql`UPDATE versions SET status='deployed' WHERE id=${versionId}`;
        await sql`UPDATE sites SET current_version=${ver.version_number},storage_prefix=${ver.storage_prefix},live_url=COALESCE(${ver.deploy_url},live_url),updated_at=CURRENT_TIMESTAMP WHERE id=${siteId}`;

        await addLog(parseInt(siteId), parseInt(versionId), 'rollback', 'info', `Rolled back to v${ver.version_number}${ver.label ? ` (${ver.label})` : ''}`);

        return NextResponse.json({ message: `Rolled back to version ${ver.version_number}`, version: ver.version_number });
    } catch (e) {
        console.error('Rollback error:', e);
        return NextResponse.json({ error: 'Rollback failed' }, { status: 500 });
    }
}

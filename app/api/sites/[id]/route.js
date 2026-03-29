import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;
    const { id } = await params;
    try {
        const s = await sql`SELECT * FROM sites WHERE id=${id}`;
        if (!s.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const v = await sql`SELECT * FROM versions WHERE site_id=${id} ORDER BY version_number DESC`;
        const l = await sql`SELECT * FROM build_logs WHERE site_id=${id} ORDER BY created_at DESC LIMIT 100`;
        const d = await sql`SELECT * FROM deploy_history WHERE site_id=${id} ORDER BY started_at DESC`;
        return NextResponse.json({ site: s.rows[0], versions: v.rows, logs: l.rows, deploys: d.rows });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

export async function PATCH(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;
    const { id } = await params;
    try {
        const b = await request.json();
        if (b.name) await sql`UPDATE sites SET name=${b.name},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.description !== undefined) await sql`UPDATE sites SET description=${b.description},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.deploy_provider) await sql`UPDATE sites SET deploy_provider=${b.deploy_provider},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.deploy_site_id) await sql`UPDATE sites SET deploy_site_id=${b.deploy_site_id},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.github_url !== undefined) await sql`UPDATE sites SET github_url=${b.github_url},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.screenshot_url !== undefined) await sql`UPDATE sites SET screenshot_url=${b.screenshot_url},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.tech_stack !== undefined) await sql`UPDATE sites SET tech_stack=${b.tech_stack},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.featured !== undefined) await sql`UPDATE sites SET featured=${b.featured},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.live_url !== undefined) await sql`UPDATE sites SET live_url=${b.live_url},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        if (b.status) await sql`UPDATE sites SET status=${b.status},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        return NextResponse.json({ message: 'Updated' });
    } catch { return NextResponse.json({ error: 'Update failed' }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;
    const { id } = await params;
    try {
        const s = await sql`SELECT * FROM sites WHERE id=${id}`;
        if (!s.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const site = s.rows[0];
        const { deletePrefix } = await import('@/lib/storage');
        const { addLog } = await import('@/lib/logs');
        try { await deletePrefix(`sites/${site.slug}/`); } catch {}
        await sql`DELETE FROM sites WHERE id=${id}`;
        await addLog(parseInt(id), null, 'delete', 'info', `Site "${site.name}" deleted`);
        return NextResponse.json({ message: 'Deleted' });
    } catch { return NextResponse.json({ error: 'Delete failed' }, { status: 500 }); }
}

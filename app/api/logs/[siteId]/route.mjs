import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.mjs';
import { requireAuth } from '@/lib/auth.mjs';
import { subscribe } from '@/lib/logs.mjs';

export const maxDuration = 300;

// GET /api/logs/[siteId]?stream=true for SSE, else JSON
export async function GET(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { siteId } = await params;
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get('stream') === 'true';
    const limit = parseInt(searchParams.get('limit') || '200');
    const level = searchParams.get('level');

    if (stream) {
        const encoder = new TextEncoder();
        let unsub = null;

        const readable = new ReadableStream({
            start(controller) {
                (async () => {
                    try {
                        const r = level
                            ? await sql`SELECT * FROM build_logs WHERE site_id=${siteId} AND level=${level} ORDER BY created_at DESC LIMIT ${limit}`
                            : await sql`SELECT * FROM build_logs WHERE site_id=${siteId} ORDER BY created_at DESC LIMIT ${limit}`;
                        for (const log of r.rows.reverse()) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...log, created_at: log.created_at instanceof Date ? log.created_at.toISOString() : log.created_at })}\n\n`));
                        }
                        unsub = subscribe(parseInt(siteId), (log) => {
                            try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`)); } catch {}
                        });
                    } catch (e) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
                    }
                })();

                const ka = setInterval(() => { try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch { clearInterval(ka); } }, 30000);
                setTimeout(() => { clearInterval(ka); if (unsub) unsub(); try { controller.close(); } catch {} }, 290000);
            },
            cancel() { if (unsub) unsub(); },
        });

        return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
    }

    try {
        const r = level
            ? await sql`SELECT * FROM build_logs WHERE site_id=${siteId} AND level=${level} ORDER BY created_at DESC LIMIT ${limit}`
            : await sql`SELECT * FROM build_logs WHERE site_id=${siteId} ORDER BY created_at DESC LIMIT ${limit}`;
        return NextResponse.json({ logs: r.rows });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

// DELETE /api/logs/[siteId] — clear logs
export async function DELETE(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;
    const { siteId } = await params;
    try {
        await sql`DELETE FROM build_logs WHERE site_id=${siteId}`;
        return NextResponse.json({ message: 'Logs cleared' });
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

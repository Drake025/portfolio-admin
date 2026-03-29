import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// List all sites (admin) or all live sites (public)
export async function GET(request) {
    const url = new URL(request.url);
    const publicOnly = url.searchParams.get('public') === 'true';

    if (!publicOnly) {
        const { error } = requireAuth(request);
        if (error) return error;
    }

    try {
        const r = publicOnly
            ? await sql`SELECT id,name,slug,description,live_url,github_url,screenshot_url,tech_stack,featured,status,current_version,updated_at FROM sites WHERE status='live' ORDER BY featured DESC, updated_at DESC`
            : await sql`SELECT * FROM sites ORDER BY updated_at DESC`;
        return NextResponse.json({ sites: r.rows });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

// Create site from git URL
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;
    try {
        const { name, description, gitUrl } = await request.json();
        if (!name || !gitUrl) return NextResponse.json({ error: 'Name and Git URL required' }, { status: 400 });
        const { slugify } = await import('@/lib/utils');
        const { addLog } = await import('@/lib/logs');
        const slug = slugify(name) + '-' + Date.now();
        const prefix = `sites/${slug}/v1`;
        await sql`INSERT INTO sites (name,slug,description,source_type,git_url,storage_prefix) VALUES (${name},${slug},${description||''},'git',${gitUrl},${prefix})`;
        const site = (await sql`SELECT * FROM sites WHERE slug=${slug}`).rows[0];
        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${site.id},1,'Initial (Git)',${prefix})`;
        await addLog(site.id, null, 'create', 'info', `Site "${name}" created from Git`);
        return NextResponse.json({ message: 'Site created', site: { id: site.id, name, slug } }, { status: 201 });
    } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

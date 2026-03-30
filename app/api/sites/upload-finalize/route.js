import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { addLog } from '@/lib/logs';
import { slugify } from '@/lib/utils';

// POST /api/sites/upload-finalize — finalize chunked upload and create site
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const { name, description, prefix, fileCount, label, githubUrl, techStack } = await request.json();

        if (!name || !prefix || !fileCount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const slug = slugify(name) + '-' + Date.now();
        // The uploaded files are at: portfolio/{prefix}/...
        // We need to move them to: portfolio/sites/{slug}/v1/...
        // Since blob storage doesn't support rename, we keep the original prefix
        // and just record the slug in the DB. The prefix already contains a unique timestamp.
        const storagePrefix = prefix;

        const r = await sql`INSERT INTO sites (name,slug,description,source_type,storage_prefix,github_url,tech_stack) VALUES (${name},${slug},${description||''},'upload',${storagePrefix},${githubUrl||''},${techStack||''}) RETURNING *`;
        const site = r.rows[0];
        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${site.id},1,${label||'Initial upload'},${storagePrefix})`;
        await addLog(site.id, null, 'upload', 'info', `Site "${name}" created with ${fileCount} files (chunked upload)`);

        return NextResponse.json({
            message: `Site created with ${fileCount} files`,
            site: { id: site.id, name, slug, status: 'draft' }
        }, { status: 201 });
    } catch (e) {
        console.error('Finalize error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

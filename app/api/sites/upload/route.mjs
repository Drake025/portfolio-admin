import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.mjs';
import { requireAuth } from '@/lib/auth.mjs';
import { uploadFile } from '@/lib/storage.mjs';
import { addLog } from '@/lib/logs.mjs';
import { slugify, getContentType } from '@/lib/utils.mjs';
import AdmZip from 'adm-zip';

export const maxDuration = 120;

// POST /api/sites/upload — create new site from ZIP
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const name = formData.get('name');
        const description = formData.get('description');
        const label = formData.get('label');

        if (!file || typeof file === 'string')
            return NextResponse.json({ error: 'No ZIP file' }, { status: 400 });
        if (!name)
            return NextResponse.json({ error: 'Site name required' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const slug = slugify(name) + '-' + Date.now();
        const prefix = `sites/${slug}/v1`;

        await addLog(null, null, 'upload', 'info', `ZIP received: ${file.name} (${(buffer.length/1024/1024).toFixed(1)}MB)`);

        const zip = new AdmZip(buffer);
        const entries = zip.getEntries().filter(e =>
            !e.isDirectory && !e.entryName.startsWith('__MACOSX') && !e.entryName.includes('.DS_Store')
        );

        await addLog(null, null, 'upload', 'info', `Extracting ${entries.length} files to storage...`);

        let count = 0;
        for (const entry of entries) {
            await uploadFile(`${prefix}/${entry.entryName}`, entry.getData(), getContentType(entry.entryName));
            count++;
        }

        const r = await sql`INSERT INTO sites (name,slug,description,source_type,storage_prefix) VALUES (${name},${slug},${description||''},'zip',${prefix}) RETURNING *`;
        const site = r.rows[0];
        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${site.id},1,${label||'Initial upload'},${prefix})`;
        await addLog(site.id, null, 'upload', 'info', `Site "${name}" created with ${count} files`);

        return NextResponse.json({
            message: 'Site created',
            site: { id: site.id, name, slug, status: 'draft' }
        }, { status: 201 });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.mjs';
import { requireAuth } from '@/lib/auth.mjs';
import { uploadFile } from '@/lib/storage.mjs';
import { addLog } from '@/lib/logs.mjs';
import { getContentType } from '@/lib/utils.mjs';
import AdmZip from 'adm-zip';

export const maxDuration = 120;

// POST /api/sites/[id]/upload — add new version to existing site
export async function POST(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { id } = await params;

    try {
        const sr = await sql`SELECT * FROM sites WHERE id=${id}`;
        if (!sr.rows.length) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        const site = sr.rows[0];

        const formData = await request.formData();
        const file = formData.get('file');
        const label = formData.get('label');

        if (!file || typeof file === 'string')
            return NextResponse.json({ error: 'No ZIP file' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const ver = site.current_version + 1;
        const prefix = `sites/${site.slug}/v${ver}`;

        const zip = new AdmZip(buffer);
        const entries = zip.getEntries().filter(e =>
            !e.isDirectory && !e.entryName.startsWith('__MACOSX') && !e.entryName.includes('.DS_Store')
        );

        let count = 0;
        for (const entry of entries) {
            await uploadFile(`${prefix}/${entry.entryName}`, entry.getData(), getContentType(entry.entryName));
            count++;
        }

        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${id},${ver},${label||`Version ${ver}`},${prefix})`;
        await sql`UPDATE sites SET current_version=${ver},storage_prefix=${prefix},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        await addLog(parseInt(id), null, 'version', 'info', `Version ${ver} uploaded (${count} files)`);

        return NextResponse.json({ message: 'Version created', version: ver }, { status: 201 });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

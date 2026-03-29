import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { addLog } from '@/lib/logs';
import { getContentType } from '@/lib/utils';
import AdmZip from 'adm-zip';

export const maxDuration = 300;

// POST /api/sites/[id]/upload — add new version (ZIP, files, or folder)
export async function POST(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { id } = await params;

    try {
        const sr = await sql`SELECT * FROM sites WHERE id=${id}`;
        if (!sr.rows.length) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        const site = sr.rows[0];

        const formData = await request.formData();
        const label = formData.get('label');

        const ver = site.current_version + 1;
        const prefix = `sites/${site.slug}/v${ver}`;
        let count = 0;

        const zipFile = formData.get('file');
        const individualFiles = formData.getAll('files');

        if (zipFile && typeof zipFile !== 'string' && zipFile.name.endsWith('.zip')) {
            const buffer = Buffer.from(await zipFile.arrayBuffer());
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries().filter(e =>
                !e.isDirectory && !e.entryName.startsWith('__MACOSX') && !e.entryName.includes('.DS_Store')
            );

            for (const entry of entries) {
                await uploadFile(`${prefix}/${entry.entryName}`, entry.getData(), getContentType(entry.entryName));
                count++;
            }

        } else if (individualFiles.length > 0 && typeof individualFiles[0] !== 'string') {
            for (const file of individualFiles) {
                if (!file || typeof file === 'string') continue;
                if (file.name === '.DS_Store' || file.name.includes('__MACOSX')) continue;

                const buffer = Buffer.from(await file.arrayBuffer());
                const filePath = file.webkitRelativePath || file.name;
                await uploadFile(`${prefix}/${filePath}`, buffer, getContentType(filePath));
                count++;
            }

        } else {
            return NextResponse.json({ error: 'No files provided. Upload a ZIP file or select files/folder.' }, { status: 400 });
        }

        if (count === 0) {
            return NextResponse.json({ error: 'No valid files found' }, { status: 400 });
        }

        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${id},${ver},${label||`Version ${ver}`},${prefix})`;
        await sql`UPDATE sites SET current_version=${ver},storage_prefix=${prefix},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        await addLog(parseInt(id), null, 'version', 'info', `Version ${ver} uploaded (${count} files)`);

        return NextResponse.json({ message: `Version ${ver} created with ${count} files`, version: ver }, { status: 201 });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

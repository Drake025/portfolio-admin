import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { addLog } from '@/lib/logs';
import { slugify, getContentType } from '@/lib/utils';
import AdmZip from 'adm-zip';

export const maxDuration = 300;

// POST /api/sites/upload — create new site from ZIP, files, or folder
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const formData = await request.formData();
        const name = formData.get('name');
        const description = formData.get('description');
        const label = formData.get('label');

        if (!name)
            return NextResponse.json({ error: 'Site name required' }, { status: 400 });

        const slug = slugify(name) + '-' + Date.now();
        const prefix = `sites/${slug}/v1`;
        let count = 0;
        let sourceType = 'zip';

        // Collect all files — could be 'file' (ZIP) or 'files' (individual/folder)
        const zipFile = formData.get('file');
        const individualFiles = formData.getAll('files');

        if (zipFile && typeof zipFile !== 'string' && zipFile.name.endsWith('.zip')) {
            // === ZIP upload ===
            const buffer = Buffer.from(await zipFile.arrayBuffer());
            await addLog(null, null, 'upload', 'info', `ZIP received: ${zipFile.name} (${(buffer.length/1024/1024).toFixed(1)}MB)`);

            const zip = new AdmZip(buffer);
            const entries = zip.getEntries().filter(e =>
                !e.isDirectory && !e.entryName.startsWith('__MACOSX') && !e.entryName.includes('.DS_Store')
            );

            await addLog(null, null, 'upload', 'info', `Extracting ${entries.length} files to storage...`);

            for (const entry of entries) {
                await uploadFile(`${prefix}/${entry.entryName}`, entry.getData(), getContentType(entry.entryName));
                count++;
            }
            sourceType = 'zip';

        } else if (individualFiles.length > 0 && typeof individualFiles[0] !== 'string') {
            // === Individual files / folder upload ===
            await addLog(null, null, 'upload', 'info', `Receiving ${individualFiles.length} files...`);

            for (const file of individualFiles) {
                if (!file || typeof file === 'string') continue;
                if (file.name === '.DS_Store' || file.name.includes('__MACOSX')) continue;

                const buffer = Buffer.from(await file.arrayBuffer());
                // Use the file's webkitRelativePath for folder structure, or just name
                const filePath = file.webkitRelativePath || file.name;
                const contentType = getContentType(filePath);

                await uploadFile(`${prefix}/${filePath}`, buffer, contentType);
                count++;
            }
            sourceType = 'zip';

        } else {
            return NextResponse.json({ error: 'No files provided. Upload a ZIP file or select files/folder.' }, { status: 400 });
        }

        if (count === 0) {
            return NextResponse.json({ error: 'No valid files found in upload' }, { status: 400 });
        }

        const r = await sql`INSERT INTO sites (name,slug,description,source_type,storage_prefix) VALUES (${name},${slug},${description||''},${sourceType},${prefix}) RETURNING *`;
        const site = r.rows[0];
        await sql`INSERT INTO versions (site_id,version_number,label,storage_prefix) VALUES (${site.id},1,${label||'Initial upload'},${prefix})`;
        await addLog(site.id, null, 'upload', 'info', `Site "${name}" created with ${count} files`);

        return NextResponse.json({
            message: `Site created with ${count} files`,
            site: { id: site.id, name, slug, status: 'draft' }
        }, { status: 201 });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

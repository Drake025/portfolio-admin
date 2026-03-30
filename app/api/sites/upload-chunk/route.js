import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { getContentType } from '@/lib/utils';

// POST /api/sites/upload-chunk — upload a batch of files
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const formData = await request.formData();
        const prefix = formData.get('prefix');
        const files = formData.getAll('files');
        const paths = formData.getAll('paths');

        if (!prefix || !files.length) {
            return NextResponse.json({ error: 'Missing prefix or files' }, { status: 400 });
        }

        let uploaded = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const path = paths[i];
            if (!file || typeof file === 'string' || !path) continue;

            const buffer = Buffer.from(await file.arrayBuffer());
            const fullPath = `${prefix}/${path}`;
            await uploadFile(fullPath, buffer, getContentType(path));
            uploaded++;
        }

        return NextResponse.json({ ok: true, uploaded });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

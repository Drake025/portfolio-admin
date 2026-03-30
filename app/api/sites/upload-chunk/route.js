import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { getContentType } from '@/lib/utils';

// POST /api/sites/upload-chunk — upload a single file chunk
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const prefix = formData.get('prefix');
        const path = formData.get('path');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!prefix || !path) {
            return NextResponse.json({ error: 'Missing prefix or path' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fullPath = `${prefix}/${path}`;
        await uploadFile(fullPath, buffer, getContentType(path));

        return NextResponse.json({ ok: true, path });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

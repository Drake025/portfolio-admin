import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
import { getContentType } from '@/lib/utils';

export async function POST(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { id } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get('screenshot');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No screenshot file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop().toLowerCase();
        const filename = `screenshot.${ext}`;
        const path = `sites/screenshots/${id}/${filename}`;

        const url = await uploadFile(path, buffer, getContentType(file.name));
        await sql`UPDATE sites SET screenshot_url=${url},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;

        return NextResponse.json({ message: 'Screenshot uploaded', url });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

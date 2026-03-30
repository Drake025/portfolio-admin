import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleUpload } from '@vercel/blob';

// POST /api/sites/upload-token — generate client upload token
export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    try {
        const body = await request.json();

        const result = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => ({
                allowedContentTypes: ['*/*'],
                addRandomSuffix: false,
                tokenPayload: JSON.stringify({ pathname }),
            }),
            onUploadCompleted: async () => {},
        });

        return NextResponse.json(result);
    } catch (e) {
        console.error('Upload token error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.mjs';
import { requireAuth } from '@/lib/auth.mjs';

export async function GET(request) {
    const { error, user } = requireAuth(request);
    if (error) return error;
    try {
        const r = await sql`SELECT id,email,role,created_at FROM users WHERE id=${user.id}`;
        return NextResponse.json({ user: r.rows[0] || user });
    } catch { return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
}

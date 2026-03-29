import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '@/lib/db';

export async function GET() {
    try {
        await initializeDatabase();
        const r = await sql`SELECT COUNT(*) as c FROM users`;
        const count = parseInt(r.rows[0].c);
        return NextResponse.json({ initialized: true, userCount: count, needsSetup: count === 0 });
    } catch (e) { return NextResponse.json({ initialized: false, error: e.message }, { status: 500 }); }
}

export async function POST(request) {
    try {
        const er = await sql`SELECT COUNT(*) as c FROM users`;
        if (parseInt(er.rows[0].c) > 0) return NextResponse.json({ error: 'Already set up' }, { status: 400 });
        const { email, password } = await request.json();
        if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        if (password.length < 8) return NextResponse.json({ error: 'Password must be 8+ chars' }, { status: 400 });
        await initializeDatabase();
        const hash = await bcrypt.hash(password, 10);
        await sql`INSERT INTO users (email,password_hash,role) VALUES (${email},${hash},'admin')`;
        return NextResponse.json({ message: 'Admin created. You can now log in.' });
    } catch (e) { return NextResponse.json({ error: 'Setup failed: ' + e.message }, { status: 500 }); }
}

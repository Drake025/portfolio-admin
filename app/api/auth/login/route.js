import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        const r = await sql`SELECT * FROM users WHERE email=${email}`;
        const user = r.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash)))
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        return NextResponse.json({ token: generateToken(user), user: { id: user.id, email: user.email, role: user.role } });
    } catch (e) { return NextResponse.json({ error: 'Login failed' }, { status: 500 }); }
}

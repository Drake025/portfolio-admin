import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function getUser(request) {
    const h = request.headers.get('authorization');
    if (!h?.startsWith('Bearer ')) return null;
    const decoded = verifyToken(h.split(' ')[1]);
    if (!decoded || decoded.role !== 'admin') return null;
    return decoded;
}

export function requireAuth(request) {
    const user = getUser(request);
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
    return { error: null, user };
}

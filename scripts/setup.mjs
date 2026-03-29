import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '../lib/db.mjs';

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'changeme123';

async function setup() {
    console.log('Initializing database tables...');
    await initializeDatabase();
    console.log('Tables ready.');

    const existing = await sql`SELECT id FROM users WHERE email=${email}`;
    if (existing.rows.length) { console.log(`User "${email}" already exists.`); process.exit(0); }

    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (email,password_hash,role) VALUES (${email},${hash},'admin')`;
    console.log(`\nAdmin user created!\n  Email: ${email}\n  Password: ${password}\n\nChange your password after first login.\n`);
    process.exit(0);
}

setup().catch(e => { console.error('Setup failed:', e); process.exit(1); });

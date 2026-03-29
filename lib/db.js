import { sql } from '@vercel/postgres';

export async function initializeDatabase() {
    await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        source_type VARCHAR(10) NOT NULL CHECK(source_type IN ('zip','git')),
        git_url TEXT,
        github_url TEXT,
        storage_prefix TEXT,
        live_url TEXT,
        screenshot_url TEXT,
        tech_stack TEXT DEFAULT '',
        featured BOOLEAN DEFAULT false,
        deploy_provider VARCHAR(20),
        deploy_site_id TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','building','live','error')),
        current_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    // Migration: add new columns if they don't exist (for existing databases)
    try { await sql.query('ALTER TABLE sites ADD COLUMN IF NOT EXISTS github_url TEXT'); } catch {}
    try { await sql.query('ALTER TABLE sites ADD COLUMN IF NOT EXISTS screenshot_url TEXT'); } catch {}
    try { await sql.query("ALTER TABLE sites ADD COLUMN IF NOT EXISTS tech_stack TEXT DEFAULT ''"); } catch {}
    try { await sql.query('ALTER TABLE sites ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false'); } catch {}
    try { await sql.query('ALTER TABLE sites ADD COLUMN IF NOT EXISTS demo_url TEXT'); } catch {}
    try { await sql.query("ALTER TABLE sites ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT ''"); } catch {}
    await sql`CREATE TABLE IF NOT EXISTS versions (
        id SERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        label TEXT DEFAULT '',
        storage_prefix TEXT NOT NULL,
        deploy_url TEXT,
        status VARCHAR(20) DEFAULT 'ready' CHECK(status IN ('ready','deployed','archived')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE TABLE IF NOT EXISTS build_logs (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
        version_id INTEGER REFERENCES versions(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        level VARCHAR(10) DEFAULT 'info' CHECK(level IN ('info','warn','error','debug')),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await sql`CREATE TABLE IF NOT EXISTS deploy_history (
        id SERIAL PRIMARY KEY,
        site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        version_id INTEGER,
        provider VARCHAR(20) NOT NULL,
        deploy_id TEXT,
        deploy_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    )`;
}

export { sql };

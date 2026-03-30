// Storage abstraction: supports Vercel Blob, AWS S3, or local filesystem
// Set STORAGE_PROVIDER=blob, s3, or local in .env

import fs from 'fs/promises';
import path from 'path';

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const PREFIX = 'portfolio/';
const LOCAL_DIR = process.env.STORAGE_DIR || '/tmp/portfolio-uploads';

// ── Local Filesystem ──────────────────────────────────────────
async function localUpload(filePath, data, contentType) {
    const fullPath = path.join(LOCAL_DIR, PREFIX + filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.writeFile(fullPath, buffer);
    return `file://${fullPath}`;
}
async function localList(prefix) {
    const dir = path.join(LOCAL_DIR, PREFIX + prefix);
    const results = [];
    async function walk(d) {
        try {
            const entries = await fs.readdir(d, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(d, e.name);
                if (e.isDirectory()) await walk(full);
                else {
                    const stat = await fs.stat(full);
                    const relPath = full.replace(path.join(LOCAL_DIR, PREFIX), '').replace(/\\/g, '/');
                    results.push({ url: `file://${full}`, key: relPath, size: stat.size });
                }
            }
        } catch {}
    }
    await walk(dir);
    return results;
}
async function localDeletePrefix(prefix) {
    const dir = path.join(LOCAL_DIR, PREFIX + prefix);
    try {
        const files = await localList(prefix);
        for (const f of files) {
            await fs.unlink(f.url.replace('file://', '')).catch(() => {});
        }
        return files.length;
    } catch { return 0; }
}

// ── Unified API ──────────────────────────────────────────────
export async function uploadFile(path, data, contentType = 'application/octet-stream') {
    return localUpload(path, data, contentType);
}
export async function listFiles(prefix) {
    return localList(prefix);
}
export async function deletePrefix(prefix) {
    return localDeletePrefix(prefix);
}
export function getProvider() { return PROVIDER; }

// Storage abstraction: supports local filesystem (default) or AWS S3
// Set STORAGE_PROVIDER=local or STORAGE_PROVIDER=s3 in .env

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
    return fullPath;
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
                    results.push({ url: full, key: relPath, size: stat.size });
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
            await fs.unlink(f.url).catch(() => {});
        }
        return files.length;
    } catch { return 0; }
}
async function localGetFile(filePath) {
    const fullPath = path.join(LOCAL_DIR, PREFIX + filePath);
    return fs.readFile(fullPath);
}

// ── Unified API ──────────────────────────────────────────────
export async function uploadFile(filePath, data, contentType = 'application/octet-stream') {
    return localUpload(filePath, data, contentType);
}
export async function listFiles(prefix) {
    return localList(prefix);
}
export async function deletePrefix(prefix) {
    return localDeletePrefix(prefix);
}
export async function getFile(filePath) {
    return localGetFile(filePath);
}
export function getProvider() { return PROVIDER; }

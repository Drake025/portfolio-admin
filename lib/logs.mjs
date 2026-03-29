import { sql } from './db.mjs';

// In-memory SSE listeners (per serverless instance)
const listeners = new Map();
let idCounter = 0;

export function subscribe(siteId, cb) {
    const id = ++idCounter;
    const key = siteId ? `site_${siteId}` : 'all';
    if (!listeners.has(key)) listeners.set(key, new Map());
    listeners.get(key).set(id, cb);
    return () => listeners.get(key)?.delete(id);
}

export function emit(log) {
    if (log.siteId) {
        const g = listeners.get(`site_${log.siteId}`);
        if (g) for (const cb of g.values()) try { cb(log); } catch {}
    }
    const a = listeners.get('all');
    if (a) for (const cb of a.values()) try { cb(log); } catch {}
}

export async function addLog(siteId, versionId, action, level, message) {
    try {
        await sql`INSERT INTO build_logs (site_id,version_id,action,level,message) VALUES (${siteId||null},${versionId||null},${action},${level},${message})`;
    } catch (e) { console.error('log write fail:', e.message); }
    const data = { siteId, versionId, action, level, message, created_at: new Date().toISOString() };
    emit(data);
    return data;
}

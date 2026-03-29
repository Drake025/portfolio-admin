import { NextResponse } from 'next/server';
import { sql } from '@/lib/db.mjs';
import { requireAuth } from '@/lib/auth.mjs';
import { addLog } from '@/lib/logs.mjs';
import { listFiles } from '@/lib/storage.mjs';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

export const maxDuration = 300;

// POST /api/sites/[id]/deploy — deploy to Netlify or Vercel
export async function POST(request, { params }) {
    const { error } = requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const { provider, versionId } = await request.json();

    try {
        const sr = await sql`SELECT * FROM sites WHERE id=${id}`;
        if (!sr.rows.length) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        const site = sr.rows[0];

        let ver;
        if (versionId) {
            const vr = await sql`SELECT * FROM versions WHERE id=${versionId} AND site_id=${id}`;
            ver = vr.rows[0];
        } else {
            const vr = await sql`SELECT * FROM versions WHERE site_id=${id} ORDER BY version_number DESC LIMIT 1`;
            ver = vr.rows[0];
        }
        if (!ver) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Starting ${provider} deploy...`);

        const blobs = await listFiles(ver.storage_prefix + '/');
        if (!blobs.length) return NextResponse.json({ error: 'No files in this version' }, { status: 400 });

        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Packaging ${blobs.length} files...`);

        // Build ZIP from cloud storage
        const zip = new AdmZip();
        for (const f of blobs) {
            const rel = f.key.replace(ver.storage_prefix + '/', '');
            const resp = await fetch(f.url);
            zip.addFile(rel, Buffer.from(await resp.arrayBuffer()));
        }
        const zipBuf = zip.toBuffer();

        let deployUrl, deployId;

        if (provider === 'netlify') {
            const token = process.env.NETLIFY_TOKEN;
            if (!token) return NextResponse.json({ error: 'NETLIFY_TOKEN not configured' }, { status: 400 });

            const siteId = site.deploy_site_id;
            let url, body;

            if (siteId) {
                url = `https://api.netlify.com/api/v1/sites/${siteId}/deploys`;
            } else {
                // Create site first
                const cr = await fetch('https://api.netlify.com/api/v1/sites', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: site.slug }),
                });
                if (!cr.ok) { const t = await cr.text(); throw new Error(`Netlify site create failed: ${t}`); }
                const ns = await cr.json();
                await sql`UPDATE sites SET deploy_site_id=${ns.id} WHERE id=${id}`;
                url = `https://api.netlify.com/api/v1/sites/${ns.id}/deploys`;
            }

            const dr = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
                body: zipBuf,
            });
            if (!dr.ok) { const t = await dr.text(); throw new Error(`Netlify deploy failed: ${t}`); }
            const dd = await dr.json();
            deployUrl = dd.ssl_url || dd.url;
            deployId = dd.id;

        } else if (provider === 'vercel') {
            const token = process.env.VERCEL_TOKEN;
            if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 400 });

            const files = await Promise.all(blobs.map(async f => {
                const resp = await fetch(f.url);
                const buf = Buffer.from(await resp.arrayBuffer());
                return { file: f.key.replace(ver.storage_prefix + '/', ''), data: buf.toString('base64'), encoding: 'base64' };
            }));

            const body = { name: site.slug, files, projectSettings: { framework: null } };
            if (site.deploy_site_id) body.project = site.deploy_site_id;

            const dr = await fetch('https://api.vercel.com/v13/deployments', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!dr.ok) { const t = await dr.text(); throw new Error(`Vercel deploy failed: ${t}`); }
            const dd = await dr.json();
            deployUrl = `https://${dd.url}`;
            deployId = dd.id;
            if (dd.projectId) await sql`UPDATE sites SET deploy_site_id=${dd.projectId} WHERE id=${id}`;

        } else {
            return NextResponse.json({ error: 'Invalid provider. Use "netlify" or "vercel"' }, { status: 400 });
        }

        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Deployed to ${provider}: ${deployUrl}`);

        await sql`INSERT INTO deploy_history (site_id,version_id,provider,deploy_id,deploy_url,status,completed_at) VALUES (${id},${ver.id},${provider},${deployId},${deployUrl},'ready',CURRENT_TIMESTAMP)`;
        await sql`UPDATE sites SET status='live',deploy_provider=${provider},live_url=${deployUrl},updated_at=CURRENT_TIMESTAMP WHERE id=${id}`;
        await sql`UPDATE versions SET status='deployed',deploy_url=${deployUrl} WHERE id=${ver.id}`;

        return NextResponse.json({ message: `Deployed to ${provider}`, deployUrl, deployId });
    } catch (e) {
        console.error('Deploy error:', e);
        await addLog(parseInt(id), null, 'deploy', 'error', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

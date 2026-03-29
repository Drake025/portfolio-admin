import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { addLog } from '@/lib/logs';
import { listFiles, uploadFile } from '@/lib/storage';
import { getContentType } from '@/lib/utils';
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
        if (!ver) return NextResponse.json({ error: 'No versions found. Upload a ZIP or add a Git URL first.' }, { status: 400 });

        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Starting ${provider} deploy...`);

        // Check if files exist in blob storage
        let blobs = await listFiles(ver.storage_prefix + '/');

        // If no files and this is a Git site, clone from GitHub
        if (!blobs.length && site.git_url) {
            await addLog(parseInt(id), ver.id, 'deploy', 'info', 'No files in storage. Fetching from Git repository...');

            const gitUrl = site.git_url;
            // Convert git URL to ZIP download URL
            // https://github.com/user/repo.git -> https://github.com/user/repo/archive/refs/heads/main.zip
            // https://github.com/user/repo -> https://github.com/user/repo/archive/refs/heads/main.zip
            let zipUrl = gitUrl.replace(/\.git$/, '').replace('github.com/', 'github.com/');
            // Try common branches
            const branches = ['main', 'master'];
            let zipBuffer = null;

            for (const branch of branches) {
                const tryUrl = `${zipUrl}/archive/refs/heads/${branch}.zip`;
                await addLog(parseInt(id), ver.id, 'deploy', 'debug', `Trying ${tryUrl}`);
                try {
                    const resp = await fetch(tryUrl, {
                        headers: { 'User-Agent': 'portfolio-admin' },
                        redirect: 'follow',
                    });
                    if (resp.ok) {
                        zipBuffer = Buffer.from(await resp.arrayBuffer());
                        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Downloaded repo from ${branch} branch`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!zipBuffer) {
                return NextResponse.json({
                    error: 'Could not download repository. Check the Git URL is correct and the repo is public, or upload a ZIP file instead.'
                }, { status: 400 });
            }

            // Extract ZIP and upload each file to blob storage
            const zip = new AdmZip(zipBuffer);
            const entries = zip.getEntries();
            // GitHub ZIPs have a root folder like "repo-main/", skip it
            const rootPrefix = entries.find(e => e.entryName.includes('/'))?.entryName.split('/')[0] + '/';

            await addLog(parseInt(id), ver.id, 'deploy', 'info', `Extracting and uploading files to storage...`);

            let count = 0;
            for (const entry of entries) {
                if (entry.isDirectory) continue;
                if (entry.entryName.startsWith('__MACOSX')) continue;
                if (entry.entryName.includes('.DS_Store')) continue;

                const relativePath = rootPrefix ? entry.entryName.replace(rootPrefix, '') : entry.entryName;
                if (!relativePath) continue;

                const contentType = getContentType(relativePath);
                await uploadFile(`${ver.storage_prefix}/${relativePath}`, entry.getData(), contentType);
                count++;
            }

            await addLog(parseInt(id), ver.id, 'deploy', 'info', `Uploaded ${count} files to storage`);

            // Re-list blobs
            blobs = await listFiles(ver.storage_prefix + '/');
        }

        if (!blobs.length) {
            return NextResponse.json({
                error: 'No files found. Upload a ZIP file or connect a Git repository.'
            }, { status: 400 });
        }

        await addLog(parseInt(id), ver.id, 'deploy', 'info', `Packaging ${blobs.length} files for deploy...`);

        // Build ZIP from cloud storage
        const zip = new AdmZip();
        const relPaths = blobs.map(f => {
            const rel = f.key.replace(ver.storage_prefix + '/', '');
            return { rel, url: f.url };
        }).filter(f => f.rel && !f.rel.endsWith('/'));

        // Detect if all files share a root folder and strip it
        let rootPrefix = '';
        if (relPaths.length > 0) {
            const firstParts = relPaths[0].rel.split('/');
            if (firstParts.length > 1) {
                const candidate = firstParts[0] + '/';
                if (relPaths.every(f => f.rel.startsWith(candidate))) {
                    rootPrefix = candidate;
                }
            }
        }

        for (const f of relPaths) {
            const filePath = rootPrefix ? f.rel.replace(rootPrefix, '') : f.rel;
            if (!filePath) continue;
            try {
                const resp = await fetch(f.url);
                if (resp.ok) {
                    zip.addFile(filePath, Buffer.from(await resp.arrayBuffer()));
                }
            } catch (e) {
                await addLog(parseInt(id), ver.id, 'deploy', 'warn', `Skipped file: ${filePath}`);
            }
        }

        // Ensure index.html exists at root - if not, rename the first HTML file
        const zipEntries = zip.getEntries();
        const hasIndex = zipEntries.some(e => e.entryName.toLowerCase() === 'index.html');
        if (!hasIndex) {
            const htmlFile = zipEntries.find(e => e.entryName.toLowerCase().endsWith('.html'));
            if (htmlFile) {
                zip.addFile('index.html', htmlFile.getData());
            }
        }

        // Add Netlify config to fix MIME types
        zip.addFile('netlify.toml', Buffer.from('[[headers]]\n  for = "/*"\n  [headers.values]\n    Content-Type = "text/html; charset=utf-8"\n\n[[headers]]\n  for = "*.css"\n  [headers.values]\n    Content-Type = "text/css"\n\n[[headers]]\n  for = "*.js"\n  [headers.values]\n    Content-Type = "application/javascript"\n\n[[headers]]\n  for = "*.json"\n  [headers.values]\n    Content-Type = "application/json"\n\n[[headers]]\n  for = "*.png"\n  [headers.values]\n    Content-Type = "image/png"\n\n[[headers]]\n  for = "*.jpg"\n  [headers.values]\n    Content-Type = "image/jpeg"\n\n[[headers]]\n  for = "*.svg"\n  [headers.values]\n    Content-Type = "image/svg+xml"\n'));
        const zipBuf = zip.toBuffer();

        if (zipBuf.length < 10) {
            return NextResponse.json({ error: 'ZIP package is empty. Check your source files.' }, { status: 400 });
        }

        let deployUrl, deployId;

        if (provider === 'netlify') {
            const token = process.env.NETLIFY_TOKEN;
            if (!token) return NextResponse.json({ error: 'NETLIFY_TOKEN not configured. Add it in Vercel Settings > Environment Variables.' }, { status: 400 });

            const siteId = site.deploy_provider === 'netlify' ? site.deploy_site_id : null;
            let url;

            if (siteId) {
                url = `https://api.netlify.com/api/v1/sites/${siteId}/deploys`;
            } else {
                await addLog(parseInt(id), ver.id, 'deploy', 'info', 'Looking for existing Netlify site...');
                // Try to find existing site by slug
                const lr = await fetch('https://api.netlify.com/api/v1/sites?name=' + encodeURIComponent(site.slug), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                let ns;
                if (lr.ok) {
                    const list = await lr.json();
                    ns = list.find(s => s.name === site.slug);
                }
                if (!ns) {
                    await addLog(parseInt(id), ver.id, 'deploy', 'info', 'Creating new Netlify site...');
                    const cr = await fetch('https://api.netlify.com/api/v1/sites', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: site.slug }),
                    });
                    if (!cr.ok) { const t = await cr.text(); throw new Error(`Netlify site create failed (${cr.status}): ${t}`); }
                    ns = await cr.json();
                }
                await sql`UPDATE sites SET deploy_site_id=${ns.id} WHERE id=${id}`;
                url = `https://api.netlify.com/api/v1/sites/${ns.id}/deploys`;
            }

            const dr = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/zip',
                    'Content-Length': zipBuf.length.toString(),
                },
                body: new Uint8Array(zipBuf),
            });
            if (!dr.ok) { const t = await dr.text(); throw new Error(`Netlify deploy failed (${dr.status}): ${t}`); }
            const dd = await dr.json();
            deployUrl = dd.ssl_url || dd.url;
            deployId = dd.id;

        } else if (provider === 'vercel') {
            const token = process.env.VERCEL_TOKEN;
            if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured. Add it in Vercel Settings > Environment Variables.' }, { status: 400 });

            const files = await Promise.all(blobs.map(async f => {
                const rel = f.key.replace(ver.storage_prefix + '/', '');
                if (!rel || rel.endsWith('/')) return null;
                try {
                    const resp = await fetch(f.url);
                    if (!resp.ok) return null;
                    const buf = Buffer.from(await resp.arrayBuffer());
                    return { file: rel, data: buf.toString('base64'), encoding: 'base64' };
                } catch { return null; }
            }).filter(Boolean));

            const body = {
                name: site.slug,
                files: files.filter(Boolean),
                projectSettings: { framework: null },
            };
            if (site.deploy_provider === 'vercel' && site.deploy_site_id) body.project = site.deploy_site_id;

            const dr = await fetch('https://api.vercel.com/v13/deployments', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!dr.ok) { const t = await dr.text(); throw new Error(`Vercel deploy failed: ${t}`); }
            const dd = await dr.json();
            deployUrl = `https://${dd.url}`;
            deployId = dd.id;
            if (dd.projectId) {
                await sql`UPDATE sites SET deploy_site_id=${dd.projectId} WHERE id=${id}`;
                try {
                    await fetch(`https://api.vercel.com/v9/projects/${dd.projectId}`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ssoProtection: null }),
                    });
                } catch {}
            }

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

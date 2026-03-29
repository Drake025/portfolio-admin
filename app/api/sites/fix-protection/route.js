import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
    const { error } = requireAuth(request);
    if (error) return error;

    const token = process.env.VERCEL_TOKEN;
    if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 400 });

    try {
        const sites = await sql`SELECT id, name, deploy_site_id, deploy_provider FROM sites WHERE deploy_provider='vercel' AND deploy_site_id IS NOT NULL`;
        const results = [];

        for (const site of sites.rows) {
            try {
                const resp = await fetch(`https://api.vercel.com/v9/projects/${site.deploy_site_id}`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ssoProtection: null }),
                });
                results.push({
                    site: site.name,
                    projectId: site.deploy_site_id,
                    status: resp.ok ? 'fixed' : 'failed',
                    ...(resp.ok ? {} : { error: await resp.text() }),
                });
            } catch (e) {
                results.push({ site: site.name, projectId: site.deploy_site_id, status: 'failed', error: e.message });
            }
        }

        return NextResponse.json({ results });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

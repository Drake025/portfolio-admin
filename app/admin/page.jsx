'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── API helper ──────────────────────────────────────────────
function api(path, opts = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const headers = { ...opts.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(path, { ...opts, headers, body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined });
}

// ── Main component ──────────────────────────────────────────
export default function AdminPage() {
    const router = useRouter();
    const [page, setPage] = useState('dashboard');
    const [sites, setSites] = useState([]);
    const [siteId, setSiteId] = useState(null);
    const [siteData, setSiteData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null);
    const [user, setUser] = useState(null);
    const logRef = useRef(null);

    const toastMsg = useCallback((msg, type = 'inf') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Auth check
    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) { router.replace('/login'); return; }
        api('/api/auth/me').then(r => {
            if (!r.ok) { localStorage.removeItem('admin_token'); router.replace('/login'); }
            else r.json().then(d => setUser(d.user));
        });
    }, [router]);

    // Load sites
    const loadSites = useCallback(async () => {
        try {
            const r = await api('/api/sites');
            const d = await r.json();
            setSites(d.sites || []);
        } catch { toastMsg('Failed to load sites', 'err'); }
    }, [toastMsg]);

    useEffect(() => { if (user) loadSites(); }, [user, loadSites]);

    // Load site detail
    const loadSite = useCallback(async (id) => {
        try {
            const r = await api(`/api/sites/${id}`);
            const d = await r.json();
            setSiteData(d);
        } catch { toastMsg('Failed to load site', 'err'); }
    }, [toastMsg]);

    useEffect(() => { if (siteId && page === 'site') loadSite(siteId); }, [siteId, page, loadSite, tab]);

    // SSE for logs
    useEffect(() => {
        if (page !== 'site' || tab !== 'logs' || !siteId) return;
        const token = localStorage.getItem('admin_token');
        const es = new EventSource(`/api/logs/${siteId}?stream=true&token=${token}`);
        es.onmessage = (e) => {
            try {
                const log = JSON.parse(e.data);
                if (log.error) return;
                const el = logRef.current;
                if (el) {
                    const div = document.createElement('div');
                    div.className = 'll';
                    const t = new Date(log.created_at).toLocaleTimeString();
                    div.innerHTML = `<span class="lt">${t}</span><span class="llv lv-${log.level}">${log.level.toUpperCase()}</span><span class="lm">[${log.action}] ${log.message}</span>`;
                    el.insertBefore(div, el.firstChild);
                }
            } catch {}
        };
        return () => es.close();
    }, [page, tab, siteId]);

    const logout = () => { localStorage.removeItem('admin_token'); router.replace('/login'); };

    const navigateSite = (id) => { setSiteId(id); setPage('site'); setTab('overview'); setSiteData(null); };

    if (!user) return <div className="login-wrap"><div className="sp" /></div>;

    // ── Render ──────────────────────────────────────────────
    return (
        <div className="app">
            {/* Sidebar */}
            <aside className="sb">
                <div className="sb-hd"><h2>Portfolio Admin</h2><span>Dashboard</span></div>
                <nav className="sb-nv">
                    <a href="/" className="ni" style={{ textDecoration: 'none' }}>
                        {"\u2190"} Back to Portfolio
                    </a>
                    <button className={`ni ${page === 'dashboard' ? 'on' : ''}`} onClick={() => { setPage('dashboard'); setSiteId(null); }}>
                        {"\u25C8"} Dashboard
                    </button>
                    <button className={`ni ${page === 'logs-all' ? 'on' : ''}`} onClick={() => setPage('logs-all')}>
                        {"\uD83D\uDCC4"} All Logs
                    </button>
                </nav>
                <div className="sb-ft">
                    <span>{user?.email}</span>
                    <button onClick={logout}>Logout</button>
                </div>
            </aside>

            {/* Main */}
            <main className="mc">
                {/* Toast */}
                {toast && <div className="tt-c"><div className={`tt tt-${toast.type}`}>{toast.msg}</div></div>}

                {/* Dashboard */}
                {page === 'dashboard' && <Dashboard sites={sites} onRefresh={loadSites} onOpen={navigateSite} onModal={setModal} toast={toastMsg} />}

                {/* Site detail */}
                {page === 'site' && siteData && (
                    <SiteDetail data={siteData} tab={tab} setTab={setTab} onBack={() => { setPage('dashboard'); setSiteId(null); }}
                        onRefresh={() => loadSite(siteId)} toast={toastMsg} logRef={logRef} onModal={setModal} />
                )}
                {page === 'site' && !siteData && <div className="sp" />}

                {/* All logs */}
                {page === 'logs-all' && <AllLogs toast={toastMsg} />}
            </main>

            {/* Modal */}
            {modal && <Modal onClose={() => setModal(null)}>{modal}</Modal>}
        </div>
    );
}

// ── Dashboard ───────────────────────────────────────────────
function Dashboard({ sites, onRefresh, onOpen, onModal, toast }) {
    const live = sites.filter(s => s.status === 'live').length;

    const fixProtection = async () => {
        try {
            const r = await api('/api/sites/fix-protection', { method: 'POST' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            const failed = d.results.filter(r => r.status === 'failed');
            if (failed.length) {
                toast(`Failed: ${failed[0].error || 'Unknown error'}`, 'err');
            } else {
                toast('All sites are now public!', 'ok');
            }
        } catch (e) { toast(e.message, 'err'); }
    };

    return (
        <>
            <div className="ph">
                <div><h1>Dashboard</h1><div className="sub">Manage your portfolio sites</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-s" onClick={fixProtection} title="Make deployed sites publicly accessible">&#128275; Fix Public Access</button>
                    <button className="btn btn-p" onClick={() => onModal(<UploadModal toast={toast} onDone={() => { onRefresh(); onModal(null); }} />)}>+ New Site</button>
                </div>
            </div>
            <div className="stg">
                <div className="st"><div className="lb">Total Sites</div><div className="vl">{sites.length}</div></div>
                <div className="st"><div className="lb">Live</div><div className="vl" style={{ color: 'var(--ok)' }}>{live}</div></div>
                <div className="st"><div className="lb">Drafts</div><div className="vl">{sites.length - live}</div></div>
            </div>
            <div className="stl">All Sites</div>
            {sites.length === 0 ? (
                <div className="empty">
                    <div className="ei">&#128204;</div>
                    <h3>No sites yet</h3>
                    <p>Upload a ZIP or connect a Git repository to get started.</p>
                    <button className="btn btn-p" onClick={() => onModal(<UploadModal toast={toast} onDone={() => { onRefresh(); onModal(null); }} />)}>+ Add First Site</button>
                </div>
            ) : (
                <div className="sg">
                    {sites.map(s => (
                        <div key={s.id} className="sc" onClick={() => onOpen(s.id)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <h3>{s.name}</h3>
                                <span className={`bdg bdg-${s.status}`}>{s.status}</span>
                            </div>
                            <div className="desc">{s.description || 'No description'}</div>
                            <div className="meta">
                                <span>{s.source_type === 'zip' ? '&#128196; ZIP' : '&#128187; Git'}</span>
                                <span>v{s.current_version}</span>
                                {s.live_url && <a href={s.live_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>&#128279; Live</a>}
                                <span>{ago(s.updated_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ── Site Detail ─────────────────────────────────────────────
function SiteDetail({ data, tab, setTab, onBack, onRefresh, toast, logRef, onModal }) {
    const { site, versions, logs, deploys } = data;

    const doDeploy = async (provider) => {
        toast(`Deploying to ${provider}...`, 'inf');
        try {
            const r = await api(`/api/sites/${site.id}/deploy`, { method: 'POST', body: { provider } });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast(`Deployed! ${d.deployUrl}`, 'ok');
            setTimeout(onRefresh, 1500);
        } catch (e) { toast(e.message, 'err'); }
    };

    const doRollback = async (vId, label) => {
        if (!confirm(`Roll back to ${label}?`)) return;
        try {
            const r = await api(`/api/sites/${site.id}/rollback/${vId}`, { method: 'POST' });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast(d.message, 'ok');
            onRefresh();
        } catch (e) { toast(e.message, 'err'); }
    };

    const doDelete = async () => {
        if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
        try {
            await api(`/api/sites/${site.id}`, { method: 'DELETE' });
            toast('Deleted', 'ok');
            onBack();
        } catch (e) { toast(e.message, 'err'); }
    };

    return (
        <>
            <div className="ph">
                <div>
                    <button className="btn btn-s btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>&larr; Back</button>
                    <h1>{site.name}</h1>
                    <div className="sub">{site.description || site.source_type}</div>
                </div>
                <div className="ar">
                    <span className={`bdg bdg-${site.status}`}>{site.status}</span>
                    {site.live_url && <a href={site.live_url} target="_blank" rel="noopener" className="btn btn-s btn-sm">&#128279; Live</a>}
                    <button className="btn btn-s btn-sm" onClick={() => onModal(<UploadVersionModal siteId={site.id} toast={toast} onDone={() => { onRefresh(); onModal(null); }} />)}>+ Version</button>
                    <button className="btn btn-d btn-sm" onClick={doDelete}>Delete</button>
                </div>
            </div>

            <div className="tabs">
                {['overview', 'versions', 'deploy', 'logs', 'preview'].map(t => (
                    <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'versions' ? ` (${versions.length})` : ''}
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab site={site} versions={versions} deploys={deploys} onDeploy={doDeploy} onRefresh={onRefresh} toast={toast} />}
            {tab === 'versions' && <VersionsTab versions={versions} onRollback={doRollback} />}
            {tab === 'deploy' && <DeployTab site={site} onDeploy={doDeploy} deploys={deploys} />}
            {tab === 'logs' && <LogsTab logs={logs} siteId={site.id} logRef={logRef} toast={toast} />}
            {tab === 'preview' && <PreviewTab site={site} />}
        </>
    );
}

// ── Overview Tab ────────────────────────────────────────────
function OverviewTab({ site, versions, deploys, onDeploy, onRefresh, toast }) {
    const last = deploys[0];
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [busy, setBusy] = useState(false);
    const screenshotRef = useRef(null);

    const startEdit = (field, value) => { setEditField(field); setEditValue(value || ''); };
    const cancelEdit = () => { setEditField(null); setEditValue(''); };

    const saveEdit = async () => {
        setBusy(true);
        try {
            await api(`/api/sites/${site.id}`, { method: 'PATCH', body: { [editField]: editValue } });
            toast('Updated', 'ok');
            setEditField(null);
            onRefresh();
        } catch (e) { toast(e.message, 'err'); }
        setBusy(false);
    };

    const toggleFeatured = async () => {
        try {
            await api(`/api/sites/${site.id}`, { method: 'PATCH', body: { featured: !site.featured } });
            toast(site.featured ? 'Removed from featured' : 'Added to featured', 'ok');
            onRefresh();
        } catch (e) { toast(e.message, 'err'); }
    };

    const uploadScreenshot = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('screenshot', file);
            const r = await api(`/api/sites/${site.id}/screenshot`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast('Screenshot uploaded!', 'ok');
            onRefresh();
        } catch (e2) { toast(e2.message, 'err'); }
        setBusy(false);
    };

    const renderEditable = (field, label, value) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bdr)' }}>
            <div>
                <div style={{ fontSize: '.75rem', color: 'var(--fg3)', marginBottom: 2 }}>{label}</div>
                {editField === field ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ flex: 1, padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--acc)', borderRadius: 'var(--r)', color: 'var(--fg)', fontSize: '.8125rem' }} />
                        <button className="btn btn-p btn-sm" onClick={saveEdit} disabled={busy}>Save</button>
                        <button className="btn btn-s btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                ) : (
                    <div style={{ fontSize: '.875rem' }}>{value || <span style={{ color: 'var(--fg3)' }}>Not set</span>}</div>
                )}
            </div>
            {editField !== field && <button className="btn btn-s btn-sm" onClick={() => startEdit(field, value)}>Edit</button>}
        </div>
    );

    return (
        <>
            <div className="stg">
                <div className="st"><div className="lb">Current Version</div><div className="vl">v{site.current_version}</div></div>
                <div className="st"><div className="lb">Total Versions</div><div className="vl">{versions.length}</div></div>
                <div className="st"><div className="lb">Provider</div><div className="vl">{site.deploy_provider || 'None'}</div></div>
                <div className="st"><div className="lb">Last Deploy</div><div className="vl">{last ? ago(last.started_at) : 'Never'}</div></div>
            </div>

            {/* Site Details */}
            <div className="cd" style={{ marginBottom: 16 }}>
                <div className="cd-hd">
                    <h3>Site Details</h3>
                    <button className={`btn btn-sm ${site.featured ? 'btn-p' : 'btn-s'}`} onClick={toggleFeatured}>
                        {site.featured ? '&#11088; Featured' : '+ Feature'}
                    </button>
                </div>
                <div className="cd-bd">
                    {renderEditable('description', 'Description', site.description)}
                    {renderEditable('tech_stack', 'Tech Stack', site.tech_stack)}
                    {renderEditable('github_url', 'GitHub URL', site.github_url)}
                    {renderEditable('live_url', 'Live URL', site.live_url)}
                </div>
            </div>

            {/* Screenshot */}
            <div className="cd" style={{ marginBottom: 16 }}>
                <div className="cd-hd"><h3>Screenshot</h3></div>
                <div className="cd-bd">
                    {site.screenshot_url ? (
                        <div style={{ marginBottom: 12 }}>
                            <img src={site.screenshot_url} alt="Screenshot" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--r)', border: '1px solid var(--bdr)' }} />
                        </div>
                    ) : (
                        <p style={{ color: 'var(--fg3)', marginBottom: 12, fontSize: '.875rem' }}>No screenshot uploaded</p>
                    )}
                    <input ref={screenshotRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadScreenshot} />
                    <button className="btn btn-s btn-sm" onClick={() => screenshotRef.current?.click()} disabled={busy}>
                        {site.screenshot_url ? 'Replace Screenshot' : 'Upload Screenshot'}
                    </button>
                </div>
            </div>

            {/* Live URL */}
            {site.live_url && (
                <div className="cd" style={{ marginBottom: 16 }}>
                    <div className="cd-hd"><h3>Live URL</h3></div>
                    <div className="cd-bd"><a href={site.live_url} target="_blank" rel="noopener">{site.live_url}</a></div>
                </div>
            )}

            {/* Quick Deploy */}
            <div className="cd">
                <div className="cd-hd"><h3>Quick Deploy</h3></div>
                <div className="cd-bd">
                    <div className="dpb">
                        <button className="dp" onClick={() => onDeploy('netlify')}>Deploy to Netlify</button>
                        <button className="dp" onClick={() => onDeploy('vercel')}>Deploy to Vercel</button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Versions Tab ────────────────────────────────────────────
function VersionsTab({ versions, onRollback }) {
    if (!versions.length) return <div className="empty"><h3>No versions</h3></div>;
    return (
        <div className="cd"><div className="cd-bd" style={{ overflowX: 'auto' }}>
            <table className="tbl">
                <thead><tr><th>Version</th><th>Label</th><th>Status</th><th>Deploy URL</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                    {versions.map(v => (
                        <tr key={v.id}>
                            <td><strong>v{v.version_number}</strong></td>
                            <td>{v.label || '-'}</td>
                            <td><span className={`bdg bdg-${v.status}`}>{v.status}</span></td>
                            <td>{v.deploy_url ? <a href={v.deploy_url} target="_blank" rel="noopener">{v.deploy_url.substring(0, 40)}...</a> : '-'}</td>
                            <td>{ago(v.created_at)}</td>
                            <td>{v.status !== 'deployed' ? <button className="btn btn-p btn-sm" onClick={() => onRollback(v.id, `v${v.version_number} (${v.label})`)}>Rollback</button> : <span style={{ color: 'var(--ok)', fontSize: '.75rem' }}>Active</span>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div></div>
    );
}

// ── Deploy Tab ──────────────────────────────────────────────
function DeployTab({ site, onDeploy, deploys }) {
    return (
        <>
            <div className="cd" style={{ marginBottom: 16 }}>
                <div className="cd-hd"><h3>Deploy to Netlify</h3></div>
                <div className="cd-bd">
                    <p style={{ color: 'var(--fg2)', fontSize: '.875rem', marginBottom: 16 }}>
                        Deploy the latest version to Netlify. {site.deploy_site_id ? `Connected: ${site.deploy_site_id}` : 'A new site will be created.'}
                    </p>
                    <button className="dp" onClick={() => onDeploy('netlify')}>Deploy to Netlify</button>
                </div>
            </div>
            <div className="cd" style={{ marginBottom: 16 }}>
                <div className="cd-hd"><h3>Deploy to Vercel</h3></div>
                <div className="cd-bd">
                    <p style={{ color: 'var(--fg2)', fontSize: '.875rem', marginBottom: 16 }}>
                        Deploy the latest version to Vercel. {site.deploy_site_id ? `Connected: ${site.deploy_site_id}` : 'A new project will be created.'}
                    </p>
                    <button className="dp" onClick={() => onDeploy('vercel')}>Deploy to Vercel</button>
                </div>
            </div>
            {deploys.length > 0 && (
                <div className="cd">
                    <div className="cd-hd"><h3>Deploy History</h3></div>
                    <div className="cd-bd" style={{ overflowX: 'auto' }}>
                        <table className="tbl">
                            <thead><tr><th>Provider</th><th>Status</th><th>URL</th><th>Time</th></tr></thead>
                            <tbody>
                                {deploys.map(d => (
                                    <tr key={d.id}>
                                        <td>{d.provider}</td>
                                        <td><span className={`bdg bdg-${d.status}`}>{d.status}</span></td>
                                        <td>{d.deploy_url ? <a href={d.deploy_url} target="_blank" rel="noopener">{d.deploy_url.substring(0, 50)}...</a> : '-'}</td>
                                        <td>{ago(d.started_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Logs Tab ────────────────────────────────────────────────
function LogsTab({ logs, siteId, logRef, toast }) {
    const clearLogs = async () => {
        await api(`/api/logs/${siteId}`, { method: 'DELETE' });
        if (logRef.current) logRef.current.innerHTML = '<div style="color:var(--fg3)">Logs cleared</div>';
        toast('Logs cleared', 'inf');
    };
    return (
        <div className="cd">
            <div className="cd-hd"><h3>Build Logs</h3><button className="btn btn-s btn-sm" onClick={clearLogs}>Clear</button></div>
            <div className="cd-bd">
                <div className="lv" ref={logRef}>
                    {logs.map((l, i) => (
                        <div key={l.id || i} className="ll">
                            <span className="lt">{new Date(l.created_at).toLocaleTimeString()}</span>
                            <span className={`llv lv-${l.level}`}>{l.level.toUpperCase()}</span>
                            <span className="lm">[{l.action}] {l.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div style={{ color: 'var(--fg3)' }}>No logs yet</div>}
                </div>
            </div>
        </div>
    );
}

// ── Preview Tab ──────────────────────────────────────────────
function PreviewTab({ site }) {
    if (!site.live_url) return <div className="empty"><h3>No preview available</h3><p>Deploy the site first to see a preview.</p></div>;
    return (
        <div className="cd">
            <div className="cd-hd">
                <h3>Preview</h3>
                <a href={site.live_url} target="_blank" rel="noopener" className="btn btn-s btn-sm">Open in New Tab &#8599;</a>
            </div>
            <div className="cd-bd" style={{ padding: 0 }}>
                <iframe
                    src={site.live_url}
                    style={{ width: '100%', height: '600px', border: 'none', borderRadius: '0 0 var(--rl) var(--rl)' }}
                    title={`Preview: ${site.name}`}
                />
            </div>
        </div>
    );
}

// ── All Logs Page ───────────────────────────────────────────
function AllLogs({ toast }) {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        api('/api/logs?limit=100').then(r => r.json()).then(d => setLogs(d.logs || [])).catch(() => {});
    }, []);
    return (
        <>
            <div className="ph"><div><h1>All Build Logs</h1><div className="sub">Recent activity across all sites</div></div></div>
            <div className="cd"><div className="cd-bd">
                <div className="lv">
                    {logs.map((l, i) => (
                        <div key={l.id || i} className="ll">
                            <span className="lt">{new Date(l.created_at).toLocaleTimeString()}</span>
                            <span className={`llv lv-${l.level}`}>{l.level.toUpperCase()}</span>
                            <span className="lm">[{l.site_name || 'System'}] [{l.action}] {l.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div style={{ color: 'var(--fg3)' }}>No logs yet</div>}
                </div>
            </div></div>
        </>
    );
}

// ── Upload Modal (New Site) ─────────────────────────────────
function UploadModal({ toast, onDone }) {
    const [mode, setMode] = useState('zip');
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [gitUrl, setGitUrl] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [techStack, setTechStack] = useState('');
    const [busy, setBusy] = useState(false);
    const zipRef = useRef(null);
    const filesRef = useRef(null);
    const folderRef = useRef(null);

    const submit = async () => {
        if (!name) return toast('Name required', 'err');
        setBusy(true);
        try {
            const prefix = `sites/upload-${Date.now()}`;
            let allFiles = []; // array of { file: File, path: string }

            if (mode === 'zip') {
                if (!file) return toast('Select a ZIP file', 'err'), setBusy(false);
                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(file);
                const entries = Object.entries(zip.files).filter(([path, entry]) =>
                    !entry.dir && !path.startsWith('__MACOSX') && !path.includes('.DS_Store')
                );
                for (const [path, entry] of entries) {
                    const data = await entry.async('uint8array');
                    const blob = new Blob([data]);
                    allFiles.push({ file: new File([blob], path.split('/').pop()), path });
                }
            } else if (mode === 'files') {
                if (!files.length) return toast('Select files or a folder', 'err'), setBusy(false);
                for (const f of files) {
                    if (!f || typeof f === 'string') continue;
                    if (f.name === '.DS_Store' || f.name.includes('__MACOSX')) continue;
                    allFiles.push({ file: f, path: f.webkitRelativePath || f.name });
                }
            } else {
                if (!gitUrl) return toast('Git URL required', 'err'), setBusy(false);
                const r = await api('/api/sites', { method: 'POST', body: { name, description: desc, gitUrl } });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                if (githubUrl || techStack) {
                    await api(`/api/sites/${d.site.id}`, { method: 'PATCH', body: { github_url: githubUrl, tech_stack: techStack } });
                }
                toast('Site created!', 'ok');
                onDone();
                return;
            }

            // Batch upload: send 10 files per request, 5 parallel batches
            const BATCH = 10;
            const CONCURRENT = 5;
            let uploaded = 0;
            const batches = [];
            for (let i = 0; i < allFiles.length; i += BATCH) {
                const batch = allFiles.slice(i, i + BATCH);
                const fd = new FormData();
                fd.append('prefix', prefix);
                for (const { file: f, path } of batch) {
                    fd.append('files', f);
                    fd.append('paths', path);
                }
                batches.push(fd);
            }
            for (let i = 0; i < batches.length; i += CONCURRENT) {
                const slice = batches.slice(i, i + CONCURRENT);
                const results = await Promise.all(slice.map(fd => api('/api/sites/upload-chunk', { method: 'POST', body: fd })));
                for (const r of results) {
                    if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
                    const d = await r.json();
                    uploaded += d.uploaded || 0;
                }
                toast(`Uploading... ${uploaded}/${allFiles.length}`, 'inf');
            }

            const r = await api('/api/sites/upload-finalize', {
                method: 'POST',
                body: { name, description: desc, prefix, fileCount: uploaded, githubUrl, techStack },
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast(`Site created with ${uploaded} files!`, 'ok');
            onDone();
        } catch (e) { toast(e.message, 'err'); setBusy(false); }
    };

    return (
        <>
            <div className="mo-h"><h3>Add New Site</h3><button className="mo-x" onClick={onDone}>&times;</button></div>
            <div className="mo-b">
                <div className="tabs">
                    <button className={`tab ${mode === 'zip' ? 'on' : ''}`} onClick={() => setMode('zip')}>ZIP</button>
                    <button className={`tab ${mode === 'files' ? 'on' : ''}`} onClick={() => setMode('files')}>Files / Folder</button>
                    <button className={`tab ${mode === 'git' ? 'on' : ''}`} onClick={() => setMode('git')}>Git</button>
                </div>
                <div className="fg"><label>Site Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="My Project" /></div>
                <div className="fg"><label>Description</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" /></div>
                <div className="fg"><label>Tech Stack (comma separated)</label><input value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, Node.js, PostgreSQL" /></div>
                <div className="fg"><label>GitHub URL (optional)</label><input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo" /></div>
                {mode === 'zip' ? (
                    <>
                        <div className="ua" onClick={() => zipRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}>
                            <div className="ico">&#128196;</div>
                            <div className="txt">{file ? file.name : 'Click or drag a ZIP file here'}</div>
                            <div className="hnt">Max 50MB</div>
                        </div>
                        <input ref={zipRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                    </>
                ) : mode === 'files' ? (
                    <>
                        <div className="ua" onClick={() => filesRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)); }}>
                            <div className="ico">&#128193;</div>
                            <div className="txt">{files.length ? `${files.length} files selected` : 'Click to select files or drag them here'}</div>
                            <div className="hnt">Select multiple files or an entire folder</div>
                        </div>
                        <input ref={filesRef} type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                        <div style={{ textAlign: 'center', margin: '8px 0', color: 'var(--fg3)', fontSize: '.8125rem' }}>or</div>
                        <div className="ua" onClick={() => folderRef.current?.click()}>
                            <div className="ico">&#128194;</div>
                            <div className="txt">Select entire folder</div>
                            <div className="hnt">Picks up index.html, CSS, JS, images, etc.</div>
                        </div>
                        <input ref={folderRef} type="file" webkitdirectory="true" style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                    </>
                ) : (
                    <div className="fg"><label>Git Repository URL</label><input value={gitUrl} onChange={e => setGitUrl(e.target.value)} placeholder="https://github.com/user/repo" /></div>
                )}
            </div>
            <div className="mo-f">
                <button className="btn btn-s" onClick={onDone}>Cancel</button>
                <button className="btn btn-p" onClick={submit} disabled={busy}>{busy ? <><span className="sp" /> Creating...</> : 'Create Site'}</button>
            </div>
        </>
    );
}

// ── Upload Version Modal ────────────────────────────────────
function UploadVersionModal({ siteId, toast, onDone }) {
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);
    const [mode, setMode] = useState('zip');
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const zipRef = useRef(null);
    const filesRef = useRef(null);
    const folderRef = useRef(null);

    const submit = async () => {
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('label', label);
            if (mode === 'zip') {
                if (!file) return toast('Select a ZIP file', 'err'), setBusy(false);
                fd.append('file', file);
            } else {
                if (!files.length) return toast('Select files or a folder', 'err'), setBusy(false);
                for (const f of files) fd.append('files', f);
            }
            const r = await api(`/api/sites/${siteId}/upload`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast('Version uploaded!', 'ok');
            onDone();
        } catch (e) { toast(e.message, 'err'); setBusy(false); }
    };

    return (
        <>
            <div className="mo-h"><h3>Upload New Version</h3><button className="mo-x" onClick={onDone}>&times;</button></div>
            <div className="mo-b">
                <div className="tabs">
                    <button className={`tab ${mode === 'zip' ? 'on' : ''}`} onClick={() => setMode('zip')}>ZIP</button>
                    <button className={`tab ${mode === 'files' ? 'on' : ''}`} onClick={() => setMode('files')}>Files / Folder</button>
                </div>
                <div className="fg"><label>Label (optional)</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Bug fixes" /></div>
                {mode === 'zip' ? (
                    <>
                        <div className="ua" onClick={() => zipRef.current?.click()}>
                            <div className="ico">&#128196;</div>
                            <div className="txt">{file ? file.name : 'Click to select a ZIP file'}</div>
                        </div>
                        <input ref={zipRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                    </>
                ) : (
                    <>
                        <div className="ua" onClick={() => filesRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)); }}>
                            <div className="ico">&#128193;</div>
                            <div className="txt">{files.length ? `${files.length} files selected` : 'Click to select files or drag them here'}</div>
                        </div>
                        <input ref={filesRef} type="file" multiple style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                        <div style={{ textAlign: 'center', margin: '8px 0', color: 'var(--fg3)', fontSize: '.8125rem' }}>or</div>
                        <div className="ua" onClick={() => folderRef.current?.click()}>
                            <div className="ico">&#128194;</div>
                            <div className="txt">Select entire folder</div>
                        </div>
                        <input ref={folderRef} type="file" webkitdirectory="true" style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
                    </>
                )}
            </div>
            <div className="mo-f">
                <button className="btn btn-s" onClick={onDone}>Cancel</button>
                <button className="btn btn-p" onClick={submit} disabled={busy}>{busy ? <><span className="sp" /> Uploading...</> : 'Upload'}</button>
            </div>
        </>
    );
}

// ── Modal wrapper ───────────────────────────────────────────
function Modal({ children, onClose }) {
    return (
        <div className="mo open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="mo-c">{children}</div>
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────
function ago(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}

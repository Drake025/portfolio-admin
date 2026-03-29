'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/sites?public=true')
            .then(r => r.json())
            .then(d => setSites(d.sites || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="login-wrap"><div className="sp" /></div>;

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
            <header style={{ marginBottom: 48 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>My Portfolio</h1>
                <p style={{ color: 'var(--fg2)', fontSize: '1.0625rem' }}>A collection of projects I&apos;ve built and deployed.</p>
            </header>

            {sites.length === 0 ? (
                <div className="empty">
                    <div className="ei">&#128187;</div>
                    <h3>No projects yet</h3>
                    <p>Projects will appear here once they are published from the admin dashboard.</p>
                    <a href="/login" className="btn btn-p">Admin Login</a>
                </div>
            ) : (
                <div className="sg">
                    {sites.map(site => (
                        <div key={site.id} className="sc" onClick={() => site.live_url && window.open(site.live_url, '_blank')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <h3>{site.name}</h3>
                                <span className="bdg bdg-live">Live</span>
                            </div>
                            <div className="desc">{site.description || 'No description'}</div>
                            <div className="meta">
                                <span>v{site.current_version}</span>
                                {site.live_url && <a href={site.live_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>&#128279; View Site</a>}
                                <span>{timeAgo(site.updated_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', fontSize: '.8125rem', color: 'var(--fg3)' }}>
                <span>&copy; {new Date().getFullYear()}</span>
                <a href="/login" style={{ color: 'var(--fg3)' }}>Admin</a>
            </footer>
        </div>
    );
}

function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}

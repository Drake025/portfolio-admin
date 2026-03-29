'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('dark');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const saved = localStorage.getItem('portfolio-theme');
        if (saved) setTheme(saved);
        else if (window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
    }, [theme]);

    useEffect(() => {
        fetch('/api/sites?public=true')
            .then(r => r.json())
            .then(d => setSites(d.sites || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    const featured = sites.filter(s => s.featured);
    const otherSites = sites.filter(s => !s.featured);
    const filteredSites = filter === 'all' ? otherSites : otherSites.filter(s => {
        const stack = (s.tech_stack || '').toLowerCase();
        return stack.includes(filter.toLowerCase());
    });

    const allTech = [...new Set(sites.flatMap(s => (s.tech_stack || '').split(',').map(t => t.trim()).filter(Boolean)))];

    if (loading) return (
        <div className="pub-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="sp" />
        </div>
    );

    return (
        <div className="pub-wrap">
            {/* Navigation */}
            <nav className="pub-nav">
                <div className="pub-nav-inner">
                    <a href="/" className="pub-logo">
                        <span className="pub-logo-icon">{"\u2727"}</span>
                        <span>Prince Jeremie</span>
                    </a>
                    <div className="pub-nav-links">
                        <a href="/" className="pub-nav-link active">Projects</a>
                        <a href="/#about" className="pub-nav-link">About</a>
                        <a href="/contact" className="pub-nav-link">Contact</a>
                        <button onClick={toggleTheme} className="pub-theme-btn" aria-label="Toggle theme">
                            {theme === 'dark' ? '\u2600' : '\u263E'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="pub-hero">
                <div className="pub-hero-inner">
                    <div className="pub-hero-badge">{"\uD83D\uDC4B"} Welcome to my portfolio</div>
                    <h1 className="pub-hero-title">
                        Building <span className="pub-accent">digital experiences</span> that matter
                    </h1>
                    <p className="pub-hero-sub">
                        Full-stack developer crafting modern web applications with clean code and thoughtful design.
                        Every project below is live &mdash; click to explore.
                    </p>
                    <div className="pub-hero-stats">
                        <div className="pub-stat">
                            <span className="pub-stat-num">{sites.length}</span>
                            <span className="pub-stat-label">Projects</span>
                        </div>
                        <div className="pub-stat">
                            <span className="pub-stat-num">{sites.filter(s => s.status === 'live').length}</span>
                            <span className="pub-stat-label">Live</span>
                        </div>
                        <div className="pub-stat">
                            <span className="pub-stat-num">{allTech.length}</span>
                            <span className="pub-stat-label">Technologies</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pub-main">
                {/* Featured Projects */}
                {featured.length > 0 && (
                    <section className="pub-section">
                        <div className="pub-section-header">
                            <h2 className="pub-section-title">
                                <span className="pub-section-icon">{"\u2B50"}</span> Featured Projects
                            </h2>
                        </div>
                        <div className="pub-featured-grid">
                            {featured.map(site => (
                                <FeaturedCard key={site.id} site={site} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All Projects */}
                <section className="pub-section">
                    <div className="pub-section-header">
                        <h2 className="pub-section-title">All Projects</h2>
                        {allTech.length > 0 && (
                            <div className="pub-filters">
                                <button className={`pub-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                                {allTech.slice(0, 6).map(tech => (
                                    <button key={tech} className={`pub-filter ${filter === tech ? 'active' : ''}`} onClick={() => setFilter(tech)}>{tech}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {filteredSites.length === 0 && featured.length === 0 ? (
                        <div className="pub-empty">
                            <div className="pub-empty-icon">{"\uD83D\uDCBB"}</div>
                            <h3>Projects coming soon</h3>
                            <p>New projects will appear here once they are published.</p>
                            <a href="/login" className="pub-btn pub-btn-primary">Admin Login</a>
                        </div>
                    ) : (
                        <div className="pub-projects-grid">
                            {filteredSites.map(site => (
                                <ProjectCard key={site.id} site={site} />
                            ))}
                        </div>
                    )}
                </section>

                {/* About Me */}
                <section id="about" className="pub-section">
                    <div className="pub-about">
                        <h2 className="pub-section-title" style={{ marginBottom: 20 }}>About Me</h2>
                        <div className="pub-about-card">
                            <div className="pub-about-avatar">P</div>
                            <div className="pub-about-content">
                                <h3 className="pub-about-name">Prince Jeremie Malana</h3>
                                <p className="pub-about-role">Web Developer &mdash; Dashboards, Admin Panels & Web Apps</p>
                                <p className="pub-about-bio">
                                    I&apos;m a web developer passionate about building dashboards, admin panels, and
                                    production-ready web applications. My focus is on creating tools that are not only
                                    functional but also polished, scalable, and recruiter-friendly.
                                </p>
                                <p className="pub-about-bio">
                                    I graduated with a Bachelor of Science in Information Technology from Mabalacat City
                                    College, and since then I&apos;ve shipped projects like Break Time Monitoring, a real-time
                                    system for tracking employee breaks, alongside my personal portfolio site. These
                                    projects reflect my commitment to clarity, usability, and professional design.
                                </p>
                                <div className="pub-about-expertise">
                                    <h4>My Expertise</h4>
                                    <ul className="pub-about-skills">
                                        <li>Frontend development with React and Next.js</li>
                                        <li>Backend/API design using Node.js and NestJS</li>
                                        <li>Database management with PostgreSQL and Firebase</li>
                                        <li>Deployment on Vercel, Netlify, and DigitalOcean</li>
                                        <li>CI/CD automation with GitHub Actions</li>
                                        <li>Security and performance optimization</li>
                                        <li>UI/UX design with a focus on responsive, modern interfaces</li>
                                    </ul>
                                </div>
                                <p className="pub-about-bio">
                                    I believe that great software is about more than just code &mdash; it&apos;s about solving
                                    problems elegantly and making workflows seamless. My portfolio is designed to showcase
                                    that philosophy, with every project built to be clear, efficient, and easy to manage.
                                </p>
                                <p className="pub-about-closing">
                                    I&apos;m energized by the challenge of turning complex requirements into simple, elegant
                                    solutions. Whether it&apos;s a dashboard, admin panel, or full web app, I build with one
                                    goal in mind: helping teams work smarter and faster.
                                </p>
                                <div className="pub-about-links">
                                    <a href="mailto:malanaprincejeremie@gmail.com" className="pub-btn pub-btn-primary pub-btn-sm">
                                        {"\u2709"} Email Me
                                    </a>
                                    <a href="https://www.linkedin.com/in/prince-jeremie-malana-73293b2bb" target="_blank" rel="noopener noreferrer" className="pub-btn pub-btn-ghost pub-btn-sm">
                                        LinkedIn
                                    </a>
                                    <a href="https://github.com/Drake025" target="_blank" rel="noopener noreferrer" className="pub-btn pub-btn-ghost pub-btn-sm">
                                        GitHub
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="pub-footer">
                <div className="pub-footer-inner">
                    <div className="pub-footer-left">
                        <span>&copy; {new Date().getFullYear()} Prince Jeremie Malana</span>
                    </div>
                    <div className="pub-footer-links">
                        <a href="/contact">Contact</a>
                        <a href="https://github.com/Drake025" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="/login" className="pub-footer-admin">Admin</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeaturedCard({ site }) {
    const stack = (site.tech_stack || '').split(',').map(t => t.trim()).filter(Boolean);
    return (
        <div className="pub-featured-card" onClick={() => site.live_url && window.open(site.live_url, '_blank')}>
            {site.screenshot_url && (
                <div className="pub-featured-img">
                    <img src={site.screenshot_url} alt={site.name} loading="lazy" />
                </div>
            )}
            <div className="pub-featured-content">
                <div className="pub-featured-top">
                    <span className="pub-badge pub-badge-featured">{"\u2B50"} Featured</span>
                    <StatusBadge status={site.status} />
                </div>
                <h3 className="pub-card-title">{site.name}</h3>
                <div className="pub-card-scroll">
                    <p className="pub-card-desc">{site.description || 'No description provided.'}</p>
                </div>
                {stack.length > 0 && (
                    <div className="pub-tech-tags">
                        {stack.map(t => <span key={t} className="pub-tech-tag">{t}</span>)}
                    </div>
                )}
                <div className="pub-card-actions">
                    {site.live_url && (
                        <a href={site.live_url} target="_blank" rel="noopener noreferrer" className="pub-btn pub-btn-primary pub-btn-sm" onClick={e => e.stopPropagation()}>
                            {"\uD83D\uDD17"} View Live
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProjectCard({ site }) {
    const stack = (site.tech_stack || '').split(',').map(t => t.trim()).filter(Boolean);
    return (
        <div className="pub-project-card" onClick={() => site.live_url && window.open(site.live_url, '_blank')}>
            {site.screenshot_url ? (
                <div className="pub-card-img">
                    <img src={site.screenshot_url} alt={site.name} loading="lazy" />
                </div>
            ) : (
                <div className="pub-card-img pub-card-img-placeholder">
                    <span>{site.name.charAt(0).toUpperCase()}</span>
                </div>
            )}
            <div className="pub-card-body">
                <div className="pub-card-top">
                    <StatusBadge status={site.status} />
                    <span className="pub-card-version">v{site.current_version}</span>
                </div>
                <h3 className="pub-card-title">{site.name}</h3>
                <div className="pub-card-scroll">
                    <p className="pub-card-desc">{site.description || 'No description provided.'}</p>
                </div>
                {stack.length > 0 && (
                    <div className="pub-tech-tags">
                        {stack.slice(0, 4).map(t => <span key={t} className="pub-tech-tag">{t}</span>)}
                        {stack.length > 4 && <span className="pub-tech-tag">+{stack.length - 4}</span>}
                    </div>
                )}
                <div className="pub-card-actions">
                    {site.live_url && (
                        <a href={site.live_url} target="_blank" rel="noopener noreferrer" className="pub-btn pub-btn-primary pub-btn-sm" onClick={e => e.stopPropagation()}>
                            View Live
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        live: { label: 'Live', cls: 'pub-badge-live' },
        draft: { label: 'Draft', cls: 'pub-badge-draft' },
        building: { label: 'Building', cls: 'pub-badge-building' },
        error: { label: 'Error', cls: 'pub-badge-error' },
    };
    const b = map[status] || map.draft;
    return <span className={`pub-badge ${b.cls}`}>{b.label}</span>;
}

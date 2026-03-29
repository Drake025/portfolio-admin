'use client';
import { useState, useEffect } from 'react';

export default function ContactPage() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('portfolio-theme');
        if (saved) setTheme(saved);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('portfolio-theme', next);
    };

    return (
        <div className="pub-wrap">
            <nav className="pub-nav">
                <div className="pub-nav-inner">
                    <a href="/" className="pub-logo">
                        <span className="pub-logo-icon">{"\u2727"}</span>
                        <span>Prince Jeremie</span>
                    </a>
                    <div className="pub-nav-links">
                        <a href="/" className="pub-nav-link">Projects</a>
                        <a href="/#about" className="pub-nav-link">About</a>
                        <a href="/contact" className="pub-nav-link active">Contact</a>
                        <button onClick={toggleTheme} className="pub-theme-btn" aria-label="Toggle theme">
                            {theme === 'dark' ? '\u2600' : '\u263E'}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pub-main" style={{ minHeight: 'calc(100vh - 160px)' }}>
                <section className="pub-section" style={{ maxWidth: 640, margin: '0 auto' }}>
                    <div className="pub-contact-hero">
                        <h1 className="pub-contact-title">Let&apos;s Connect</h1>
                        <p className="pub-contact-sub">
                            Have a project in mind, want to collaborate, or just want to say hello?
                            I&apos;d love to hear from you.
                        </p>
                    </div>

                    <div className="pub-contact-grid">
                        <a href="mailto:malanaprincejeremie@gmail.com" className="pub-contact-card">
                            <div className="pub-contact-icon">{"\u2709"}</div>
                            <div className="pub-contact-info">
                                <h3>Email</h3>
                                <p>malanaprincejeremie@gmail.com</p>
                            </div>
                            <span className="pub-contact-arrow">&rarr;</span>
                        </a>

                        <a href="https://www.linkedin.com/in/prince-jeremie-malana-73293b2bb" target="_blank" rel="noopener noreferrer" className="pub-contact-card">
                            <div className="pub-contact-icon" style={{ color: '#0a66c2' }}>{"\u25CF"}</div>
                            <div className="pub-contact-info">
                                <h3>LinkedIn</h3>
                                <p>Prince Jeremie Malana</p>
                            </div>
                            <span className="pub-contact-arrow">&rarr;</span>
                        </a>

                        <a href="https://github.com/Drake025" target="_blank" rel="noopener noreferrer" className="pub-contact-card">
                            <div className="pub-contact-icon">{"\u25CF"}</div>
                            <div className="pub-contact-info">
                                <h3>GitHub</h3>
                                <p>Drake025</p>
                            </div>
                            <span className="pub-contact-arrow">&rarr;</span>
                        </a>
                    </div>
                </section>
            </main>

            <footer className="pub-footer">
                <div className="pub-footer-inner">
                    <div className="pub-footer-left">
                        <span>&copy; {new Date().getFullYear()} Prince Jeremie Malana</span>
                    </div>
                    <div className="pub-footer-links">
                        <a href="/">Projects</a>
                        <a href="/#about">About</a>
                        <a href="/login" className="pub-footer-admin">Admin</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

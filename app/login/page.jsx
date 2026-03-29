'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // Check if setup is needed
    const [needsSetup, setNeedsSetup] = useState(false);
    const [setupEmail, setSetupEmail] = useState('');
    const [setupPassword, setSetupPassword] = useState('');
    const [setupDone, setSetupDone] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('admin_token')) {
            router.replace('/admin');
            return;
        }
        fetch('/api/setup').then(r => r.json()).then(d => {
            if (d.needsSetup) setNeedsSetup(true);
        }).catch(() => {});
    }, [router]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            localStorage.setItem('admin_token', d.token);
            router.push('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleSetup = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const r = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: setupEmail, password: setupPassword }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setSetupDone(true);
            setNeedsSetup(false);
            setEmail(setupEmail);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login-wrap">
            <div className="login-box">
                <h1>Portfolio Admin</h1>

                {needsSetup ? (
                    <>
                        <p>Create your admin account to get started.</p>
                        <form onSubmit={handleSetup}>
                            <div className="fg">
                                <label>Email</label>
                                <input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="admin@example.com" required />
                            </div>
                            <div className="fg">
                                <label>Password (min 8 characters)</label>
                                <input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} placeholder="Choose a password" required minLength={8} />
                            </div>
                            {error && <div className="ferr" style={{ marginBottom: 12 }}>{error}</div>}
                            <button type="submit" className="btn btn-p btn-f" disabled={busy}>
                                {busy ? <><span className="sp" /> Creating...</> : 'Create Admin Account'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <p>{setupDone ? 'Account created! Sign in below.' : 'Sign in to manage your portfolio.'}</p>
                        <form onSubmit={handleLogin}>
                            <div className="fg">
                                <label>Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
                            </div>
                            <div className="fg">
                                <label>Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
                            </div>
                            {error && <div className="ferr" style={{ marginBottom: 12 }}>{error}</div>}
                            <button type="submit" className="btn btn-p btn-f" disabled={busy}>
                                {busy ? <><span className="sp" /> Signing in...</> : 'Sign In'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

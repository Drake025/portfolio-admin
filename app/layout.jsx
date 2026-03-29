import './globals.css';

export const metadata = { title: 'Prince Jeremie | Portfolio', description: 'Full-stack developer portfolio - Projects, skills, and contact information for Prince Jeremie Malana.' };

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <script dangerouslySetInnerHTML={{ __html: `
                    (function() {
                        var t = localStorage.getItem('portfolio-theme');
                        if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                        document.documentElement.setAttribute('data-theme', t);
                    })();
                `}} />
            </head>
            <body>{children}</body>
        </html>
    );
}

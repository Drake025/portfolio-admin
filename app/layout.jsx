import './globals.css';

export const metadata = { title: 'Portfolio', description: 'My portfolio & admin dashboard' };

export default function RootLayout({ children }) {
    return <html lang="en"><body>{children}</body></html>;
}

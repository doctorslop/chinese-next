import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Chinese Dictionary',
  description: 'Chinese-English Dictionary',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chinese Dictionary',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()` }} />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="header-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
              </svg>
              <span>Chinese Dictionary</span>
            </Link>
            <nav className="header-nav">
              <Link href="/idioms">Idioms</Link>
              <Link href="/lookup">Lookup</Link>
              <Link href="/hsk">HSK</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <nav className="footer-nav">
              <Link href="/about">About</Link>
              <Link href="/help">Help</Link>
              <Link href="/idioms">Idioms</Link>
              <Link href="/lookup">Lookup</Link>
              <Link href="/hsk">HSK</Link>
            </nav>
            <p className="footer-credit">CC-CEDICT · Open-source Chinese-English dictionary</p>
          </div>
        </footer>
        <Script src="/audio.js" strategy="afterInteractive" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}` }} />
      </body>
    </html>
  );
}

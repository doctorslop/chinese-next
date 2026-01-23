import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChineseDictionary',
  description: 'Chinese-English Dictionary',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="top-nav">
          <Link href="/">Home</Link>
          <Link href="/help">Help</Link>
          <Link href="/about">About</Link>
        </nav>
        <main>{children}</main>
        <script src="/audio.js" defer></script>
      </body>
    </html>
  );
}

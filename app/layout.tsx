import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Body Rock Event',
  description: 'Body Rock Familie Fun Event App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        {/* Barlow + Barlow Condensed — nodig voor de deelkaart (lib/overlayCard.ts):
            de canvas gebruikt de echte condensed Barlow i.p.v. brede Arial-fallback. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen" style={{background: 'var(--br-offwhite)'}}>{children}</body>
    </html>
  )
}

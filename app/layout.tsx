import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Body Rock Event',
  description: 'Body Rock Familie Fun Event App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen" style={{background: 'var(--br-offwhite)'}}>{children}</body>
    </html>
  )
}

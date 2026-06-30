'use client'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: 'var(--br-offwhite)'}}>
      <div className="text-center mb-12">
        <Logo className="justify-center mb-6" />
        <h1 className="text-3xl font-bold mb-1" style={{color: 'var(--br-dark)'}}>Familie Fun Event</h1>
        <p style={{color: 'var(--br-muted)'}}>Scan de QR-code op het event om je team aan te maken.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/board" className="btn-secondary text-center">
          🏆 Message board
        </Link>
        <Link href="/admin" className="text-sm text-center mt-4" style={{color: 'var(--br-muted)'}}>
          Trainer login →
        </Link>
      </div>
    </main>
  )
}

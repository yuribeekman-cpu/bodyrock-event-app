'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">🤘</div>
        <h1 className="text-4xl font-bold mb-2">Body Rock</h1>
        <p className="text-white/60 text-lg">Familie Fun Event</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <p className="text-white/40 text-sm text-center">
          Scan de QR-code op het event om je team aan te maken.
        </p>
        <Link href="/board" className="btn-secondary text-center">
          🏆 Message board
        </Link>
        <Link href="/admin" className="text-white/30 text-sm text-center hover:text-white/50 transition-colors mt-4">
          Trainer login →
        </Link>
      </div>
    </main>
  )
}

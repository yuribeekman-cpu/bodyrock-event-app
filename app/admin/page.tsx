'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Verkeerd wachtwoord')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <Logo className="justify-center mb-8" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input className="input" type="password" placeholder="Wachtwoord" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-center" style={{color: 'var(--br-red)'}}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Laden...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}

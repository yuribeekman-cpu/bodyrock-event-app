'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [team, setTeam] = useState<{ id: string; name: string; event_id: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('teams')
      .select('id, name, event_id, captain_name')
      .eq('join_code', code.toUpperCase().trim())
      .single()

    setLoading(false)
    if (error || !data) {
      setError('Code niet gevonden. Check de QR-code of vraag een trainer.')
      return
    }

    setTeam(data)
    if (data.captain_name) {
      localStorage.setItem('br_team_id', data.id)
      localStorage.setItem('br_team_name', data.name)
      router.push(`/team/${data.id}`)
    } else {
      setStep('name')
    }
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setLoading(true)

    await supabase.from('teams').update({ captain_name: captainName }).eq('id', team.id)

    localStorage.setItem('br_team_id', team.id)
    localStorage.setItem('br_team_name', team.name)
    setLoading(false)
    router.push(`/team/${team.id}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo className="justify-center mb-8" />

        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm mb-2 block" style={{color: 'var(--br-muted)'}}>Voer je teamcode in</label>
              <input
                className="input text-center text-2xl font-bold tracking-widest uppercase"
                placeholder="ABC123"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-center" style={{color: 'var(--br-red)'}}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Laden...' : 'Verder →'}
            </button>
          </form>
        )}

        {step === 'name' && team && (
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="card text-center">
              <div className="font-bold text-lg br-red">{team.name}</div>
              <div className="text-sm br-muted">Jouw team</div>
            </div>
            <div>
              <label className="text-sm mb-2 block" style={{color: 'var(--br-muted)'}}>Naam teamcaptain (jongste) 👶</label>
              <input className="input" placeholder="Voornaam" value={captainName} onChange={e => setCaptainName(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Opslaan...' : "Let's rock! 🤘"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

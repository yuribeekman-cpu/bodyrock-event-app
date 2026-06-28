'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Event = { id: string; name: string; edition: string; date: string }

export default function EventJoinPage() {
  const params = useParams()
  const router = useRouter()
  const eventCode = (params.code as string).toUpperCase()

  const [event, setEvent] = useState<Event | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if already in a team for this event
    const storedTeamId = localStorage.getItem('br_team_id')
    const storedEventCode = localStorage.getItem('br_event_code')
    if (storedTeamId && storedEventCode === eventCode) {
      router.replace(`/team/${storedTeamId}`)
      return
    }
    loadEvent()
  }, [eventCode])

  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, edition, date')
      .eq('event_code', eventCode)
      .eq('is_active', true)
      .single()

    setChecking(false)
    if (error || !data) { setNotFound(true); return }
    setEvent(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    setLoading(true)
    setError('')

    const name = teamName.trim()
    const captain = captainName.trim()

    // Check for duplicate team name
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('event_id', event.id)
      .ilike('name', name)
      .single()

    if (existing) {
      setError(`Team "${name}" bestaat al. Kies een andere naam.`)
      setLoading(false)
      return
    }

    // Generate unique join_code
    const join_code = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')

    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({ event_id: event.id, name, captain_name: captain, join_code })
      .select()
      .single()

    if (insertError) {
      setError('Er ging iets mis. Probeer opnieuw.')
      setLoading(false)
      return
    }

    localStorage.setItem('br_team_id', team.id)
    localStorage.setItem('br_team_name', team.name)
    localStorage.setItem('br_event_code', eventCode)
    router.push(`/team/${team.id}`)
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-white/60">Laden...</div>
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-4">🤔</div>
        <h1 className="text-xl font-bold mb-2">Event niet gevonden</h1>
        <p className="text-white/50 text-sm">Deze QR-code is niet geldig of het event is niet actief.<br />Vraag een trainer om hulp.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🤘</div>
          <h1 className="text-2xl font-bold">{event?.name}</h1>
          <p className="text-orange-400 text-sm font-semibold mt-1">{event?.edition}</p>
          <p className="text-white/50 text-sm mt-1">Maak je team aan en ga ervoor!</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Teamnaam 🪨</label>
            <input
              className="input"
              placeholder="bijv. De Rots Gevallen"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/60 mb-2 block">
              Naam teamcaptain (jongste) 👶
            </label>
            <input
              className="input"
              placeholder="Voornaam"
              value={captainName}
              onChange={e => setCaptainName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary text-lg py-4" disabled={loading}>
            {loading ? 'Team aanmaken...' : "Let's rock! 🤘"}
          </button>
        </form>
      </div>
    </main>
  )
}

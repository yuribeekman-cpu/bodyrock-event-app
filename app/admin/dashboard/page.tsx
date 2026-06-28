'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { getEventUrl } from '@/lib/utils'

type Event = { id: string; name: string; edition: string; date: string; is_active: boolean; event_code: string }
type Team = { id: string; name: string; join_code: string; captain_name: string; scores?: any[] }
type Challenge = { id: string; number: number; title: string; score_type: string }

const CHALLENGES_2026 = [
  { number: 1, title: "Yuri's Bodyweight Endurance Challenge", description: '', score_type: 'time' },
  { number: 2, title: "Irene's Hub Focus-Check", description: '', score_type: 'time' },
  { number: 3, title: "Lorraine's Body Rock Tunnel-Plank", description: '', score_type: 'time' },
  { number: 4, title: "Marjons Kangoeroe-Lancering", description: '', score_type: 'time' },
  { number: 5, title: "Wessels Speedladder Voetbal-Sniper", description: '', score_type: 'time' },
  { number: 6, title: "De 10-Potige Body Rock Rups", description: '', score_type: 'time' },
  { number: 7, title: "De Grote Jubileum Push-ups", description: '', score_type: 'reps' },
  { number: 8, title: "Bertjes Vertrouwensloop", description: '', score_type: 'time' },
  { number: 9, title: "Sabine's Low-Drive Coördinatie", description: '', score_type: 'time' },
  { number: 10, title: 'De "10 Jaar Body Rock" Foto-Safari', description: '', score_type: 'time' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [tab, setTab] = useState<'event' | 'qr' | 'teams' | 'scores'>('event')
  const [loading, setLoading] = useState(false)
  const [newEvent, setNewEvent] = useState({
    name: 'Body Rock Familie Fun',
    edition: 'Zomer 2026',
    date: '',
    location: 'De Balijhoeve, Zoetermeer',
  })

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const res = await fetch('/api/admin/events')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setEvents(data)
    const active = data.find((e: Event) => e.is_active)
    if (active) {
      setActiveEvent(active)
      loadTeams(active.id)
      loadChallenges(active.id)
      setTab('qr')
    }
  }

  async function loadTeams(eventId: string) {
    const res = await fetch(`/api/teams?event_id=${eventId}`)
    const data = await res.json()
    setTeams(data)
  }

  async function loadChallenges(eventId: string) {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await db.from('challenges').select('*').eq('event_id', eventId).order('number')
    setChallenges(data || [])
  }

  async function createEvent() {
    setLoading(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify({ ...newEvent, is_active: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const event = await res.json()
    setActiveEvent(event)
    setEvents(prev => [event, ...prev])

    // Auto-create challenges
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await db.from('challenges').insert(
      CHALLENGES_2026.map((c, i) => ({ ...c, event_id: event.id, sort_order: i }))
    )
    setChallenges(CHALLENGES_2026.map((c, i) => ({ ...c, id: `tmp-${i}` })))
    setLoading(false)
    setTab('qr')
  }

  const eventQrUrl = activeEvent ? getEventUrl(activeEvent.event_code) : ''

  return (
    <main className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between mb-6 mt-2">
        <h1 className="text-xl font-bold">Admin 🤘</h1>
        {activeEvent && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400">
            {activeEvent.edition}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['event', 'qr', 'teams', 'scores'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            {{ event: '📅 Event', qr: '📱 QR-code', teams: '👥 Teams', scores: '🏆 Scores' }[t]}
          </button>
        ))}
      </div>

      {/* Event tab */}
      {tab === 'event' && (
        <div className="flex flex-col gap-4">
          {!activeEvent ? (
            <div className="card">
              <h2 className="font-semibold mb-4">Nieuw event aanmaken</h2>
              <div className="flex flex-col gap-3">
                <input className="input" placeholder="Event naam" value={newEvent.name}
                  onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} />
                <input className="input" placeholder="Editie (bijv. Zomer 2026)" value={newEvent.edition}
                  onChange={e => setNewEvent(p => ({ ...p, edition: e.target.value }))} />
                <input className="input" type="date" value={newEvent.date}
                  onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
                <input className="input" placeholder="Locatie" value={newEvent.location}
                  onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                <button className="btn-primary" onClick={createEvent} disabled={loading || !newEvent.date}>
                  {loading ? 'Aanmaken...' : 'Event aanmaken → QR genereren'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card border-green-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm font-semibold">Actief event</span>
              </div>
              <div className="font-bold text-lg">{activeEvent.name}</div>
              <div className="text-white/60 text-sm">{activeEvent.edition} · {activeEvent.date}</div>
              <div className="mt-4 flex flex-col gap-2">
                {challenges.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="text-orange-400 w-5 shrink-0">{c.number}.</span>
                    <span className="flex-1 text-white/80 truncate">{c.title}</span>
                    <span className="text-white/30 text-xs shrink-0">{c.score_type === 'time' ? '⏱' : '🔢'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR tab — de centrale QR voor de dag */}
      {tab === 'qr' && (
        <div className="flex flex-col gap-4">
          {!activeEvent ? (
            <div className="card text-center text-white/50 py-10">
              Maak eerst een event aan
            </div>
          ) : (
            <>
              <div className="card flex flex-col items-center gap-4 py-8">
                <div className="text-center mb-2">
                  <div className="font-bold text-lg">{activeEvent.name}</div>
                  <div className="text-white/50 text-sm">{activeEvent.edition}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl">
                  <QRCode value={eventQrUrl} size={200} />
                </div>
                <div className="font-mono text-orange-400 text-2xl tracking-widest">
                  {activeEvent.event_code}
                </div>
                <p className="text-white/50 text-xs text-center max-w-xs">
                  Toon of print deze QR op de dag zelf. Teams scannen dit en maken zelf hun team aan.
                </p>
                <div className="bg-white/5 rounded-xl px-4 py-2 w-full text-center">
                  <span className="text-white/40 text-xs break-all">{eventQrUrl}</span>
                </div>
              </div>

              <div className="card">
                <div className="text-sm text-white/60 mb-1">Aangemelde teams</div>
                <div className="text-3xl font-bold text-orange-400">{teams.length}</div>
                <button
                  onClick={() => activeEvent && loadTeams(activeEvent.id)}
                  className="text-white/40 text-xs mt-2 hover:text-white/60 transition-colors"
                >
                  Vernieuwen ↻
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Teams tab */}
      {tab === 'teams' && (
        <div className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <div className="card text-center text-white/50 py-10">
              Nog geen teams aangemeld.<br />
              <span className="text-sm">Teams joinen via de QR-code.</span>
            </div>
          ) : (
            teams.map(team => (
              <div key={team.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{team.name}</div>
                  <div className="text-white/50 text-sm">Captain: {team.captain_name || '—'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-orange-400 font-bold">{team.scores?.length || 0}</div>
                  <div className="text-white/40 text-xs">challenges</div>
                </div>
              </div>
            ))
          )}
          {teams.length > 0 && (
            <button onClick={() => activeEvent && loadTeams(activeEvent.id)} className="btn-secondary text-sm">
              Vernieuwen ↻
            </button>
          )}
        </div>
      )}

      {/* Scores tab */}
      {tab === 'scores' && (
        <div className="flex flex-col gap-3">
          <p className="text-white/50 text-sm mb-1">Scores per team — controleer of het realistisch is.</p>
          {teams
            .sort((a, b) => (b.scores?.length || 0) - (a.scores?.length || 0))
            .map(team => (
              <div key={team.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{team.name}</span>
                  <span className="text-orange-400 text-sm font-bold">
                    {team.scores?.length || 0}/{challenges.length}
                  </span>
                </div>
                {(team.scores || []).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 py-1.5 border-t border-white/5 text-sm">
                    <span className="text-white/40 w-4 shrink-0">{s.challenges?.number}</span>
                    <span className="flex-1 text-white/70 truncate">{s.challenges?.title}</span>
                    {s.photo_url && <span>📷</span>}
                  </div>
                ))}
              </div>
            ))}
          {teams.length === 0 && (
            <div className="card text-center text-white/50 py-10">Nog geen scores</div>
          )}
        </div>
      )}
    </main>
  )
}

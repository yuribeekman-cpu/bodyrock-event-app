'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { getEventUrl } from '@/lib/utils'
import Logo from '@/components/Logo'

type Event = { id: string; name: string; edition: string; date: string; is_active: boolean; event_code: string }
type Team = { id: string; name: string; join_code: string; captain_name: string; scores?: any[] }
type Challenge = { id: string; number: number; title: string; score_type: string }

const CHALLENGES_2026 = [
  { number: 1, title: "Yuri's Bodyweight Endurance Challenge", description: "Eén teamlid is de 'kruiwagen' en legt een gecontroleerd parcours af. Na telkens 5 burpees mag het volgende duo achter het eerste kruiwagenduo aan. Iedereen komt één keer aan de beurt.", score_type: 'time' },
  { number: 2, title: "Irene's Hub Focus-Check", description: "Het hele team gaat in plank-positie op het gras staan. Terwijl de rest de plank vasthoudt, sprint één gezinslid een rondje om de rest heen. De tijd stopt pas als iedereen de Hub-wacht heeft gelopen.", score_type: 'time' },
  { number: 3, title: "Lorraine's Body Rock Tunnel-Plank", description: "Alle teamleden gaan achter elkaar in een hoge plank-positie staan. De achterste persoon kruipt als een slang onder de planken door naar voren. Doe dit totdat het team 10 keer onder de tunnel door is gekropen.", score_type: 'time' },
  { number: 4, title: "Marjons Kangoeroe-Lancering", description: "De ouders vormen een stoeltje of de kinderen springen op de rug. Sprint naar de pion (20 meter). Bij de pylon doet de drager 10 Kangoeroe-skips. Sprint terug en wissel van duo tot iedereen is geweest.", score_type: 'time' },
  { number: 5, title: "Wessels Speedladder Voetbal-Sniper", description: "Rol de voetbal vanaf 5 meter met als doel deze in trede 10 stil te laten liggen. Probeer zo snel mogelijk de bal in trede 1, 5 en 10 te rollen. Terwijl één iemand mikt blijft de rest squats of lunges maken.", score_type: 'time' },
  { number: 6, title: "De 10-Potige Body Rock Rups", description: "Bind de voeten van het volledige team aan elkaar vast. Leg als één grote rups het parcours af zonder los te raken. Jullie mogen maar 10 voeten tegelijk op de grond hebben!", score_type: 'time' },
  { number: 7, title: "De Grote Jubileum Push-ups", description: "Scoor zoveel mogelijk push-ups als team in 2 minuten. Iedereen start tegelijkertijd en tel alle herhalingen bij elkaar op!", score_type: 'reps' },
  { number: 8, title: "Bertjes Vertrouwensloop", description: "Eén of twee teamleden doen hun ogen dicht. De rest loodst hem/haar met alleen aanwijzingen door een slalom van pionnen. Wissel halverwege om!", score_type: 'time' },
  { number: 9, title: "Sabine's Low-Drive Coördinatie", description: "Het hele team zakt in de krabhouding. Verplaats de bal over 10 meter en pas minimaal 10 keer naar elkaar voordat er gescoord mag worden tussen de doelpionnen.", score_type: 'time' },
  { number: 10, title: 'De "10 Jaar Body Rock" Foto-Safari', description: "Maak drie foto's: 1) Het team vormt het getal 10 op het gras. 2) Groepsfoto met originele spierballen-pose. 3) Het hele team zweeft in de lucht (sprong-foto!). Stuur de leukste in!", score_type: 'time' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [tab, setTab] = useState<'event' | 'qr' | 'teams' | 'scores'>('event')
  const [loading, setLoading] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: 'Body Rock Familie Fun', edition: 'Zomer 2026', date: '', location: 'De Balijhoeve, Zoetermeer' })
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const res = await fetch('/api/admin/events')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
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
    setTeams(await res.json())
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

    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: insertedChallenges } = await db
      .from('challenges')
      .insert(CHALLENGES_2026.map((c, i) => ({ ...c, event_id: event.id, sort_order: i })))
      .select()
    setChallenges(insertedChallenges || CHALLENGES_2026.map((c, i) => ({ ...c, id: `tmp-${i}` })))

    const challenge10 = insertedChallenges?.find((c: any) => c.number === 10)
    if (challenge10) {
      await db.from('challenge_steps').insert([
        { challenge_id: challenge10.id, step_number: 1, description: "Het team vormt met hun lichamen het getal '10' op het gras", sort_order: 0 },
        { challenge_id: challenge10.id, step_number: 2, description: 'Groepsfoto waarbij iedereen op een originele manier de spierballen-pose doet', sort_order: 1 },
        { challenge_id: challenge10.id, step_number: 3, description: 'Het hele team zweeft in de lucht (een perfect getimede sprong-foto!)', sort_order: 2 },
      ])
    }

    setLoading(false)
    setTab('qr')
  }

  const eventQrUrl = activeEvent ? getEventUrl(activeEvent.event_code) : ''

  const tabLabels = { event: '📅 Event', qr: '📱 QR-code', teams: '👥 Teams', scores: '🏆 Scores' }

  return (
    <main className="min-h-screen p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-2">
        <Logo />
        {activeEvent && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{background: 'var(--br-red)'}}>
            {activeEvent.edition}
          </span>
        )}
      </div>

      <h1 className="text-xl font-bold mb-4">Admin 🤘</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['event', 'qr', 'teams', 'scores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t
              ? { background: 'var(--br-red)', color: 'white' }
              : { background: 'rgba(0,0,0,0.07)', color: 'var(--br-muted)' }
            }>
            {tabLabels[t]}
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
                <input className="input" placeholder="Event naam" value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} />
                <input className="input" placeholder="Editie" value={newEvent.edition} onChange={e => setNewEvent(p => ({ ...p, edition: e.target.value }))} />
                <input className="input" type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
                <input className="input" placeholder="Locatie" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                <button className="btn-primary" onClick={createEvent} disabled={loading || !newEvent.date}>
                  {loading ? 'Aanmaken...' : 'Event aanmaken → QR genereren'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{borderLeft: '4px solid #22c55e'}}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-green-600">Actief event</span>
              </div>
              <div className="font-bold text-lg">{activeEvent.name}</div>
              <div className="text-sm mb-4" style={{color: 'var(--br-muted)'}}>{activeEvent.edition} · {activeEvent.date}</div>
              <div className="flex flex-col gap-2">
                {challenges.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm py-1 border-t" style={{borderColor: 'rgba(0,0,0,0.06)'}}>
                    <span className="w-5 shrink-0 font-semibold" style={{color: 'var(--br-red)'}}>{c.number}.</span>
                    <span className="flex-1 truncate">{c.title}</span>
                    <span className="text-xs shrink-0" style={{color: 'var(--br-muted)'}}>{c.score_type === 'time' ? '⏱' : '🔢'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR tab */}
      {tab === 'qr' && (
        <div className="flex flex-col gap-4">
          {!activeEvent ? (
            <div className="card text-center py-10" style={{color: 'var(--br-muted)'}}>Maak eerst een event aan</div>
          ) : (
            <>
              <div className="card flex flex-col items-center gap-4 py-8">
                <div className="text-center mb-2">
                  <div className="font-bold text-lg">{activeEvent.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>{activeEvent.edition}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border" style={{borderColor: 'rgba(0,0,0,0.1)'}}>
                  <QRCode value={eventQrUrl} size={200} />
                </div>
                <div className="font-mono font-bold text-2xl tracking-widest" style={{color: 'var(--br-red)'}}>{activeEvent.event_code}</div>
                <p className="text-xs text-center max-w-xs" style={{color: 'var(--br-muted)'}}>Teams scannen dit en maken zelf hun team aan.</p>
                <div className="rounded-xl px-4 py-2 w-full text-center" style={{background: 'rgba(0,0,0,0.04)'}}>
                  <span className="text-xs break-all" style={{color: 'var(--br-muted)'}}>{eventQrUrl}</span>
                </div>
              </div>
              <div className="card">
                <div className="text-sm mb-1" style={{color: 'var(--br-muted)'}}>Aangemelde teams</div>
                <div className="text-3xl font-bold" style={{color: 'var(--br-red)'}}>{teams.length}</div>
                <button onClick={() => activeEvent && loadTeams(activeEvent.id)} className="text-xs mt-2 hover:underline" style={{color: 'var(--br-muted)'}}>Vernieuwen ↻</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Teams tab */}
      {tab === 'teams' && (
        <div className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <div className="card text-center py-10" style={{color: 'var(--br-muted)'}}>Nog geen teams aangemeld.<br /><span className="text-sm">Teams joinen via de QR-code.</span></div>
          ) : (
            teams.map(team => (
              <div key={team.id} className="card flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{team.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>Captain: {team.captain_name || '—'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold" style={{color: 'var(--br-red)'}}>{team.scores?.filter((s: any) => s.photo_url).length || 0}</div>
                  <div className="text-xs" style={{color: 'var(--br-muted)'}}>challenges</div>
                </div>
              </div>
            ))
          )}
          {teams.length > 0 && (
            <button onClick={() => activeEvent && loadTeams(activeEvent.id)} className="btn-secondary text-sm">Vernieuwen ↻</button>
          )}
        </div>
      )}

      {/* Scores tab */}
      {tab === 'scores' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm mb-1" style={{color: 'var(--br-muted)'}}>Scores per team — controleer of het realistisch is.</p>
          {teams.sort((a, b) => (b.scores?.filter((s: any) => s.photo_url).length || 0) - (a.scores?.filter((s: any) => s.photo_url).length || 0)).map(team => (
            <div key={team.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{team.name}</span>
                <span className="font-bold text-sm" style={{color: 'var(--br-red)'}}>{team.scores?.filter((s: any) => s.photo_url).length || 0}/{challenges.length}</span>
              </div>
              {(team.scores || []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-1.5 text-sm" style={{borderTop: '1px solid rgba(0,0,0,0.06)'}}>
                  <span className="w-4 shrink-0" style={{color: 'var(--br-muted)'}}>{s.challenges?.number}</span>
                  <span className="flex-1 truncate">{s.challenges?.title}</span>
                  {s.photo_url && <span>📷</span>}
                </div>
              ))}
            </div>
          ))}
          {teams.length === 0 && <div className="card text-center py-10" style={{color: 'var(--br-muted)'}}>Nog geen scores</div>}
        </div>
      )}
    </main>
  )
}

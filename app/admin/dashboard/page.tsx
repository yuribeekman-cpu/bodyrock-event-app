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
  {
    number: 1,
    title: "Yuri's Bodyweight Endurance Challenge",
    description: "Trainer Yuri weet als geen ander hoe je met pure lichaamskracht het uiterste uit een training haalt. We trappen het jubileum compact en gecontroleerd af bij het startpunt!\n\n• Eén teamlid is de 'kruiwagen' en legt een gecontroleerd parcours in de beleeftuin tussen de pionnen heen en terug af. Na telkens 5 burpees mag het volgende duo achter het eerste kruiwagenduo aan.\n• Iedereen komt één keer aan de beurt als kruiwagen.",
    score_type: 'time',
  },
  {
    number: 2,
    title: "Irene's Hub Focus-Check",
    description: "Weet jij waar de Body Rock Hub is? De Hub is sinds kort de plek waar de Ready trainingen gegeven worden. Het pad er naartoe kan alleen bewandeld worden met walking lunges, terug kan je alleen als stoere bear, dus laat je beste bearwalk zien.\n\n• Het hele team gaat in een strakke plank-positie (hoge of lage plank) op het gras staan, met de blik gericht op de Hub.\n• Terwijl de rest de plank vasthoudt, sprint één gezinslid een snel en geruisloos rondje om de rest heen.\n• Zodra de loper terug is, wisselt de beurt. De tijd stopt pas als iedereen de Hub-wacht heeft gelopen. Houd het fluisterend!",
    score_type: 'time',
  },
  {
    number: 3,
    title: "Lorraine's Body Rock Tunnel-Plank",
    description: "De verjaardagstaart moet veilig door de jungle worden getransporteerd via een menselijke tunnel!\n\n• Alle teamleden (behalve één) gaan achter elkaar in een hoge plank-positie staan.\n• De achterste persoon kruipt als een slang onder de planken door naar voren.\n• Doe dit totdat het volledige team in totaal 10 keer onder de tunnel door is gekropen.",
    score_type: 'time',
  },
  {
    number: 4,
    title: "Marjons Kangoeroe-Lancering",
    description: "Trainster Marjon houdt wel van een sprintje en een flinke sprong. Zij daagt jullie uit om explosief over het veld te vliegen en kostbare seconden te winnen voor jullie teamscore!\n\n• De ouders vormen een 'stoeltje' of de kinderen springen op de rug (piggyback).\n• Sprint naar de pion (20 meter verderop). Bij de pylon doet de drager 10 'Kangoeroe-skips' (hoge sprongen).\n• Sprint terug en wissel van duo tot iedereen is geweest.",
    score_type: 'time',
  },
  {
    number: 5,
    title: "Wessels Speedladder Voetbal-Sniper",
    description: "Trainer Wessel test vandaag jullie ultieme precisie en balgevoel met de jubileum-voetbal!\n\n• Leg de speedladder uit op het grasveld. De treden van de ladder zijn genummerd van 1 tot en met 10.\n• De gezinsleden moeten om de beurt vanaf een afstand (bijv. 5 meter) de voetbal rollen met als doel deze precies in trede 10 stil te laten liggen.\n• De uitdaging: probeer zo snel mogelijk de bal achter elkaar in trede 1, trede 5 en trede 10 te rollen. Terwijl één iemand mikt, blijft de rest van de familie squats of lunges maken totdat het is gelukt!",
    score_type: 'time',
  },
  {
    number: 6,
    title: "De 10-Potige Body Rock Rups",
    description: "Verander als gezin in één reusachtige Body Rock Rups met maar 10 voeten op de grond!\n\n• Bind de voeten van het volledige team aan elkaar vast.\n• Leg als één grote brede rups het aangegeven parcours af zonder los te raken.",
    score_type: 'time',
  },
  {
    number: 7,
    title: "De Grote Jubileum Push-ups",
    description: "10 jaar Body Rock betekent spierballen tonen! Scoor zoveel mogelijk herhalingen als team in 2 minuten.\n\n• Iedereen start tegelijkertijd.\n• Tel alle herhalingen bij elkaar op!",
    score_type: 'reps',
  },
  {
    number: 8,
    title: "Bertjes Vertrouwensloop",
    description: "Bertje test jullie blindelings vertrouwen. Als de avond valt in het Balijbos, moet je elkaar blind kunnen vinden!\n\n• Eén of twee teamleden doen hun ogen dicht (of krijgen een blinddoek).\n• De rest van het team mag de 'blinde' niet aanraken, maar loodst hem/haar met alleen aanwijzingen door een slalom van pionnen.\n• Wissel halverwege om!",
    score_type: 'time',
  },
  {
    number: 9,
    title: "Sabine's Low-Drive Coördinatie",
    description: "Trainster Sabine houdt van uitdagende bewegingsvormen waarbij je spieren diep moeten gaan. Ze daagt jullie uit voor een coördinatietest op een heel ander niveau!\n\n• Het hele team zakt in de bekende krabhouding (handen en voeten op de grond, buik omhoog richting de hemel).\n• In deze uitdagende positie moeten jullie de bal over een afstand van 10 meter verplaatsen én de bal minimaal 10 keer strak naar elkaar overpassen voordat er gescoord mag worden tussen de doelpionnen.",
    score_type: 'time',
  },
  {
    number: 10,
    title: 'De "10 Jaar Body Rock" Foto-Safari',
    description: "Leg de bewijsstukken vast voor de Body Rock Hall of Fame! Maak de volgende supertoffe foto's en zorg dat ze leuker zijn dan de foto's van de andere teams (tip: je mag meerdere foto's maken om te testen en stuur de leukste in):\n\n1. Een foto waarbij het team met hun lichamen het getal '10' vormt op het gras.\n2. Een groepsfoto waarbij iedereen op een originele manier de spierballen-pose doet.\n3. Het hele team dat 'zweeft' in de lucht (een perfect getimede sprong-foto!).",
    score_type: 'time',
  },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [tab, setTab] = useState<'events' | 'qr' | 'teams' | 'scores'>('events')
  const [loading, setLoading] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: 'Body Rock Familie Fun', edition: 'Zomer 2026 — Groep B', date: '', location: 'De Balijhoeve, Zoetermeer' })
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const res = await fetch('/api/admin/events')
    if (res.status === 401) { router.push('/admin'); return }
    const data = await res.json()
    setEvents(data)
    const active = data.find((e: Event) => e.is_active)
    if (active && !selectedEvent) {
      selectEvent(active, data)
    }
  }

  async function selectEvent(event: Event, allEvents?: Event[]) {
    setSelectedEvent(event)
    setTab('qr')
    const res = await fetch(`/api/teams?event_id=${event.id}`)
    setTeams(await res.json())
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await db.from('challenges').select('*').eq('event_id', event.id).order('number')
    setChallenges(data || [])
  }

  async function toggleActive(event: Event) {
    const res = await fetch('/api/admin/events', {
      method: 'PATCH',
      body: JSON.stringify({ id: event.id, is_active: !event.is_active }),
      headers: { 'Content-Type': 'application/json' },
    })
    const updated = await res.json()
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    if (selectedEvent?.id === updated.id) setSelectedEvent(updated)
  }

  async function createEvent() {
    setLoading(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify({ ...newEvent, is_active: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const event = await res.json()
    setEvents(prev => [event, ...prev])
    setSelectedEvent(event)
    setShowNewForm(false)

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

    setTeams([])
    setLoading(false)
    setTab('qr')
  }

  const eventQrUrl = selectedEvent ? getEventUrl(selectedEvent.event_code) : ''
  const tabLabels = { events: '📅 Events', qr: '📱 QR-code', teams: '👥 Teams', scores: '🏆 Scores' }

  return (
    <main className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between mb-6 mt-2">
        <Logo />
        {selectedEvent && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{background: selectedEvent.is_active ? 'var(--br-red)' : 'rgba(0,0,0,0.3)'}}>
            {selectedEvent.edition}
          </span>
        )}
      </div>

      <h1 className="text-xl font-bold mb-4">Admin 🤘</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['events', 'qr', 'teams', 'scores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t ? { background: 'var(--br-red)', color: 'white' } : { background: 'rgba(0,0,0,0.07)', color: 'var(--br-muted)' }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Events tab — overzicht van alle events */}
      {tab === 'events' && (
        <div className="flex flex-col gap-4">
          {events.map(event => (
            <div key={event.id} className="card" style={selectedEvent?.id === event.id ? { borderLeft: '3px solid var(--br-red)' } : {}}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold">{event.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>{event.edition} · {event.date}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${event.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-xs" style={{color: 'var(--br-muted)'}}>{event.is_active ? 'actief' : 'inactief'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => selectEvent(event)} className="btn-primary text-sm py-1.5 px-3">
                  Beheren →
                </button>
                <button onClick={() => toggleActive(event)} className="btn-secondary text-sm py-1.5 px-3">
                  {event.is_active ? 'Deactiveren' : 'Activeren'}
                </button>
              </div>
            </div>
          ))}

          {/* Nieuw event aanmaken */}
          {!showNewForm ? (
            <button onClick={() => setShowNewForm(true)} className="btn-secondary text-sm py-3">
              + Nieuw event aanmaken
            </button>
          ) : (
            <div className="card">
              <h2 className="font-semibold mb-4">Nieuw event</h2>
              <div className="flex flex-col gap-3">
                <input className="input" placeholder="Event naam" value={newEvent.name} onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))} />
                <input className="input" placeholder="Editie (bijv. Zomer 2026 — Groep B)" value={newEvent.edition} onChange={e => setNewEvent(p => ({ ...p, edition: e.target.value }))} />
                <input className="input" type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
                <input className="input" placeholder="Locatie" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" onClick={createEvent} disabled={loading || !newEvent.date}>
                    {loading ? 'Aanmaken...' : 'Aanmaken'}
                  </button>
                  <button className="btn-secondary px-4" onClick={() => setShowNewForm(false)}>Annuleer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR tab */}
      {tab === 'qr' && (
        <div className="flex flex-col gap-4">
          {!selectedEvent ? (
            <div className="card text-center py-10" style={{color: 'var(--br-muted)'}}>Selecteer eerst een event</div>
          ) : (
            <>
              <div className="card flex flex-col items-center gap-4 py-8">
                <div className="text-center mb-2">
                  <div className="font-bold text-lg">{selectedEvent.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>{selectedEvent.edition}</div>
                  {!selectedEvent.is_active && (
                    <div className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{background: 'rgba(0,0,0,0.08)', color: 'var(--br-muted)'}}>inactief</div>
                  )}
                </div>
                <div className="bg-white p-4 rounded-2xl border" style={{borderColor: 'rgba(0,0,0,0.1)'}}>
                  <QRCode value={eventQrUrl} size={200} />
                </div>
                <div className="font-mono font-bold text-2xl tracking-widest" style={{color: 'var(--br-red)'}}>{selectedEvent.event_code}</div>
                <div className="rounded-xl px-4 py-2 w-full text-center" style={{background: 'rgba(0,0,0,0.04)'}}>
                  <span className="text-xs break-all" style={{color: 'var(--br-muted)'}}>{eventQrUrl}</span>
                </div>
              </div>
              <div className="card">
                <div className="text-sm mb-1" style={{color: 'var(--br-muted)'}}>Aangemelde teams</div>
                <div className="text-3xl font-bold" style={{color: 'var(--br-red)'}}>{teams.length}</div>
                <button onClick={() => selectedEvent && selectEvent(selectedEvent)} className="text-xs mt-2 hover:underline" style={{color: 'var(--br-muted)'}}>Vernieuwen ↻</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Teams tab */}
      {tab === 'teams' && (
        <div className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <div className="card text-center py-10" style={{color: 'var(--br-muted)'}}>Nog geen teams aangemeld.</div>
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
            <button onClick={() => selectedEvent && selectEvent(selectedEvent)} className="btn-secondary text-sm">Vernieuwen ↻</button>
          )}
        </div>
      )}

      {/* Scores tab */}
      {tab === 'scores' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm mb-1" style={{color: 'var(--br-muted)'}}>Scores per team — controleer of het realistisch is.</p>
          {[...teams].sort((a, b) => (b.scores?.filter((s: any) => s.photo_url).length || 0) - (a.scores?.filter((s: any) => s.photo_url).length || 0)).map(team => (
            <div key={team.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{team.name}</span>
                <span className="font-bold text-sm" style={{color: 'var(--br-red)'}}>{team.scores?.filter((s: any) => s.photo_url).length || 0}/{challenges.length}</span>
              </div>
              {(team.scores || []).filter((s: any) => s.photo_url).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-1.5 text-sm" style={{borderTop: '1px solid rgba(0,0,0,0.06)'}}>
                  <span className="w-4 shrink-0" style={{color: 'var(--br-muted)'}}>{s.challenges?.number}</span>
                  <span className="flex-1 truncate">{s.challenges?.title}</span>
                  <span>📷</span>
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

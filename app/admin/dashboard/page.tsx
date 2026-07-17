'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { getEventUrl } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

type Event = { id: string; name: string; edition: string; date: string; is_active: boolean; event_code: string }
type Team = { id: string; name: string; join_code: string; captain_name: string; scores?: any[] }
type Challenge = { id: string; number: number; title: string; score_type: string }

const CHALLENGES_2026 = [
  {
    number: 1,
    title: '🪨 De Body Rock Kruiwagen Crew',
    description: `Pure lichaamskracht. Beheerst, gefocust, samen sterker.

🛞 Eén gezinslid is de kruiwagen en loopt op de handen een parcours van 10 meter.
🤝 De helper pakt de enkels (zwaar) of de knieën (een stuk makkelijker) — kies wat past.
🦵 De rest houdt 30 seconden een squat hold en telt hardop af.
🔁 Iedereen is één keer de kruiwagen, op jouw tempo.
🐻 Te zwaar of pols niet blij? Dan doe je het parcours als bearcrawl (op handen en voeten, knieën net van de grond).`,
    score_type: 'time',
  },
  {
    number: 2,
    title: '🪨 De Lunge & Crawl Estafette',
    description: `Focus is niet stilstaan. Focus is doorgaan als het brandt.

🎯 Zet een pion op 25 meter — dat is jullie punt.
🚶 Twee teamleden lopen er met walking lunges naartoe (grote stap, achterste knie zakt richting de grond).
🐻 Terug gaan ze als bearcrawl, zo strak mogelijk.
📣 De rest is het levende scorebord: elke lunge hardop meetellen en aanmoedigen.
🚦 De jongste is startcommandant: hij of zij telt af en roept "GO" — niemand vertrekt zonder dat sein.
🔁 Terug bij de start? High five en de volgende twee gaan.
⏱️ De klok stopt pas als iedereen is geweest.`,
    score_type: 'time',
  },
  {
    number: 3,
    title: '🪨 De Body Rock Tunnel',
    description: `Eén vloeiende machine. Samen sterker.

〰️ Vorm de tunnel: ga achter elkaar in hoge plank — dat is de tunnel.
📣 De achterste roept "DOOR" en tijgert plat op z'n buik tussen de benen door naar voren.
✅ Vooraan aansluiten in hoge plank — en de nieuwe achterste vertrekt.
🔁 Klaar als iedereen twee keer door de tunnel is geweest.
🚪 De jongsten vormen geen tunnel maar staan bij de pion als eindpoort en maken foto's.`,
    score_type: 'time',
  },
  {
    number: 4,
    title: '🪨 De Kangoeroe-Lancering',
    description: `Hartslag omhoog, meters maken.

🦘 Een volwassene draagt een kind op de rug (piggyback) of op een handenstoeltje.
🏃 Sprint samen naar de pion op 20 meter.
⬆️ Bij de pion: kind op de grond zetten — samen 10 hoge kangoeroesprongen, knieën hoog.
🏃 Sprint terug en wissel direct naar het volgende duo.
👥 Dragen geen optie? Dan spring je als duo zij aan zij het parcours — even hard, even leuk.`,
    score_type: 'time',
  },
  {
    number: 5,
    title: '🪨 De Speedladder Sniper Relay',
    description: `Precisie onder hartslag. Daar scheiden zich de wegen.

🏃 Sprint eerst met snelle voetjes door de speedladder heen en terug.
🦵🏻 Aan het eind van de speedladder ligt de jubileumbal.
⚽ Schop of rol de bal naar de ladder: kids vanaf 3 meter, volwassenen vanaf 5 meter.
🎯 Bal stil op trede 10 = 10 punten, trede 8/9/11/12 = 5 punten.
📣 De rest van het team moedigt keihard aan tijdens het mikken.
🔁 Iedereen twee beurten, punten optellen voor de teamscore.`,
    score_type: 'reps',
  },
  {
    number: 6,
    title: '🪨 De Body Rock Brug',
    description: `Eén team. Eén brug. Samen rock solide.

🧱 Ga achter elkaar in hoge plank liggen, allemaal dezelfde kant op, hoofd naar de voeten van de voorganger.
🦶 Leg je voeten op de schouders van degene achter je.
🧍 De achterste houdt de voeten op de grond en is het anker.
⏱️ Houd de brug 30 seconden vast, samen hardop aftellen.
🧒 Iedereen onder de 1,40 m doet niet mee aan de brug, maar telt af en checkt de heupen — die zakken als eerste.
🤝 Zakt er één door? Dan zakt de hele brug — en begin je opnieuw.
📸 Gehaald? Foto, direct de Hall of Fame in.`,
    score_type: 'time',
  },
  {
    number: 7,
    title: '🪨 De 10-Jaar High-Five Push-ups',
    description: `Tien jaar spierballen en doorzettingsvermogen.

🎯 Eén high five = 1 punt.
👥 Ga in duo's tegenover elkaar liggen, hoofden naar elkaar toe.
💪 Zak samen naar beneden voor een push-up — vanaf de tenen of vanaf de knieën, jouw tempo.
🙌 Bovenin geef je elkaar een high five, links en rechts om en om.
⏱️ Twee minuten lang zoveel mogelijk high fives.
➕ Tel alle duo-scores op tot één teamscore.`,
    score_type: 'reps',
  },
  {
    number: 8,
    title: '🪨 De Blinde Vertrouwensloop',
    description: `Blindelings op jezelf en de ander vertrouwen.

👥 Maak duo's — één doet de ogen dicht.
🗣️ De ander loodst puur met stem, zonder aanraken.
🚶 Wandelen, niet rennen, en alleen over vlak gras.
🧒 Te spannend voor de jongsten? Hand op de schouder mag.
🔁 Wissel halverwege om.
⬆️ Beiden binnen? 10 sprongen samen als finish.`,
    score_type: 'time',
  },
  {
    number: 9,
    title: '🪨 Crab Soccer',
    description: `Core, coördinatie en veel gelach.

🦀 Zak in de krabhouding: handen en voeten op de grond, buik omhoog, billen los van het gras.
⚽ Verplaats de bal zo 5 meter tussen de pionnen door.
🔄 Speel de bal minimaal 5 keer met je voeten naar elkaar over.
🧮 De jongste is teller en keeper: telt de passes hardop mee en verdedigt het doel staand.
🥅 Pas na 5 passes mag er gescoord worden tussen de doelpionnen.
🐻 Schouder niet blij? Doe hetzelfde in bearcrawl-houding, buik naar de grond.`,
    score_type: 'time',
  },
  {
    number: 10,
    title: '🪨 De Body Rock Hall of Fame',
    description: `Alles gehad. Nu vastleggen.

🤩 Zweeffoto: iedereen tegelijk in de lucht, perfect getimed. Lukt de sprong niet? Gewoon nog een keer — elke poging telt.`,
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
  const [newEvent, setNewEvent] = useState({ name: 'Body Rock Familie Fun', edition: 'Zomer 2026', date: '', location: 'De Balijhoeve, Zoetermeer' })
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
    const { data } = await supabase.from('challenges').select('*').eq('event_id', event.id).order('number')
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
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify({ ...newEvent, is_active: true }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`Event aanmaken mislukt (HTTP ${res.status}).`)
      const event = await res.json()

      // Challenges wegschrijven — fout niet opslikken maar opgooien.
      const { data: insertedChallenges, error: chErr } = await supabase
        .from('challenges')
        .insert(CHALLENGES_2026.map((c, i) => ({ ...c, event_id: event.id, sort_order: i })))
        .select()
      if (chErr) throw new Error(`Challenges toevoegen mislukt: ${chErr.message}`)

      const challenge10 = insertedChallenges?.find((c: any) => c.number === 10)
      if (challenge10) {
        const { error: stepErr } = await supabase.from('challenge_steps').insert([
          { challenge_id: challenge10.id, step_number: 1, description: "🔟 Maak met jullie lichamen het getal '10' op het gras.", sort_order: 0 },
          { challenge_id: challenge10.id, step_number: 2, description: '💪🏼 Groepsfoto waarbij iedereen de spierballen-pose doet.', sort_order: 1 },
          { challenge_id: challenge10.id, step_number: 3, description: '❓ Balijhoeve special: maak een selfie met iets dat out of place is op de boerderij.', sort_order: 2 },
        ])
        if (stepErr) throw new Error(`Sub-opdrachten toevoegen mislukt: ${stepErr.message}`)
      }

      // Verifieer uit de DB (niet uit de array in het geheugen): tel terug wat er echt staat.
      const { count: chCount, error: cntErr } = await supabase
        .from('challenges').select('id', { count: 'exact', head: true }).eq('event_id', event.id)
      if (cntErr) throw new Error(`Verificatie van challenges mislukt: ${cntErr.message}`)
      const { count: stepCount } = await supabase
        .from('challenge_steps').select('id, challenges!inner(event_id)', { count: 'exact', head: true })
        .eq('challenges.event_id', event.id)

      if (chCount !== CHALLENGES_2026.length || stepCount !== 3) {
        // Beter geen event dan een leeg event: zet 'm meteen inactief.
        await supabase.from('events').update({ is_active: false }).eq('id', event.id)
        throw new Error(
          `Verificatie faalde: ${chCount} challenges + ${stepCount} sub-opdrachten in de DB, ` +
          `verwacht ${CHALLENGES_2026.length} + 3. Het event is op INACTIEF gezet — niet gebruiken. ` +
          `Probeer opnieuw of check de database.`
        )
      }

      // Alles klopt — nu pas de UI-state bijwerken.
      setEvents(prev => [event, ...prev])
      setSelectedEvent(event)
      setChallenges(insertedChallenges || [])
      setTeams([])
      setShowNewForm(false)
      setTab('qr')
    } catch (err) {
      // Blokkerende foutmelding — geen stille fout.
      alert(`⚠️ ${(err as Error).message}`)
      loadEvents()
    } finally {
      setLoading(false)
    }
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

      <h1 className="text-xl font-bold mb-4">Admin 💪🏼</h1>

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

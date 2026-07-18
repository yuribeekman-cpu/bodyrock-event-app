'use client'
import { useState, useEffect } from 'react'
import { supabase, Score } from '@/lib/supabase'
import Logo from '@/components/Logo'
import Link from 'next/link'

type TeamSummary = { id: string; name: string; captain_name: string; completed: number; scores: Score[] }
type PhotoEntry = { id: string; photo_url: string; team_name: string; label: string; submitted_at: string; isFun?: boolean }

export default function BoardPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [activeEvent, setActiveEvent] = useState<{ id: string; name: string; edition: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [myTeamId] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('br_team_id') : null)

  useEffect(() => {
    loadBoard()
    const channel = supabase.channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => loadBoard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fun_photos' }, () => loadBoard())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadBoard() {
    const { data: eventData } = await supabase.from('events').select('*').eq('is_active', true).single()
    if (!eventData) { setLoading(false); return }
    setActiveEvent(eventData)

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, captain_name, scores(id, challenge_id, minutes, seconds, reps, photo_url, submitted_at, challenges(title, number))')
      .eq('event_id', eventData.id)

    const allPhotos: PhotoEntry[] = []

    if (teamsData) {
      const summaries: TeamSummary[] = teamsData.map((t: any) => {
        // Alleen scores MET foto tellen als "afgerond"
        const completedScores = (t.scores || []).filter((s: any) => s.photo_url)
        return {
          id: t.id, name: t.name, captain_name: t.captain_name || '?',
          completed: completedScores.length, scores: t.scores || [],
        }
      })
      summaries.sort((a, b) => b.completed - a.completed)
      setTeams(summaries)

      teamsData.forEach((t: any) => {
        t.scores?.forEach((s: any) => {
          if (s.photo_url) allPhotos.push({ id: s.id, photo_url: s.photo_url, team_name: t.name, label: s.challenges?.title || '', submitted_at: s.submitted_at })
        })
      })
    }

    // Fun foto's erbij laden
    const { data: funData } = await supabase
      .from('fun_photos')
      .select('id, photo_url, submitted_at, teams(name)')
      .eq('teams.event_id', eventData.id)

    funData?.forEach((f: any) => {
      if (f.teams) allPhotos.push({ id: f.id, photo_url: f.photo_url, team_name: f.teams.name, label: 'Fun foto 💪🏼', submitted_at: f.submitted_at, isFun: true })
    })

    allPhotos.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    setPhotos(allPhotos)
    setLoading(false)
  }

  const top = teams[0]
  const runnerUp = teams[1]

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{color: 'var(--br-muted)'}}>Laden...</div>

  if (!activeEvent) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Logo className="justify-center mb-6" />
        <p style={{color: 'var(--br-muted)'}}>Geen actief event gevonden</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <Logo />
        {myTeamId && (
          <Link href={`/team/${myTeamId}`} className="btn-secondary text-sm py-2 px-4">← Challenges</Link>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold">{activeEvent.name}</h1>
        <p className="text-sm" style={{color: 'var(--br-muted)'}}>{activeEvent.edition}</p>
      </div>

      {/* Podium */}
      {(top || runnerUp) && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: 'var(--br-muted)'}}>Scorebord</h2>
          <div className="flex flex-col gap-3">
            {top && (
              <div className="card flex items-center gap-4" style={{borderLeft: '4px solid var(--br-red)'}}>
                <div className="text-3xl">🥇</div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{top.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>Captain: {top.captain_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl" style={{color: 'var(--br-red)'}}>{top.completed}</div>
                  <div className="text-xs" style={{color: 'var(--br-muted)'}}>challenges</div>
                </div>
              </div>
            )}
            {runnerUp && (
              <div className="card flex items-center gap-4">
                <div className="text-2xl">🥈</div>
                <div className="flex-1">
                  <div className="font-semibold">{runnerUp.name}</div>
                  <div className="text-sm" style={{color: 'var(--br-muted)'}}>Captain: {runnerUp.captain_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{runnerUp.completed}</div>
                  <div className="text-xs" style={{color: 'var(--br-muted)'}}>challenges</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo feed */}
      {photos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: 'var(--br-muted)'}}>Live foto&apos;s</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map(p => (
              <div key={p.id} className="rounded-xl overflow-hidden relative" style={{aspectRatio: '9/16'}}>
                <img src={p.photo_url} alt={p.label} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-2" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)'}}>
                  <div className="text-white text-xs font-semibold truncate">{p.team_name}</div>
                  <div className="text-xs truncate" style={{color: p.isFun ? 'var(--br-offwhite)' : 'rgba(255,255,255,0.7)'}}>{p.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && teams.length === 0 && (
        <div className="text-center mt-12" style={{color: 'var(--br-muted)'}}>
          <div className="text-4xl mb-3">🪨</div>
          <p>Nog geen scores of foto&apos;s — go go go!</p>
        </div>
      )}
    </main>
  )
}

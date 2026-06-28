'use client'
import { useState, useEffect } from 'react'
import { supabase, Score } from '@/lib/supabase'

type TeamSummary = {
  id: string
  name: string
  captain_name: string
  completed: number
  scores: Score[]
}

type PhotoEntry = {
  id: string
  photo_url: string
  team_name: string
  challenge_title: string
  submitted_at: string
}

export default function BoardPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [activeEvent, setActiveEvent] = useState<{ id: string; name: string; edition: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBoard()

    // Realtime subscription
    const channel = supabase
      .channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => loadBoard())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadBoard() {
    // Get active event
    const { data: eventData } = await supabase.from('events').select('*').eq('is_active', true).single()
    if (!eventData) { setLoading(false); return }
    setActiveEvent(eventData)

    // Get teams with scores
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, captain_name, scores(id, challenge_id, minutes, seconds, reps, photo_url, submitted_at, challenges(title, number))')
      .eq('event_id', eventData.id)

    if (teamsData) {
      const summaries: TeamSummary[] = teamsData.map((t: any) => ({
        id: t.id,
        name: t.name,
        captain_name: t.captain_name || '?',
        completed: t.scores?.length || 0,
        scores: t.scores || [],
      }))

      // Sort by completed count desc
      summaries.sort((a, b) => b.completed - a.completed)
      setTeams(summaries)

      // Build photo feed
      const allPhotos: PhotoEntry[] = []
      teamsData.forEach((t: any) => {
        t.scores?.forEach((s: any) => {
          if (s.photo_url) {
            allPhotos.push({
              id: s.id,
              photo_url: s.photo_url,
              team_name: t.name,
              challenge_title: s.challenges?.title || '',
              submitted_at: s.submitted_at,
            })
          }
        })
      })
      allPhotos.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      setPhotos(allPhotos)
    }

    setLoading(false)
  }

  const top = teams[0]
  const runnerUp = teams[1]

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/60">Laden...</div>

  if (!activeEvent) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🤘</div>
        <p className="text-white/60">Geen actief event gevonden</p>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen p-4">
      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <h1 className="text-2xl font-bold">{activeEvent.name}</h1>
        <p className="text-white/50 text-sm">{activeEvent.edition}</p>
      </div>

      {/* Podium */}
      {(top || runnerUp) && (
        <div className="mb-6">
          <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Scorebord</h2>
          <div className="flex flex-col gap-3">
            {top && (
              <div className="card border-orange-500/50 flex items-center gap-4">
                <div className="text-3xl">🥇</div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{top.name}</div>
                  <div className="text-white/50 text-sm">Captain: {top.captain_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-orange-400 font-bold text-xl">{top.completed}</div>
                  <div className="text-white/40 text-xs">challenges</div>
                </div>
              </div>
            )}
            {runnerUp && (
              <div className="card flex items-center gap-4">
                <div className="text-2xl">🥈</div>
                <div className="flex-1">
                  <div className="font-semibold">{runnerUp.name}</div>
                  <div className="text-white/50 text-sm">Captain: {runnerUp.captain_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 font-bold text-lg">{runnerUp.completed}</div>
                  <div className="text-white/40 text-xs">challenges</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo feed */}
      {photos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Live foto&apos;s</h2>
          <div className="grid grid-cols-2 gap-3">
            {photos.map(p => (
              <div key={p.id} className="rounded-xl overflow-hidden relative">
                <img src={p.photo_url} alt={p.challenge_title} className="w-full h-36 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="text-white text-xs font-semibold truncate">{p.team_name}</div>
                  <div className="text-white/60 text-xs truncate">{p.challenge_title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && teams.length === 0 && (
        <div className="text-center text-white/30 mt-12">
          <div className="text-4xl mb-3">🪨</div>
          <p>Nog geen scores of foto&apos;s — go go go!</p>
        </div>
      )}
    </main>
  )
}

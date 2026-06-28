'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Challenge, Score } from '@/lib/supabase'
import { formatScore } from '@/lib/utils'
import Link from 'next/link'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [team, setTeam] = useState<{ name: string; event_id: string } | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [reps, setReps] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Verify this team belongs to this user session
    const storedId = localStorage.getItem('br_team_id')
    if (!storedId || storedId !== teamId) {
      router.push('/join')
      return
    }
    loadData()
  }, [teamId])

  async function loadData() {
    const { data: teamData } = await supabase.from('teams').select('name, event_id').eq('id', teamId).single()
    if (!teamData) { router.push('/join'); return }
    setTeam(teamData)

    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*')
      .eq('event_id', teamData.event_id)
      .order('number')
    setChallenges(challengeData || [])

    const { data: scoreData } = await supabase.from('scores').select('*').eq('team_id', teamId)
    const scoreMap: Record<string, Score> = {}
    scoreData?.forEach(s => { scoreMap[s.challenge_id] = s })
    setScores(scoreMap)
  }

  function openChallenge(challenge: Challenge) {
    const existing = scores[challenge.id]
    setActiveChallenge(challenge)
    setMinutes(existing?.minutes?.toString() || '')
    setSeconds(existing?.seconds?.toString() || '')
    setReps(existing?.reps?.toString() || '')
    setPhotoPreview(existing?.photo_url || null)
    setPhoto(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeChallenge) return
    setSubmitting(true)

    let photoUrl = scores[activeChallenge.id]?.photo_url || null

    // Upload photo if new one selected
    if (photo) {
      const fd = new FormData()
      fd.append('file', photo)
      fd.append('team_id', teamId)
      fd.append('challenge_id', activeChallenge.id)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      photoUrl = json.url
    }

    const payload: Record<string, unknown> = {
      team_id: teamId,
      challenge_id: activeChallenge.id,
      photo_url: photoUrl,
    }
    if (activeChallenge.score_type === 'time') {
      payload.minutes = parseInt(minutes) || 0
      payload.seconds = parseInt(seconds) || 0
    } else {
      payload.reps = parseInt(reps) || 0
    }

    const res = await fetch('/api/scores', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
    const saved = await res.json()
    setScores(prev => ({ ...prev, [activeChallenge.id]: saved }))
    setActiveChallenge(null)
    setSubmitting(false)
  }

  const completedCount = Object.keys(scores).length

  if (!team) return <div className="min-h-screen flex items-center justify-center text-white/60">Laden...</div>

  return (
    <main className="min-h-screen p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 mt-2">
        <div>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <p className="text-white/50 text-sm">{completedCount}/{challenges.length} challenges</p>
        </div>
        <Link href="/board" className="btn-secondary text-sm py-2 px-4">
          🏆 Board
        </Link>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-6">
        <div
          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${challenges.length ? (completedCount / challenges.length) * 100 : 0}%` }}
        />
      </div>

      {/* Challenges list */}
      <div className="flex flex-col gap-3">
        {challenges.map(ch => {
          const score = scores[ch.id]
          const done = !!score
          return (
            <button
              key={ch.id}
              onClick={() => openChallenge(ch)}
              className={`card text-left flex items-center gap-4 transition-all ${done ? 'border-orange-500/40' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'}`}>
                {done ? '✓' : ch.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{ch.title}</div>
                {done && (
                  <div className="text-orange-400 text-xs mt-0.5">
                    {formatScore(score, ch.score_type)} {score.photo_url ? '📷' : ''}
                  </div>
                )}
              </div>
              <div className="text-white/30 text-sm">→</div>
            </button>
          )
        })}
      </div>

      {/* Challenge modal */}
      {activeChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50 p-0">
          <div className="bg-zinc-900 w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-orange-400 text-sm font-semibold mb-1">Challenge {activeChallenge.number}</div>
                <h2 className="text-xl font-bold">{activeChallenge.title}</h2>
              </div>
              <button onClick={() => setActiveChallenge(null)} className="text-white/40 text-2xl leading-none ml-4">×</button>
            </div>

            {activeChallenge.description && (
              <p className="text-white/60 text-sm mb-5 leading-relaxed">{activeChallenge.description}</p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {activeChallenge.score_type === 'time' ? (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Tijd</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input className="input text-center text-2xl font-bold" type="number" placeholder="0" min={0} value={minutes} onChange={e => setMinutes(e.target.value)} />
                      <div className="text-center text-white/40 text-xs mt-1">minuten</div>
                    </div>
                    <div className="text-2xl flex items-center text-white/40 pb-5">:</div>
                    <div className="flex-1">
                      <input className="input text-center text-2xl font-bold" type="number" placeholder="00" min={0} max={59} value={seconds} onChange={e => setSeconds(e.target.value)} />
                      <div className="text-center text-white/40 text-xs mt-1">seconden</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Aantal herhalingen</label>
                  <input className="input text-center text-3xl font-bold" type="number" placeholder="0" min={0} value={reps} onChange={e => setReps(e.target.value)} />
                </div>
              )}

              {/* Photo upload */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Foto 📷 (verplicht)</label>
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                    >×</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-white/40 hover:border-orange-500/50 hover:text-white/60 transition-colors"
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">Foto toevoegen</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || (!photo && !scores[activeChallenge.id]?.photo_url)}
              >
                {submitting ? 'Opslaan...' : 'Challenge afronden 🤘'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

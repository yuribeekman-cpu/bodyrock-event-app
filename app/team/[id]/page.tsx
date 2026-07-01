'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Challenge, Score, ChallengeStep, StepCompletion, FunPhoto } from '@/lib/supabase'
import { formatScore, getRotatedOrder, formatTimer } from '@/lib/utils'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [team, setTeam] = useState<{ name: string; event_id: string; start_challenge: number } | null>(null)
  const [orderedChallenges, setOrderedChallenges] = useState<Challenge[]>([])
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [now, setNow] = useState(Date.now())

  // Sub-opdrachten state (alleen relevant voor challenge 10)
  const [steps, setSteps] = useState<ChallengeStep[]>([])
  const [completions, setCompletions] = useState<Record<string, StepCompletion>>({})
  const [activeStep, setActiveStep] = useState<ChallengeStep | null>(null)
  const [stepPhoto, setStepPhoto] = useState<File | null>(null)
  const [stepPhotoPreview, setStepPhotoPreview] = useState<string | null>(null)
  const [stepSubmitting, setStepSubmitting] = useState(false)
  const [stepError, setStepError] = useState('')

  // Score form state
  const [reps, setReps] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stepFileRef = useRef<HTMLInputElement>(null)

  // Fun foto state — meerdere foto's tegelijk
  const [funPhotos, setFunPhotos] = useState<FunPhoto[]>([])
  const [funModalOpen, setFunModalOpen] = useState(false)
  const [funPhotoFiles, setFunPhotoFiles] = useState<File[]>([])
  const [funPhotoPreviews, setFunPhotoPreviews] = useState<string[]>([])
  const [funUploading, setFunUploading] = useState(false)
  const [funError, setFunError] = useState('')
  const funFileRef = useRef<HTMLInputElement>(null)
  const MAX_PHOTO_MB = 8

  useEffect(() => {
    const storedId = localStorage.getItem('br_team_id')
    if (!storedId || storedId !== teamId) { router.push('/join'); return }
    loadData()
  }, [teamId])

  // Live klok voor de actieve timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Android "terug" knop: sluit een open modal i.p.v. de pagina te verlaten
  useEffect(() => {
    function handlePopState() {
      if (activeStep) { setActiveStep(null); return }
      if (activeChallenge) { setActiveChallenge(null); return }
      if (funModalOpen) { setFunModalOpen(false); return }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeChallenge, activeStep, funModalOpen])

  // Elke keer dat een modal opent, pusht een history-entry zodat terug-knop 'm sluit
  function pushModalHistory() {
    window.history.pushState({ modal: true }, '')
  }

  // Sluit een modal en houd de history-stack synchroon (voor Android terug-knop)
  function closeModal() {
    if (window.history.state?.modal) {
      window.history.back()
    } else {
      setActiveChallenge(null)
      setActiveStep(null)
      setFunModalOpen(false)
    }
  }

  async function loadData() {
    const { data: teamData } = await supabase.from('teams').select('name, event_id, start_challenge').eq('id', teamId).single()
    if (!teamData) { router.push('/join'); return }
    setTeam(teamData)

    const { data: challengeData } = await supabase.from('challenges').select('*').eq('event_id', teamData.event_id).order('number')
    const rotated = getRotatedOrder(challengeData || [], teamData.start_challenge || 1)
    setOrderedChallenges(rotated)

    const { data: scoreData } = await supabase.from('scores').select('*').eq('team_id', teamId)
    const scoreMap: Record<string, Score> = {}
    scoreData?.forEach(s => { scoreMap[s.challenge_id] = s })
    setScores(scoreMap)

    const { data: funData } = await supabase.from('fun_photos').select('*').eq('team_id', teamId).order('submitted_at', { ascending: false })
    setFunPhotos(funData || [])
  }

  // Bepaal of een challenge ontgrendeld is: alleen de eerste niet-afgeronde challenge in de volgorde is klikbaar
  function isUnlocked(index: number): boolean {
    if (index === 0) return true
    const prevChallenge = orderedChallenges[index - 1]
    return !!scores[prevChallenge.id]?.photo_url  // alleen afgerond als foto is geüpload
  }

  async function openChallenge(challenge: Challenge, index: number) {
    if (!isUnlocked(index)) return
    pushModalHistory()

    const existing = scores[challenge.id]
    setActiveChallenge(challenge)
    setSubmitError('')
    setReps(existing?.reps?.toString() || '')
    setPhotoPreview(existing?.photo_url || null)
    setPhoto(null)

    // Timer starten als die nog niet loopt en de challenge nog niet is afgerond
    if (!existing?.started_at && !existing?.photo_url) {
      const res = await fetch('/api/scores', {
        method: 'PATCH',
        body: JSON.stringify({ team_id: teamId, challenge_id: challenge.id }),
        headers: { 'Content-Type': 'application/json' },
      })
      const updated = await res.json()
      setScores(prev => ({ ...prev, [challenge.id]: updated }))
    }

    // Sub-opdrachten laden indien aanwezig
    const res = await fetch(`/api/steps?challenge_id=${challenge.id}&team_id=${teamId}`)
    const stepData = await res.json()
    setSteps(stepData.steps || [])
    const compMap: Record<string, StepCompletion> = {}
    stepData.completions?.forEach((c: StepCompletion) => { compMap[c.step_id] = c })
    setCompletions(compMap)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function getElapsedSeconds(score?: Score): number {
    if (!score?.started_at) return 0
    const start = new Date(score.started_at).getTime()
    return Math.max(0, Math.floor((now - start) / 1000))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeChallenge) return

    if (!photo && !scores[activeChallenge.id]?.photo_url) {
      setSubmitError('📸 Helaas, zonder foto is de challenge niet compleet 😆')
      return
    }
    setSubmitError('')
    setSubmitting(true)

    try {
      let photoUrl = scores[activeChallenge.id]?.photo_url || null

      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        fd.append('team_id', teamId)
        fd.append('challenge_id', activeChallenge.id)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('upload-failed')
        const json = await uploadRes.json()
        if (!json.url) throw new Error('upload-failed')
        photoUrl = json.url
      }

      const payload: Record<string, unknown> = { team_id: teamId, challenge_id: activeChallenge.id, photo_url: photoUrl }

      if (activeChallenge.score_type === 'time') {
        const existing = scores[activeChallenge.id]
        const elapsed = getElapsedSeconds(existing)
        payload.minutes = Math.floor(elapsed / 60)
        payload.seconds = elapsed % 60
        payload.started_at = existing?.started_at || null
      } else {
        payload.reps = parseInt(reps) || 0
      }

      const res = await fetch('/api/scores', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error('save-failed')
      const saved = await res.json()
      setScores(prev => ({ ...prev, [activeChallenge.id]: saved }))
      setActiveChallenge(null)
    } catch {
      setSubmitError('Opslaan is niet gelukt — check je internetverbinding en probeer opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  // Sub-opdracht afvinken
  function handleStepPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStepPhoto(file)
    setStepPhotoPreview(URL.createObjectURL(file))
  }

  async function handleStepSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeStep) return
    if (!stepPhoto && !completions[activeStep.id]?.photo_url) return
    setStepSubmitting(true)
    setStepError('')

    try {
      let photoUrl = completions[activeStep.id]?.photo_url || null
      if (stepPhoto) {
        const fd = new FormData()
        fd.append('file', stepPhoto)
        fd.append('team_id', teamId)
        fd.append('step_id', activeStep.id)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('upload-failed')
        const json = await uploadRes.json()
        if (!json.url) throw new Error('upload-failed')
        photoUrl = json.url
      }

      const res = await fetch('/api/steps', {
        method: 'POST',
        body: JSON.stringify({ team_id: teamId, step_id: activeStep.id, photo_url: photoUrl }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('save-failed')
      const saved = await res.json()
      setCompletions(prev => ({ ...prev, [activeStep.id]: saved }))
      setActiveStep(null)
      setStepPhoto(null)
      setStepPhotoPreview(null)
    } catch {
      setStepError('Opslaan is niet gelukt — probeer opnieuw.')
    } finally {
      setStepSubmitting(false)
    }
  }

  // Fun foto upload — meerdere foto's tegelijk, met grootte-check
  function handleFunPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const tooBig = files.filter(f => f.size > MAX_PHOTO_MB * 1024 * 1024)
    if (tooBig.length) {
      setFunError(`Eén of meer foto's zijn groter dan ${MAX_PHOTO_MB}MB. Probeer een kleinere foto.`)
      return
    }

    setFunError('')
    setFunPhotoFiles(prev => [...prev, ...files])
    setFunPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  function removeFunPhoto(index: number) {
    setFunPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setFunPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleFunSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!funPhotoFiles.length) return
    setFunUploading(true)
    setFunError('')

    try {
      const newPhotos: FunPhoto[] = []
      for (const file of funPhotoFiles) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('team_id', teamId)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('upload-failed')
        const { url } = await uploadRes.json()
        if (!url) throw new Error('upload-failed')

        const res = await fetch('/api/fun-photos', {
          method: 'POST',
          body: JSON.stringify({ team_id: teamId, photo_url: url }),
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error('save-failed')
        const saved = await res.json()
        newPhotos.push(saved)
      }

      setFunPhotos(prev => [...newPhotos, ...prev])
      setFunModalOpen(false)
      setFunPhotoFiles([])
      setFunPhotoPreviews([])
    } catch {
      setFunError('Uploaden is niet gelukt — check je internetverbinding en probeer opnieuw.')
    } finally {
      setFunUploading(false)
    }
  }

  const completedCount = Object.values(scores).filter(s => s.photo_url).length
  const totalSteps = steps.length
  const completedSteps = steps.filter(s => completions[s.id]?.photo_url).length

  if (!team) return <div className="min-h-screen flex items-center justify-center" style={{color: 'var(--br-muted)'}}>Laden...</div>

  return (
    <main className="min-h-screen p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <Logo />
        <Link href="/board" className="btn-secondary text-sm py-2 px-4">🏆 Board</Link>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-bold">{team.name}</h1>
        <p className="text-sm" style={{color: 'var(--br-muted)'}}>{completedCount}/{orderedChallenges.length} challenges</p>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-2 mb-6" style={{background: 'rgba(0,0,0,0.1)'}}>
        <div className="h-2 rounded-full transition-all duration-500" style={{width: `${orderedChallenges.length ? (completedCount / orderedChallenges.length) * 100 : 0}%`, background: 'var(--br-red)'}} />
      </div>

      {/* Fun foto's sectie — bovenaan */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{color: 'var(--br-muted)'}}>Fun foto&apos;s 🤘</h2>
          <button onClick={() => { pushModalHistory(); setFunModalOpen(true) }} className="btn-secondary text-xs py-1.5 px-3">+ Toevoegen</button>
        </div>
        {funPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {funPhotos.map(p => (
              <div key={p.id} className="rounded-lg overflow-hidden" style={{ aspectRatio: '4/5' }}>
                <img src={p.photo_url} alt="Fun foto" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenges in geroteerde volgorde */}
      <div className="flex flex-col gap-3">
        {orderedChallenges.map((ch, index) => {
          const score = scores[ch.id]
          const done = !!score?.photo_url
          const unlocked = isUnlocked(index)
          const running = score?.started_at && !done
          const elapsed = running ? getElapsedSeconds(score) : 0
          const highlight = done || running

          return (
            <button
              key={ch.id}
              onClick={() => openChallenge(ch, index)}
              disabled={!unlocked}
              className="card text-left flex items-center gap-4 transition-all"
              style={{
                border: highlight ? '1.5px solid var(--br-red)' : '1px solid rgba(0,0,0,0.1)',
                opacity: unlocked ? 1 : 0.45,
                cursor: unlocked ? 'pointer' : 'not-allowed',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={done ? { background: 'var(--br-red)', color: 'white' } : { background: 'rgba(0,0,0,0.08)', color: 'var(--br-muted)' }}>
                {done ? '✓' : unlocked ? ch.number : '🔒'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{ch.title}</div>
                {done && <div className="text-xs mt-0.5" style={{color: 'var(--br-red)'}}>{formatScore(score, ch.score_type)} 📷</div>}
                {running && <div className="text-xs mt-0.5 font-mono" style={{color: 'var(--br-red)'}}>⏱ {formatTimer(elapsed)}</div>}
                {!unlocked && <div className="text-xs mt-0.5" style={{color: 'var(--br-muted)'}}>Rond eerst de vorige challenge af</div>}
              </div>
              <div style={{color: 'var(--br-muted)'}} className="text-sm">→</div>
            </button>
          )
        })}
      </div>

      {/* Challenge modal */}
      {activeChallenge && (
        <div className="fixed inset-0 flex items-end z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--br-offwhite)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--br-red)' }}>Challenge {activeChallenge.number}</div>
                <h2 className="text-xl font-bold">{activeChallenge.title}</h2>
              </div>
              <button onClick={closeModal} className="text-2xl leading-none ml-4" style={{ color: 'var(--br-muted)' }}>×</button>
            </div>

            {activeChallenge.description && (
              <div className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--br-muted)', whiteSpace: 'pre-line' }}>{activeChallenge.description}</div>
            )}

            {/* Live timer */}
            {scores[activeChallenge.id]?.started_at && !scores[activeChallenge.id]?.photo_url && (
              <div className="text-center mb-5 py-4 rounded-xl" style={{ background: 'rgba(188,0,0,0.06)' }}>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--br-muted)' }}>Tijd loopt</div>
                <div className="text-4xl font-bold font-mono" style={{ color: 'var(--br-red)' }}>
                  {formatTimer(getElapsedSeconds(scores[activeChallenge.id]))}
                </div>
              </div>
            )}

            {/* Sub-opdrachten (indien aanwezig) */}
            {steps.length > 0 && (
              <div className="mb-5">
                <div className="text-sm font-semibold mb-2">Opdrachten ({completedSteps}/{totalSteps})</div>
                <div className="flex flex-col gap-2">
                  {steps.map(step => {
                    const comp = completions[step.id]
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          pushModalHistory()
                          setActiveStep(step)
                          setStepPhotoPreview(comp?.photo_url || null)
                          setStepPhoto(null)
                        }}
                        className="card text-left flex items-center gap-3 py-3"
                        style={comp?.photo_url ? { borderLeft: '3px solid var(--br-red)' } : {}}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={comp?.photo_url ? { background: 'var(--br-red)', color: 'white' } : { background: 'rgba(0,0,0,0.08)', color: 'var(--br-muted)' }}>
                          {comp?.photo_url ? '✓' : step.step_number}
                        </div>
                        <div className="flex-1 text-sm">{step.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {activeChallenge.score_type === 'reps' && (
                <div>
                  <label className="text-sm mb-2 block" style={{ color: 'var(--br-muted)' }}>Aantal herhalingen</label>
                  <input className="input text-center text-3xl font-bold" type="number" placeholder="0" min={0} value={reps} onChange={e => setReps(e.target.value)} />
                </div>
              )}

              <div>
                <label className="text-sm mb-2 block" style={{ color: 'var(--br-muted)' }}>Foto 📷 (verplicht, stopt de timer)</label>
                {photoPreview ? (
                  <div className="relative" style={{ aspectRatio: '4/5' }}>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null) }} className="absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center text-sm" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>×</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors" style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'var(--br-muted)' }}>
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">Foto toevoegen</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </div>

              {submitError && (
                <div className="text-sm text-center rounded-xl px-4 py-3" style={{ background: 'rgba(188,0,0,0.08)', color: 'var(--br-red)' }}>
                  {submitError}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Opslaan...' : 'Challenge afronden 🤘'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sub-opdracht modal */}
      {activeStep && (
        <div className="fixed inset-0 flex items-end z-[60]" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full rounded-t-3xl p-6" style={{ background: 'var(--br-offwhite)' }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">Opdracht {activeStep.step_number}</h2>
              <button onClick={closeModal} className="text-2xl leading-none" style={{ color: 'var(--br-muted)' }}>×</button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--br-muted)' }}>{activeStep.description}</p>

            <form onSubmit={handleStepSubmit} className="flex flex-col gap-4">
              {stepPhotoPreview ? (
                <div className="relative" style={{ aspectRatio: '4/5' }}>
                  <img src={stepPhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  <button type="button" onClick={() => { setStepPhoto(null); setStepPhotoPreview(null) }} className="absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center text-sm" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>×</button>
                </div>
              ) : (
                <button type="button" onClick={() => stepFileRef.current?.click()} className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2" style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'var(--br-muted)' }}>
                  <span className="text-3xl">📷</span>
                  <span className="text-sm">Foto toevoegen</span>
                </button>
              )}
              <input ref={stepFileRef} type="file" accept="image/*" capture="environment" onChange={handleStepPhotoChange} className="hidden" />

              {stepError && (
                <div className="text-sm text-center rounded-xl px-4 py-3" style={{ background: 'rgba(188,0,0,0.08)', color: 'var(--br-red)' }}>
                  {stepError}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={stepSubmitting || (!stepPhoto && !completions[activeStep.id]?.photo_url)}>
                {stepSubmitting ? 'Opslaan...' : 'Opdracht afvinken 🤘'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fun foto modal */}
      {funModalOpen && (
        <div className="fixed inset-0 flex items-end z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--br-offwhite)' }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">Fun foto&apos;s toevoegen 🤘</h2>
              <button onClick={() => { closeModal(); setFunPhotoFiles([]); setFunPhotoPreviews([]); setFunError('') }} className="text-2xl leading-none" style={{ color: 'var(--br-muted)' }}>×</button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--br-muted)' }}>Geen score nodig — gewoon voor de lol. Je kunt meerdere foto&apos;s tegelijk kiezen (max {MAX_PHOTO_MB}MB per foto). Verschijnt op het message board!</p>

            <form onSubmit={handleFunSubmit} className="flex flex-col gap-4">
              {funPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {funPhotoPreviews.map((src, i) => (
                    <div key={i} className="relative" style={{ aspectRatio: '4/5' }}>
                      <img src={src} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      <button type="button" onClick={() => removeFunPhoto(i)} className="absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-xs" style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={() => funFileRef.current?.click()} className="w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2" style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'var(--br-muted)' }}>
                <span className="text-3xl">📷</span>
                <span className="text-sm">{funPhotoPreviews.length > 0 ? 'Meer foto\'s toevoegen' : "Foto's toevoegen"}</span>
              </button>
              <input ref={funFileRef} type="file" accept="image/*" multiple onChange={handleFunPhotoChange} className="hidden" />

              {funError && (
                <div className="text-sm text-center rounded-xl px-4 py-3" style={{ background: 'rgba(188,0,0,0.08)', color: 'var(--br-red)' }}>
                  {funError}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={!funPhotoFiles.length || funUploading}>
                {funUploading ? 'Uploaden...' : `Delen 🪨 ${funPhotoFiles.length > 0 ? `(${funPhotoFiles.length})` : ''}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

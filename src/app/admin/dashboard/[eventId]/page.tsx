export const dynamic = 'force-dynamic'

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Team {
  id: string
  naam: string
  qr_code: string
}

interface Challenge {
  id: string
  naam: string
  beschrijving: string
  max_score: number
  volgorde: number
}

export default function EventBeheer() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [eventNaam, setEventNaam] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [nieuwTeam, setNieuwTeam] = useState('')
  const [nieuweChallenge, setNieuweChallenge] = useState({ naam: '', beschrijving: '', max_score: 10 })
  const [activeTab, setActiveTab] = useState<'teams' | 'challenges'>('teams')

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: event } = await supabase.from('event_events').select('naam').eq('id', eventId).single()
    if (event) setEventNaam(event.naam)
    const { data: teamsData } = await supabase.from('event_teams').select('*').eq('event_id', eventId)
    setTeams(teamsData || [])
    const { data: challengesData } = await supabase.from('event_challenges').select('*').eq('event_id', eventId).order('volgorde')
    setChallenges(challengesData || [])
  }

  const maakTeam = async () => {
    if (!nieuwTeam.trim()) return
    const qrCode = `${eventId}:${Date.now()}`
    await supabase.from('event_teams').insert({ event_id: eventId, naam: nieuwTeam, qr_code: qrCode })
    setNieuwTeam('')
    fetchData()
  }

  const verwijderTeam = async (id: string) => {
    await supabase.from('event_scores').delete().eq('team_id', id)
    await supabase.from('event_teams').delete().eq('id', id)
    fetchData()
  }

  const maakChallenge = async () => {
    if (!nieuweChallenge.naam.trim()) return
    const volgorde = challenges.length + 1
    await supabase.from('event_challenges').insert({ event_id: eventId, ...nieuweChallenge, volgorde })
    setNieuweChallenge({ naam: '', beschrijving: '', max_score: 10 })
    fetchData()
  }

  const verwijderChallenge = async (id: string) => {
    await supabase.from('event_scores').delete().eq('challenge_id', id)
    await supabase.from('event_challenges').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin/dashboard')} className="text-gray-400 hover:text-white">
            ← Terug
          </button>
          <h1 className="text-2xl font-bold">{eventNaam}</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-5 py-2 rounded-lg font-medium ${activeTab === 'teams' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-5 py-2 rounded-lg font-medium ${activeTab === 'challenges' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Challenges ({challenges.length})
          </button>
        </div>

        {activeTab === 'teams' && (
          <div>
            <div className="bg-gray-800 rounded-xl p-5 mb-4">
              <h2 className="font-semibold mb-3">Team toevoegen</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Teamnaam"
                  value={nieuwTeam}
                  onChange={e => setNieuwTeam(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && maakTeam()}
                  className="flex-1 p-3 rounded-lg bg-gray-700 text-white outline-none"
                />
                <button onClick={maakTeam} className="bg-orange-500 hover:bg-orange-600 px-5 py-3 rounded-lg font-bold">
                  Toevoegen
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {teams.length === 0 && <p className="text-gray-400 text-center py-6">Nog geen teams</p>}
              {teams.map(team => (
                <div key={team.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{team.naam}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{team.qr_code}</p>
                  </div>
                  <button onClick={() => verwijderTeam(team.id)} className="text-red-400 hover:text-red-300 text-sm">
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div>
            <div className="bg-gray-800 rounded-xl p-5 mb-4">
              <h2 className="font-semibold mb-3">Challenge toevoegen</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Naam van de challenge"
                  value={nieuweChallenge.naam}
                  onChange={e => setNieuweChallenge({ ...nieuweChallenge, naam: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Beschrijving (optioneel)"
                  value={nieuweChallenge.beschrijving}
                  onChange={e => setNieuweChallenge({ ...nieuweChallenge, beschrijving: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none"
                />
                <div className="flex gap-3 items-center">
                  <label className="text-gray-400 text-sm">Max score:</label>
                  <input
                    type="number"
                    value={nieuweChallenge.max_score}
                    onChange={e => setNieuweChallenge({ ...nieuweChallenge, max_score: parseInt(e.target.value) })}
                    className="w-24 p-3 rounded-lg bg-gray-700 text-white outline-none"
                  />
                  <button onClick={maakChallenge} className="ml-auto bg-orange-500 hover:bg-orange-600 px-5 py-3 rounded-lg font-bold">
                    Toevoegen
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {challenges.length === 0 && <p className="text-gray-400 text-center py-6">Nog geen challenges</p>}
              {challenges.map((challenge, index) => (
                <div key={challenge.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 font-bold text-sm">#{index + 1}</span>
                      <p className="font-medium">{challenge.naam}</p>
                    </div>
                    {challenge.beschrijving && <p className="text-gray-400 text-sm mt-1">{challenge.beschrijving}</p>}
                    <p className="text-xs text-gray-500 mt-1">Max score: {challenge.max_score}</p>
                  </div>
                  <button onClick={() => verwijderChallenge(challenge.id)} className="text-red-400 hover:text-red-300 text-sm">
                    Verwijderen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

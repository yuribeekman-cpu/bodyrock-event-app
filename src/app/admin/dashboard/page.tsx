'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Event {
  id: string
  naam: string
  actief: boolean
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [nieuwEvent, setNieuwEvent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin')
      return
    }
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('event_events')
      .select('*')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  const maakEvent = async () => {
    if (!nieuwEvent.trim()) return
    await supabase.from('event_events').insert({ naam: nieuwEvent, actief: false })
    setNieuwEvent('')
    fetchEvents()
  }

  const toggleActief = async (id: string, actief: boolean) => {
    await supabase.from('event_events').update({ actief: false }).neq('id', 'none')
    if (!actief) {
      await supabase.from('event_events').update({ actief: true }).eq('id', id)
    }
    fetchEvents()
  }

  const verwijderEvent = async (id: string) => {
    if (!confirm('Event verwijderen? Dit verwijdert ook alle teams en challenges.')) return
    await supabase.from('event_scores').delete().in('challenge_id',
      (await supabase.from('event_challenges').select('id').eq('event_id', id)).data?.map(c => c.id) || []
    )
    await supabase.from('event_challenges').delete().eq('event_id', id)
    await supabase.from('event_teams').delete().eq('event_id', id)
    await supabase.from('event_events').delete().eq('id', id)
    fetchEvents()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Laden...</div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Body Rock <span className="text-orange-500">Admin</span></h1>
          <button
            onClick={() => { localStorage.removeItem('admin_auth'); router.push('/admin') }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Uitloggen
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nieuw event aanmaken</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Bijv. Zomer Event 2025"
              value={nieuwEvent}
              onChange={e => setNieuwEvent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && maakEvent()}
              className="flex-1 p-3 rounded-lg bg-gray-700 text-white outline-none"
            />
            <button
              onClick={maakEvent}
              className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-lg font-bold"
            >
              Aanmaken
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {events.length === 0 && (
            <p className="text-gray-400 text-center py-8">Nog geen events aangemaakt</p>
          )}
          {events.map(event => (
            <div key={event.id} className="bg-gray-800 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{event.naam}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${event.actief ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                  {event.actief ? '● Actief' : 'Inactief'}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/admin/dashboard/${event.id}`)}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
                >
                  Beheren
                </button>
                <button
                  onClick={() => toggleActief(event.id, event.actief)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${event.actief ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                >
                  {event.actief ? 'Deactiveren' : 'Activeren'}
                </button>
                <button
                  onClick={() => verwijderEvent(event.id)}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

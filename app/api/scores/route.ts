import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  const { data, error } = await db
    .from('scores')
    .upsert({
      team_id: body.team_id,
      challenge_id: body.challenge_id,
      minutes: body.minutes ?? null,
      seconds: body.seconds ?? null,
      reps: body.reps ?? null,
      photo_url: body.photo_url ?? null,
      verified: false,
    }, { onConflict: 'team_id,challenge_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('team_id')
  const eventId = req.nextUrl.searchParams.get('event_id')
  const db = getServerClient()

  if (teamId) {
    const { data, error } = await db.from('scores').select('*, challenges(*)').eq('team_id', teamId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (eventId) {
    const { data, error } = await db
      .from('scores')
      .select('*, teams!inner(event_id, name), challenges(number, title, score_type)')
      .eq('teams.event_id', eventId)
      .order('submitted_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json([])
}

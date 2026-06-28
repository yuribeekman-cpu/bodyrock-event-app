import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { generateJoinCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id')
  const db = getServerClient()

  let query = db.from('teams').select(`*, scores(*, challenges(score_type, number, title))`)
  if (eventId) query = query.eq('event_id', eventId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { event_id, name, captain_name } = await req.json()
  const db = getServerClient()

  const join_code = generateJoinCode()

  const { data, error } = await db
    .from('teams')
    .insert({ event_id, name, captain_name: captain_name || null, join_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

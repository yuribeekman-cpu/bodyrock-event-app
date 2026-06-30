import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  const { data, error } = await db
    .from('fun_photos')
    .insert({ team_id: body.team_id, photo_url: body.photo_url })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id')
  const db = getServerClient()

  if (eventId) {
    const { data, error } = await db
      .from('fun_photos')
      .select('*, teams!inner(event_id, name)')
      .eq('teams.event_id', eventId)
      .order('submitted_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json([])
}

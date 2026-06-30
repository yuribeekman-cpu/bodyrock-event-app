import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

// Sub-opdrachten van een challenge ophalen
export async function GET(req: NextRequest) {
  const challengeId = req.nextUrl.searchParams.get('challenge_id')
  const teamId = req.nextUrl.searchParams.get('team_id')
  const db = getServerClient()

  if (!challengeId) return NextResponse.json([])

  const { data: steps, error } = await db
    .from('challenge_steps')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('step_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (teamId && steps?.length) {
    const stepIds = steps.map(s => s.id)
    const { data: completions } = await db
      .from('step_completions')
      .select('*')
      .eq('team_id', teamId)
      .in('step_id', stepIds)

    return NextResponse.json({ steps, completions: completions || [] })
  }

  return NextResponse.json({ steps, completions: [] })
}

// Sub-opdracht afvinken met foto
export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  const { data, error } = await db
    .from('step_completions')
    .upsert({
      team_id: body.team_id,
      step_id: body.step_id,
      photo_url: body.photo_url ?? null,
    }, { onConflict: 'team_id,step_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

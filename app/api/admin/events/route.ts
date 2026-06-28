import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth'
import { generateJoinCode } from '@/lib/utils'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db.from('events').select('*').order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const db = getServerClient()

  if (body.is_active) {
    await db.from('events').update({ is_active: false }).neq('id', 'none')
  }

  const event_code = generateJoinCode()
  const { data, error } = await db
    .from('events')
    .insert({ ...body, event_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

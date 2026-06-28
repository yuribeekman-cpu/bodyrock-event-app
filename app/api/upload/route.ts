import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const teamId = formData.get('team_id') as string
  const challengeId = formData.get('challenge_id') as string

  if (!file || !teamId || !challengeId) {
    return NextResponse.json({ error: 'Missende velden' }, { status: 400 })
  }

  const db = getServerClient()
  const ext = file.name.split('.').pop()
  const path = `${teamId}/${challengeId}.${ext}`

  const { error } = await db.storage
    .from('challenge-photos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = db.storage.from('challenge-photos').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}

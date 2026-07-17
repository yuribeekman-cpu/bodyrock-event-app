import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const expected = process.env.ADMIN_PASSWORD
  // Faal dicht: zonder geconfigureerd wachtwoord kan niemand inloggen.
  // (Anders slaagt een POST met een ontbrekend wachtwoord via `undefined === undefined`.)
  if (!expected) {
    console.error('[auth] ADMIN_PASSWORD ontbreekt in de omgeving — login geweigerd')
    return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 500 })
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Verkeerd wachtwoord' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  })
  return res
}

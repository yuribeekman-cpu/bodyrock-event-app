import { NextRequest } from 'next/server'

export function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD
  // Faal dicht: zonder geconfigureerd wachtwoord is niemand admin.
  // (Anders maakt `undefined === undefined` iedere bezoeker zonder cookie admin.)
  if (!expected) {
    console.error('[auth] ADMIN_PASSWORD ontbreekt in de omgeving — admin-toegang geweigerd')
    return false
  }
  const cookie = req.cookies.get('admin_auth')?.value
  return cookie === expected
}

import { NextRequest } from 'next/server'

export function isAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_auth')?.value
  return cookie === process.env.ADMIN_PASSWORD
}

// Generate a 6-char alphanumeric code
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Format score for display
export function formatScore(score: { minutes?: number; seconds?: number; reps?: number }, scoreType: 'time' | 'reps'): string {
  if (scoreType === 'time') {
    const m = score.minutes ?? 0
    const s = score.seconds ?? 0
    return `${m}:${String(s).padStart(2, '0')}`
  }
  return `${score.reps ?? 0} reps`
}

// App URL for event QR code
export function getEventUrl(eventCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bodyrock-event.vercel.app'
  return `${base}/event/${eventCode}`
}

// Roteer challenge volgorde op basis van start_challenge_number
// bv. 10 challenges, start = 3 -> [3,4,5,6,7,8,9,10,1,2]
export function getRotatedOrder<T extends { number: number }>(challenges: T[], startNumber: number): T[] {
  const sorted = [...challenges].sort((a, b) => a.number - b.number)
  const startIdx = sorted.findIndex(c => c.number === startNumber)
  if (startIdx === -1) return sorted
  return [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)]
}

// Format seconden naar mm:ss voor live timer
export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

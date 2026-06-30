import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qkhnjejjkrznbcpgmbxv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraG5qZWpqa3J6bmJjcGdtYnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTE4MjAsImV4cCI6MjA5NzQ4NzgyMH0.Q-4BnrjH5e5Ui9J4TO49FfNGoHKpF9IdxfjX1fnuCSs'

// Eén client voor alles — RLS in Supabase regelt de toegang
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client (zelfde key, maar aparte instantie voor API routes)
export function getServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Types
export type Event = {
  id: string
  name: string
  edition: string
  date: string
  location: string
  is_active: boolean
  event_code: string
}

export type Challenge = {
  id: string
  event_id: string
  number: number
  title: string
  description: string
  score_type: 'time' | 'reps'
  sort_order: number
}

export type Team = {
  id: string
  event_id: string
  name: string
  join_code: string
  captain_name: string
}

export type Score = {
  id: string
  team_id: string
  challenge_id: string
  minutes?: number
  seconds?: number
  reps?: number
  photo_url?: string
  submitted_at: string
  verified: boolean
}

export type TeamWithScores = Team & {
  scores: Score[]
  completed_count: number
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qkhnjejjkrznbcpgmbxv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraG5qZWpqa3J6bmJjcGdtYnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTE4MjAsImV4cCI6MjA5NzQ4NzgyMH0.Q-4BnrjH5e5Ui9J4TO49FfNGoHKpF9IdxfjX1fnuCSs'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)


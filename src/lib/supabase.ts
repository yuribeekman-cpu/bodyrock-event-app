import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qkhnjejjkrznbcpgmbxv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFraG5qZWpqa3J6bmJjcGdtYnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4MjIzNDUsImV4cCI6MjAyNTM5ODM0NX0.Q-4BnrjH5e5Ui9J4T049FfNGoHKpF9IdxfjX1fnuCSs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
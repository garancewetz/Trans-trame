import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Check your .env.local file.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

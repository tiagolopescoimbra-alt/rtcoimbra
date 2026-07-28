import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const mem = {}
const safeStorage = {
  getItem: (k) => { try { return localStorage.getItem(k) } catch { return mem[k] ?? null } },
  setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { mem[k] = v } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { delete mem[k] } },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: safeStorage }
})

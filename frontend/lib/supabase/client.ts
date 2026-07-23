'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton so we never spin up multiple GoTrue clients in the browser.
let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // Never hard-crash the whole React tree over a missing env var.
    // Log a clear, actionable message and fall back to a harmless
    // placeholder client — calls will fail gracefully (network error)
    // instead of taking down every page at build/startup time.
    console.error(
      '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Copy frontend/.env.local.example to frontend/.env.local and fill in your project keys, then restart the dev server.'
    )
  }

  browserClient = createBrowserClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-anon-key'
  )
  return browserClient
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// One of these per request — used in Server Components, Route Handlers,
// and Server Actions. Reads/writes the auth cookie so the server always
// sees the same session as the browser (this is what fixes "session
// gets lost during checkout" — client and server now share one source
// of truth instead of the browser using localStorage and the server
// knowing nothing about it).
export function createClient(): SupabaseClient {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on the server. Check frontend/.env.local.')
  }

  return createServerClient(
    url || 'https://placeholder.supabase.co',
    anonKey || 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component render — safe to ignore
            // because middleware.ts refreshes the session on every request.
          }
        },
      },
    }
  )
}

// Admin/service-role client — bypasses RLS. Only use server-side
// (API routes, webhooks) for operations that must run with elevated
// privileges (e.g. reading another user's email for a notification).
export function createAdminClient(): SupabaseClient {
  const { createClient: createRawClient } = require('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  return createRawClient(url, serviceKey)
}

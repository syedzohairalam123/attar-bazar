'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { useAuthStore } from '@/lib/store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    const loadSession = async (userId: string, email: string | null | undefined, fullNameHint?: string) => {
      let { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', userId).maybeSingle()

      // Self-heal: if the auth session exists but the matching profiles
      // row doesn't, create it now — this is what prevents "foreign key
      // constraint" errors later when placing an order or listing a product.
      if (!profile) {
        await ensureProfile(supabase, userId, email, fullNameHint)
        const { data: created } = await supabase.from('profiles').select('role, full_name').eq('id', userId).maybeSingle()
        profile = created
      }

      setUser({ id: userId, email: email ?? '', role: profile?.role ?? 'buyer', full_name: profile?.full_name })
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadSession(user.id, user.email, user.user_metadata?.full_name)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        loadSession(session.user.id, session.user.email, session.user.user_metadata?.full_name)
      }
      if (event === 'SIGNED_OUT') clearUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}

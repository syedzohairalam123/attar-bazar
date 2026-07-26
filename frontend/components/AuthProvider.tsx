'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { useAuthStore } from '@/lib/store'
import { usePathname } from 'next/navigation'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser, setActiveRole } = useAuthStore()
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const loadSession = async (userId: string, email: string | null | undefined, fullNameHint?: string) => {
      let { data: profile } = await supabase.from('profiles').select('role, full_name, is_buyer, is_seller, is_admin').eq('id', userId).maybeSingle()

      // Self-heal: if the auth session exists but the matching profiles
      // row doesn't, create it now — this is what prevents "foreign key
      // constraint" errors later when placing an order or listing a product.
      if (!profile) {
        await ensureProfile(supabase, userId, email, fullNameHint)
        const { data: created } = await supabase.from('profiles').select('role, full_name, is_buyer, is_seller, is_admin').eq('id', userId).maybeSingle()
        profile = created
      }

      setUser({ 
        id: userId, 
        email: email ?? '', 
        role: profile?.role ?? 'buyer', 
        full_name: profile?.full_name,
        is_buyer: profile?.is_buyer !== undefined ? profile.is_buyer : true,
        is_seller: profile?.is_seller !== undefined ? profile.is_seller : false,
        is_admin: profile?.is_admin !== undefined ? profile.is_admin : false,
        activeRole: 'buyer' // Default, will be updated by pathname effect
      })
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

  // Update active role when pathname changes
  useEffect(() => {
    if (!useAuthStore.getState().user) return
    
    let activeRole: 'buyer' | 'seller' | 'admin' = 'buyer'
    if (pathname.startsWith('/admin')) {
      activeRole = 'admin'
    } else if (pathname.startsWith('/seller')) {
      activeRole = 'seller'
    } else {
      activeRole = 'buyer'
    }
    
    setActiveRole(activeRole)
  }, [pathname, setActiveRole])

  return <>{children}</>
}

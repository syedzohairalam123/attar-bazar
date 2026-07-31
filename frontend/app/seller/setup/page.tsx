'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Store, CheckCircle, Loader2, TrendingUp, Shield, MessageCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SellerSetupPage() {
  const { user, updateUserRoles, setActiveRole, hasHydrated } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const u = user as any

  useEffect(() => {
    if (!hasHydrated) return
    // If not logged in, redirect to register as seller
    if (!user) {
      router.replace('/auth/register?role=seller')
      return
    }
    // If already a seller, redirect directly to dashboard
    if (u?.is_seller) {
      router.replace('/seller')
    }
  }, [user, hasHydrated, u?.is_seller])

  const activateSellerRole = async () => {
    if (!user) { router.push('/auth/register?role=seller'); return }
    setLoading(true)

    try {
      // Try the SECURITY DEFINER RPC function first (bypasses RLS)
      let success = false

      try {
        const { error: rpcError } = await supabase.rpc('activate_seller_role' as any)
        if (!rpcError) {
          success = true
        }
      } catch {
        // RPC not available — fall through to direct update
      }

      // Fallback: direct profile update
      if (!success) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_seller: true, role: 'seller' })
          .eq('id', user.id)
        if (error) throw error
        success = true
      }

      if (success) {
        // Update local store so UI reflects immediately
        updateUserRoles({ is_seller: true })
        setActiveRole('seller')
        setDone(true)
        toast.success('Seller account activated! Redirecting to your dashboard...')
        setTimeout(() => {
          window.location.href = '/seller'
        }, 1200)
      }
    } catch (err: any) {
      console.error('[SellerSetup] activation error:', err)
      toast.error('Could not activate seller account. Please run the database migration first.')
      setLoading(false)
    }
  }

  if (!hasHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06040E' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative">
      <div className="fixed inset-0 bg-[#06040E]" />
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}>
              <span className="text-[#06040E] font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>A</span>
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Attar Bazaar
            </span>
          </Link>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Store size={28} style={{ color: '#C9A84C' }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Georgia, serif', color: '#F5F0E8' }}>
            Become a Seller
          </h1>
          <p className="text-sm" style={{ color: '#A89F8F' }}>
            Hello, <span style={{ color: '#C9A84C' }}>{u?.full_name?.split(' ')[0] ?? u?.email?.split('@')[0]}</span>! Activate your seller account and start earning.
          </p>
        </div>

        {/* Features Card */}
        <div className="rounded-3xl p-8 mb-6" style={{ background: 'rgba(13,10,26,0.85)', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(20px)' }}>
          <p className="text-xs uppercase tracking-wider mb-5 text-center" style={{ color: '#C9A84C' }}>What You Get</p>

          <div className="space-y-4 mb-8">
            {[
              { icon: TrendingUp, title: 'Merchant Dashboard', desc: 'Track your listings, orders, and revenue in real time' },
              { icon: Shield, title: 'Isolated Seller Portal', desc: 'A dedicated space just for managing your shop' },
              { icon: MessageCircle, title: 'Direct Buyer Contact', desc: 'Buyers reach you instantly on WhatsApp' },
              { icon: CheckCircle, title: 'Keep Buyer Access', desc: 'Your buyer account stays active — switch anytime' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.05)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                  <Icon size={16} style={{ color: '#C9A84C' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#F5F0E8' }}>{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#A89F8F' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={40} style={{ color: '#25D366' }} />
              <p className="font-semibold" style={{ color: '#F5F0E8' }}>Seller Account Activated!</p>
              <p className="text-sm" style={{ color: '#A89F8F' }}>Taking you to your dashboard...</p>
              <Loader2 size={18} className="animate-spin" style={{ color: '#C9A84C' }} />
            </div>
          ) : (
            <button
              onClick={activateSellerRole}
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all shadow-lg hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Setting up your shop...</>
              ) : (
                <>Activate Seller Account <ArrowRight size={18} /></>
              )}
            </button>
          )}
        </div>

        {/* Already a buyer note */}
        <p className="text-center text-xs" style={{ color: '#A89F8F' }}>
          Want to stay as a buyer?{' '}
          <Link href="/" className="underline" style={{ color: '#C9A84C' }}>Go back to storefront</Link>
        </p>
      </div>
    </div>
  )
}

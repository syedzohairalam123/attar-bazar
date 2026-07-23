'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { CheckCircle, Loader2, TrendingUp, Shield, MessageCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

// This is the public "become a seller" landing page. It never contains
// a raw product-listing form itself — that lives inside the isolated
// /seller portal (seller/products/new) so there is only ever ONE route
// that can create a listing, avoiding any chance of a duplicate/parallel
// route collision.
export default function SellLandingPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const becomeSeller = async () => {
    if (!user) { router.push('/auth/register?role=seller'); return }
    if (user.role === 'seller' || user.role === 'admin') { router.push('/seller'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({ role: 'seller' }).eq('id', user.id)
      if (error) throw error
      toast.success('Welcome, seller! Redirecting to your dashboard...')
      window.location.href = '/seller' // full reload so middleware + AuthProvider pick up the new role immediately
    } catch (err: any) {
      toast.error(err.message ?? 'Could not upgrade your account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <span className="text-sm font-semibold uppercase tracking-widest block mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Start Earning</span>
      <h1 className="font-bold mb-6" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.2rem,5vw,3.5rem)', color: '#F5F0E8' }}>Sell Your Perfumes on {' '}<span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attar Bazaar</span></h1>
      <p className="text-lg mb-12 max-w-2xl mx-auto" style={{ color: '#A89F8F' }}>List your fragrance in minutes, manage everything from your own dashboard, and reach thousands of buyers across Pakistan.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {[{ icon: TrendingUp, title: 'Track Revenue', desc: 'See your sales and earnings in real time' }, { icon: Shield, title: 'Isolated Dashboard', desc: 'A dedicated portal just for managing your shop' }, { icon: MessageCircle, title: 'Direct Contact', desc: 'Buyers reach you instantly on WhatsApp' }].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-card rounded-2xl p-6"><div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(201,168,76,0.1)' }}><Icon size={22} style={{ color: '#C9A84C' }} /></div><p className="font-semibold text-sm mb-1" style={{ color: '#F5F0E8' }}>{title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{desc}</p></div>
        ))}
      </div>

      <button onClick={becomeSeller} disabled={loading} className="px-10 py-4 rounded-2xl text-base font-semibold inline-flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>
        {loading ? <><Loader2 size={20} className="animate-spin" /> Setting up your shop...</> : <>{user ? 'Become a Seller' : 'Create Account & Start Selling'} <ArrowRight size={18} /></>}
      </button>
      {user?.role === 'seller' && <p className="text-sm mt-4" style={{ color: '#25D366' }}><CheckCircle size={14} className="inline mr-1" /> You're already a seller — click above to go to your dashboard.</p>}
      {!user && <p className="text-sm mt-4" style={{ color: '#A89F8F' }}>Already have an account? <Link href="/auth/login" className="underline" style={{ color: '#C9A84C' }}>Sign in</Link> first.</p>}
    </div>
  )
}

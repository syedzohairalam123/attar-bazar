'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, CheckCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/reset` })
      if (error) throw error
      setSent(true)
    } catch (err: any) { toast.error(err.message ?? 'Failed to send reset email') } finally { setLoading(false) }
  }

  const baseInput = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl pl-11 pr-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="fixed inset-0" style={{ background: '#06040E' }} />
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.08), transparent 70%)' }} />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8"><Link href="/" className="inline-flex items-center gap-3"><div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="font-bold text-lg" style={{ color: '#06040E', fontFamily: 'Georgia, serif' }}>A</span></div><span className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attar Bazaar</span></Link></div>
        <div className="glass-card rounded-3xl p-8">
          {sent ? (
            <div className="text-center"><CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#C9A84C' }} /><h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Email Sent!</h2><p className="text-sm mb-6" style={{ color: '#A89F8F' }}>A password reset link has been sent to <strong style={{ color: '#C9A84C' }}>{email}</strong>.</p><Link href="/auth/login" className="px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}><ArrowLeft size={16} /> Back to Sign In</Link></div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Reset Password</h2>
              <p className="text-sm mb-6" style={{ color: '#A89F8F' }}>Enter your email address and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4"><div><label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: '#A89F8F' }}>Email Address</label><div className="relative"><Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A89F8F' }} /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={baseInput} /></div></div><button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send Reset Link'}</button></form>
              <div className="mt-5 text-center"><Link href="/auth/login" className="text-sm flex items-center gap-1 justify-center transition-colors" style={{ color: '#C9A84C' }}><ArrowLeft size={14} /> Back to Sign In</Link></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

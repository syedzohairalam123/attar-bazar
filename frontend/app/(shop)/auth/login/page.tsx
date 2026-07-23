'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { sendEmail } from '@/lib/email'
import { useAuthStore } from '@/lib/store'
import { Loader2, Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

function detectDevice() {
  if (typeof navigator === 'undefined') return 'Unknown Device'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Device'
  if (/Android/.test(ua)) return 'Android Device'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Macintosh/.test(ua)) return 'Mac'
  return 'Unknown Device'
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const { setUser } = useAuthStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password })
      if (error) throw error

      await ensureProfile(supabase, data.user.id, data.user.email, data.user.user_metadata?.full_name)
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).maybeSingle()
      const role = profile?.role ?? 'buyer'
      setUser({ id: data.user.id, email: data.user.email!, role, full_name: profile?.full_name })

      // New-device login detection + security email
      const deviceInfo = detectDevice()
      const { data: history } = await supabase.from('login_history').select('device').eq('user_id', data.user.id)
      const hasLoggedInBefore = !!history && history.length > 0
      const isNewDevice = !history || !history.some((h: any) => h.device === deviceInfo)
      supabase.from('login_history').insert({ user_id: data.user.id, device: deviceInfo, location: 'Pakistan', is_new_device: isNewDevice }).then(() => {}, () => {})
      if (isNewDevice && hasLoggedInBefore) {
        sendEmail({ to: data.user.email!, type: 'new_device_login', data: { name: profile?.full_name ?? 'there', time: new Date().toLocaleString('en-PK'), device: deviceInfo, location: 'Pakistan' } }).catch(console.error)
      }

      const firstName = profile?.full_name?.split(' ')[0]
      if (role === 'seller') toast.success(`Welcome to Your Merchant Center${firstName ? ', ' + firstName : ''}!`)
      else toast.success(`Login Successful! Welcome back${firstName ? ', ' + firstName : ''}.`)

      // Role-aware redirect — a full page load so middleware + server
      // components immediately see the fresh session cookie.
      const target = redirect || (role === 'admin' ? '/admin' : role === 'seller' ? '/seller' : '/')
      window.location.href = target
    } catch (err: any) {
      const msg = err.message === 'Invalid login credentials' ? 'Wrong email or password. Please try again.' : err.message
      toast.error(msg)
      setLoading(false)
    }
  }

  const baseInput = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl pl-11 pr-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.5)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="fixed inset-0 bg-[#06040E]" />
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8"><Link href="/" className="inline-flex items-center gap-3"><div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="text-[#06040E] font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>A</span></div><span className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attar Bazaar</span></Link><p className="text-[#A89F8F] mt-3 text-sm">Sign in to your account</p></div>
        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-2">Email Address</label><div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" /><input type="email" required autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className={baseInput} /></div></div>
            <div><div className="flex items-center justify-between mb-2"><label className="text-xs text-[#A89F8F] uppercase tracking-wider">Password</label><Link href="/auth/forgot" className="text-xs text-[#C9A84C] hover:text-[#E8CC7A] transition-colors">Forgot password?</Link></div><div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" /><input type={showPass ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className={baseInput + ' pr-12'} /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89F8F] hover:text-[#C9A84C]">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div className="flex items-center gap-2 text-xs text-[#A89F8F] bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.1)] rounded-xl p-3"><Shield size={14} className="text-[#C9A84C] flex-shrink-0" /> We send a security alert email when you log in from a new device</div>
            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}</button>
          </form>
          <div className="mt-6 text-center"><p className="text-[#A89F8F] text-sm">Don't have an account?{' '}<Link href="/auth/register" className="text-[#C9A84C] hover:text-[#E8CC7A] font-medium transition-colors">Create Account</Link></p></div>
        </div>
      </div>
    </div>
  )
}

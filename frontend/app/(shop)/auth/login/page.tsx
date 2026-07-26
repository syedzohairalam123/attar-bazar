'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { sendEmail } from '@/lib/email'
import { useAuthStore } from '@/lib/store'
import { Loader2, Eye, EyeOff, Mail, Lock, Shield, ShoppingBag, Store, Settings, ArrowRight } from 'lucide-react'
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
  const authStore = useAuthStore()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  // Multi-Role Modal States
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [authDataCache, setAuthDataCache] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: form.email.trim().toLowerCase(), 
        password: form.password 
      })
      if (error) throw error

      await ensureProfile(supabase, data.user.id, data.user.email, data.user.user_metadata?.full_name)
      
      // Fetch multi-role boolean flags along with other info
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name, is_buyer, is_seller, is_admin')
        .eq('id', data.user.id)
        .maybeSingle()

      const role = profile?.role ?? 'buyer'
      
      // Set user with all role flags
      setUser({ 
        id: data.user.id, 
        email: data.user.email!, 
        role, 
        full_name: profile?.full_name,
        is_buyer: profile?.is_buyer ?? true,
        is_seller: profile?.is_seller ?? false,
        is_admin: profile?.is_admin ?? false,
        activeRole: 'buyer' // Default, will be updated based on selection
      })

      // New-device login detection + security email
      const deviceInfo = detectDevice()
      const { data: history } = await supabase.from('login_history').select('device').eq('user_id', data.user.id)
      const hasLoggedInBefore = !!history && history.length > 0
      const isNewDevice = !history || !history.some((h: any) => h.device === deviceInfo)
      supabase.from('login_history').insert({ user_id: data.user.id, device: deviceInfo, location: 'Pakistan', is_new_device: isNewDevice }).then(() => {}, () => {})
      if (isNewDevice && hasLoggedInBefore) {
        sendEmail({ to: data.user.email!, type: 'new_device_login', data: { name: profile?.full_name ?? 'there', time: new Date().toLocaleString('en-PK'), device: deviceInfo, location: 'Pakistan' } }).catch(console.error)
      }

      // If redirect query param is explicitly passed (e.g., trying to access checkout), respect it immediately
      if (redirect) {
        window.location.href = redirect
        return
      }

      // Store profile data for role selection modal
      setUserProfile(profile ? { ...profile, id: data.user.id } : { id: data.user.id, is_buyer: true, is_seller: false, is_admin: false })
      setAuthDataCache(data)

      const firstName = profile?.full_name?.split(' ')[0]
      toast.success(`Login Successful! Welcome back${firstName ? ', ' + firstName : ''}.`)

      // Show the Role Selection Modal
      setShowRoleModal(true)
      setLoading(false)

    } catch (err: any) {
      const msg = err.message === 'Invalid login credentials' ? 'Wrong email or password. Please try again.' : err.message
      toast.error(msg)
      setLoading(false)
    }
  }

  // Handle role upgrade from login modal — navigate to the right setup/setup page
  const handleUpgradeRole = async (targetRole: 'buyer' | 'seller') => {
    setLoading(true)
    authStore.setActiveRole(targetRole)
    // Navigate to the appropriate onboarding page
    if (targetRole === 'seller') {
      window.location.href = '/seller/setup'
    } else {
      // Buyer activation: simple profile update, then go home
      const targetUserId = userProfile?.id || authDataCache?.user?.id
      if (!targetUserId) {
        toast.error('Session error. Please try logging in again.')
        setLoading(false)
        return
      }

      try {
        // Try RPC first (SECURITY DEFINER — bypasses RLS)
        let success = false
        try {
          const { error: rpcError } = await supabase.rpc('activate_buyer_role' as any)
          if (!rpcError) success = true
        } catch { /* RPC not available */ }

        if (!success) {
          const { error } = await supabase.from('profiles').update({ is_buyer: true }).eq('id', targetUserId)
          if (error) throw error
          success = true
        }

        authStore.updateUserRoles({ is_buyer: true })
        toast.success('Buyer access activated!')
        setTimeout(() => { window.location.href = '/' }, 500)
      } catch (err: any) {
        console.error('[handleUpgradeRole] error:', err)
        toast.error('Failed to activate buyer role. Please run the SQL migration in Supabase first.')
        setLoading(false)
      }
    }
  }

  // Handle direct role switching (when user already has the role)
  const handleSwitchRole = (targetRole: 'buyer' | 'seller' | 'admin') => {
    setLoading(true)
    authStore.setActiveRole(targetRole)
    const targetPath = targetRole === 'seller' ? '/seller' : targetRole === 'admin' ? '/admin' : '/'
    window.location.href = targetPath
  }

  const baseInput = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl pl-11 pr-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.5)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative">
      <div className="fixed inset-0 bg-[#06040E]" />
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
      
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}>
              <span className="text-[#06040E] font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>A</span>
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Attar Bazaar
            </span>
          </Link>
          <p className="text-[#A89F8F] mt-3 text-sm">
            {showRoleModal ? 'Choose your portal access' : 'Sign in to your account'}
          </p>
        </div>

        {/* REGULAR LOGIN FORM */}
        {!showRoleModal ? (
          <div className="glass-card rounded-3xl p-8 shadow-2xl border border-[rgba(201,168,76,0.15)] bg-[#0d0a1a]/80 backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" />
                  <input type="email" required autoComplete="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className={baseInput} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#A89F8F] uppercase tracking-wider">Password</label>
                  <Link href="/auth/forgot" className="text-xs text-[#C9A84C] hover:text-[#E8CC7A] transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" />
                  <input type={showPass ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className={baseInput + ' pr-12'} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89F8F] hover:text-[#C9A84C]">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#A89F8F] bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.1)] rounded-xl p-3">
                <Shield size={14} className="text-[#C9A84C] flex-shrink-0" /> We send a security alert email when you log in from a new device
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all shadow-lg hover:brightness-110" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[#A89F8F] text-sm">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-[#C9A84C] hover:text-[#E8CC7A] font-medium transition-colors">Create Account</Link>
              </p>
            </div>
          </div>
        ) : (
          /* MULTI-ROLE SELECTION POPUP MODAL (Theme-matched Dark & Gold) */
          <div className="glass-card rounded-3xl p-8 shadow-2xl border border-[rgba(201,168,76,0.3)] bg-[#0d0a1a]/95 backdrop-blur-xl animate-fade-in">
            <h2 className="text-xl font-bold text-center text-[#F5F0E8] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome Back{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-center text-[#A89F8F] text-xs mb-6">Select where you would like to go</p>

            <div className="space-y-3">
              {/* 1. BUYER PORTAL OPTION */}
              {userProfile?.is_buyer !== false ? (
                <button
                  onClick={() => handleSwitchRole('buyer')}
                  className="w-full p-4 text-left flex items-center justify-between bg-[#13112A] hover:bg-[#1a1738] border border-[rgba(201,168,76,0.2)] hover:border-[#C9A84C] rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[#C9A84C] group-hover:scale-105 transition-transform">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <p className="text-[#F5F0E8] font-semibold text-sm">View Buyer Storefront</p>
                      <p className="text-[#A89F8F] text-xs">Browse & shop attars</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-[#C9A84C] opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              ) : (
                <button
                  onClick={() => handleUpgradeRole('buyer')}
                  className="w-full p-4 text-left flex items-center gap-3 border-2 border-dashed border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] text-[#C9A84C] rounded-2xl text-sm font-medium transition-all bg-[rgba(201,168,76,0.02)]"
                >
                  <ShoppingBag size={18} />
                  <span>+ Become a Buyer</span>
                </button>
              )}

              {/* 2. SELLER PORTAL OPTION */}
              {userProfile?.is_seller ? (
                <button
                  onClick={() => handleSwitchRole('seller')}
                  className="w-full p-4 text-left flex items-center justify-between bg-[#13112A] hover:bg-[#1a1738] border border-[rgba(201,168,76,0.2)] hover:border-[#C9A84C] rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[#C9A84C] group-hover:scale-105 transition-transform">
                      <Store size={20} />
                    </div>
                    <div>
                      <p className="text-[#F5F0E8] font-semibold text-sm">View Seller Dashboard</p>
                      <p className="text-[#A89F8F] text-xs">Manage listings & orders</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-[#C9A84C] opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              ) : (
                <button
                  onClick={() => handleUpgradeRole('seller')}
                  className="w-full p-4 text-left flex items-center gap-3 border-2 border-dashed border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] text-[#C9A84C] rounded-2xl text-sm font-medium transition-all bg-[rgba(201,168,76,0.02)]"
                >
                  <Store size={18} />
                  <span>+ Become a Seller / Merchant</span>
                </button>
              )}

              {/* 3. ADMIN PORTAL OPTION (Shown only if user has admin privileges) */}
              {userProfile?.is_admin && (
                <button
                  onClick={() => handleSwitchRole('admin')}
                  className="w-full p-4 text-left flex items-center justify-between rounded-2xl transition-all shadow-lg group hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-[#06040E] group-hover:scale-105 transition-transform">
                      <Settings size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Open Admin Portal</p>
                      <p className="text-[#06040E]/70 text-xs">Full system control panel</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-[#06040E] opacity-80 group-hover:translate-x-1 transition-all" />
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-[#C9A84C] text-xs animate-pulse">
                <Loader2 size={14} className="animate-spin" /> Redirecting to your workspace...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
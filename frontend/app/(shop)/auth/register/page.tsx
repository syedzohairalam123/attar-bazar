'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendEmail } from '@/lib/email'
import { useAuthStore } from '@/lib/store'
import { Loader2, Eye, EyeOff, Mail, Lock, User, Phone, MapPin, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuthStore()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [role, setRole] = useState<'buyer' | 'seller'>(searchParams.get('role') === 'seller' ? 'seller' : 'buyer')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', whatsapp: '', city: '' })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const fullName = form.full_name.trim().slice(0, 100)
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: fullName, role } },
      })
      if (error) throw error
      if (!data.user) throw new Error('Signup failed — please try again')

      const isBuyer = role === 'buyer'
      const isSeller = role === 'seller'

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        phone: form.phone.trim().slice(0, 20),
        whatsapp: (form.whatsapp || form.phone).trim().slice(0, 20),
        city: form.city.trim().slice(0, 100) || null,
        role,
        is_buyer: isBuyer,
        is_seller: isSeller,
        is_admin: false,
      })
      if (profileError) console.error('Profile creation warning:', profileError.message)

      sendEmail({ to: form.email, type: 'welcome', data: { name: fullName, email: form.email, role } }).catch(console.error)
      sendEmail({ to: form.email, type: 'new_listing_admin', data: { title: `New ${role} signup`, brand: 'New User', price: 0, condition: role, city: form.city, sellerName: fullName, sellerEmail: form.email, id: data.user.id } }).catch(console.error)

      setUser({ 
        id: data.user.id, 
        email: data.user.email!, 
        role, 
        full_name: fullName,
        is_buyer: isBuyer,
        is_seller: isSeller,
        is_admin: false,
        activeRole: isSeller ? 'seller' : 'buyer'
      })
      toast.success('Account created successfully! Welcome to Attar Bazaar 🎉')
      window.location.href = role === 'seller' ? '/seller' : '/'
    } catch (err: any) {
      let msg = err.message ?? 'Registration failed'
      if (msg.includes('already registered')) msg = 'This email is already registered. Please sign in.'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="fixed inset-0 bg-[#06040E]" />
      <div className="fixed inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}>
              <span className="text-[#06040E] font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>A</span>
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attar Bazaar</span>
          </Link>
          <p className="text-[#A89F8F] mt-3 text-sm">Create your free account</p>
        </div>
        <div className="glass-card rounded-3xl p-8">
          <div className="flex gap-2 mb-6 p-1 bg-[#13112A] rounded-2xl">
            {(['buyer', 'seller'] as const).map(r => (
              <button 
                key={r} 
                type="button" 
                onClick={() => setRole(r)} 
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" 
                style={role === r ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { color: '#A89F8F' }}
              >
                {r === 'buyer' ? '🛒 I Want to Buy' : '💰 I Want to Sell'}
              </button>
            ))}
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { key: 'full_name', label: 'Full Name *', placeholder: 'Muhammad Ali', icon: User, type: 'text' },
              { key: 'email', label: 'Email Address *', placeholder: 'you@example.com', icon: Mail, type: 'email' },
              { key: 'phone', label: 'Phone Number *', placeholder: '+92 300 0000000', icon: Phone, type: 'tel' },
              { key: 'city', label: 'City', placeholder: 'Karachi, Lahore, Islamabad...', icon: MapPin, type: 'text' }
            ].map(({ key, label, placeholder, icon: Icon, type }) => (
              <div key={key}>
                <label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" />
                  <input 
                    type={type} 
                    required={label.includes('*')} 
                    maxLength={100} 
                    value={(form as any)[key]} 
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} 
                    placeholder={placeholder} 
                    className="w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl pl-11 pr-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]" 
                  />
                </div>
              </div>
            ))}
            {role === 'seller' && (
              <div>
                <label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-1.5">WhatsApp Number (Buyers will contact you)</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#25D366]" />
                  <input 
                    type="tel" 
                    maxLength={20} 
                    value={form.whatsapp} 
                    onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} 
                    placeholder="923001234567 (with country code)" 
                    className="w-full bg-[#13112A] border border-[rgba(37,211,102,0.2)] rounded-xl pl-11 pr-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none" 
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-1.5">Password *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89F8F]" />
                <input 
                  type={showPass ? 'text' : 'password'} 
                  required 
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="Minimum 6 characters" 
                  className="w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl pl-11 pr-12 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]" 
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89F8F] hover:text-[#C9A84C]">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 py-1">
              {['Welcome email sent immediately after signup', 'Order confirmation emails for every purchase', 'Security alerts for new device logins'].map(t => (
                <div key={t} className="flex items-center gap-2 text-xs text-[#A89F8F]">
                  <CheckCircle size={11} className="text-[#C9A84C] flex-shrink-0" /> {t}
                </div>
              ))}
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" 
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating Account...</> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-[#A89F8F] text-sm mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#C9A84C] hover:text-[#E8CC7A] font-medium transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
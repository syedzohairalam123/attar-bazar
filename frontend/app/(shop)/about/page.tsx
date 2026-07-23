import { createClient } from '@/lib/supabase/server'
import { getAllSettings } from '@/lib/queries'
import Link from 'next/link'
import { Shield, Star, Users, Package, ArrowRight, Heart, Zap, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const supabase = createClient()
  const [s, usersRes, perfumesRes, ordersRes] = await Promise.all([
    getAllSettings(supabase),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('perfumes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
  ])
  const stats = { users: usersRes.count ?? 0, perfumes: perfumesRes.count ?? 0, orders: ordersRes.count ?? 0 }
  const siteName = s.site_name ?? 'Attar Bazaar'

  return (
    <div className="pt-24 pb-20 overflow-hidden">
      <section className="relative py-16 sm:py-20 text-center px-4">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,0.10), transparent 70%)' }} />
        <div className="relative max-w-4xl mx-auto">
          <span className="text-sm font-semibold uppercase tracking-widest block mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Our Story</span>
          <h1 className="font-bold mb-6" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem,6vw,4.5rem)', color: '#F5F0E8' }}>About <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{siteName}</span></h1>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto" style={{ color: '#A89F8F' }}>{s.about_text ?? `${siteName} is Pakistan's first dedicated peer-to-peer perfume marketplace.`}</p>
        </div>
      </section>
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[{ value: `${stats.users.toLocaleString()}+`, label: 'Registered Users', icon: Users }, { value: `${stats.perfumes.toLocaleString()}+`, label: 'Active Listings', icon: Package }, { value: `${stats.orders.toLocaleString()}+`, label: 'Orders Delivered', icon: Star }, { value: s.founded_year ?? '2024', label: 'Year Founded', icon: Heart }].map(({ value, label, icon: Icon }) => (
            <div key={label} className="glass-card rounded-2xl p-5 sm:p-6 text-center"><Icon size={22} className="mx-auto mb-3" style={{ color: '#C9A84C' }} /><p className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem,4vw,2.25rem)', color: '#C9A84C' }}>{value}</p><p className="text-sm mt-1" style={{ color: '#A89F8F' }}>{label}</p></div>
          ))}
        </div>
      </section>
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div><span className="text-sm font-semibold uppercase tracking-widest block mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Our Mission</span><h2 className="font-bold mb-5" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#F5F0E8' }}>Making fragrances accessible for every Pakistani</h2><p className="text-lg leading-relaxed mb-4" style={{ color: '#A89F8F' }}>{s.mission_text ?? 'Our mission is to give every Pakistani easy and affordable access to their favourite fragrances.'}</p></div>
          <div className="glass-card rounded-2xl sm:rounded-3xl p-6 space-y-3">{[{ icon: Shield, title: 'Verified Sellers', desc: 'Every seller is verified with phone number' }, { icon: Zap, title: 'Instant WhatsApp Contact', desc: 'Talk directly to sellers — no middleman' }, { icon: Globe, title: 'Pakistan-wide', desc: 'From Karachi to Lahore to Islamabad' }, { icon: Heart, title: '100% Authentic', desc: 'Genuine products only' }].map(({ icon: Icon, title, desc }) => (<div key={title} className="flex items-start gap-4 p-3 sm:p-4 rounded-xl"><div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}><Icon size={18} style={{ color: '#C9A84C' }} /></div><div><p className="font-semibold text-sm" style={{ color: '#F5F0E8' }}>{title}</p><p className="text-xs mt-0.5" style={{ color: '#A89F8F' }}>{desc}</p></div></div>))}</div>
        </div>
      </section>
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center"><h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Ready to Join?</h2><p className="mb-8" style={{ color: '#A89F8F' }}>Become part of Pakistan's largest perfume marketplace — it's free!</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><Link href="/auth/register" className="px-8 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 group transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Get Started Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link><Link href="/contact" className="px-8 py-4 rounded-2xl font-semibold transition-all" style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>Contact Us</Link></div></div>
      </section>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Mail, MapPin, Instagram, Facebook } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function Footer() {
  const [s, setS] = useState<Record<string, string>>({})
  const supabase = createClient()
  useEffect(() => {
    supabase.from('settings').select('key,value').then(({ data }) => {
      const m: Record<string, string> = {}
      data?.forEach(r => { m[r.key] = r.value })
      setS(m)
    }, () => {})
  }, [])

  const siteName = s.site_name ?? 'Attar Bazaar'
  const whatsapp = s.whatsapp_number ?? '923190958709'
  const email = s.contact_email ?? 'syedzohairalam@gmail.com'
  const address = s.address ?? 'Karachi, Pakistan'
  const tagline = s.tagline ?? "Pakistan's most trusted fragrance marketplace"

  return (
    <footer className="relative mt-20" style={{ background: '#0D0B1F', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.4),transparent)' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="font-bold" style={{ color: '#06040E', fontFamily: 'Cinzel, serif' }}>A</span></div>
              <span className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{siteName}</span>
            </Link>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#A89F8F' }}>{tagline}</p>
            <div className="flex items-center gap-3">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}><MessageCircle size={16} /></a>
              {s.instagram && <a href={s.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}><Instagram size={16} /></a>}
              {s.facebook && <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}><Facebook size={16} /></a>}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Marketplace</h4>
            <ul className="space-y-2.5">{[{ href: '/products', label: 'Browse Perfumes' }, { href: '/products?featured=true', label: 'Featured Listings' }, { href: '/cart', label: 'My Cart' }, { href: '/account', label: 'My Account' }].map(l => (<li key={l.href}><Link href={l.href} className="text-sm hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}>{l.label}</Link></li>))}</ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Company</h4>
            <ul className="space-y-2.5">{[{ href: '/about', label: 'About Us' }, { href: '/contact', label: 'Contact Us' }, { href: '/sell', label: 'Become a Seller' }, { href: '/privacy', label: 'Privacy Policy' }, { href: '/terms', label: 'Terms of Use' }].map(l => (<li key={l.href}><Link href={l.href} className="text-sm hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}>{l.label}</Link></li>))}</ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Contact</h4>
            <ul className="space-y-3">
              <li><a href={`https://wa.me/${whatsapp}`} target="_blank" className="flex items-center gap-3 text-sm hover:text-[#25D366] transition-colors" style={{ color: '#A89F8F' }}><MessageCircle size={14} style={{ color: '#25D366' }} /> +{whatsapp}</a></li>
              <li><a href={`mailto:${email}`} className="flex items-center gap-3 text-sm hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}><Mail size={14} style={{ color: '#C9A84C' }} /> {email}</a></li>
              <li className="flex items-center gap-3 text-sm" style={{ color: '#A89F8F' }}><MapPin size={14} style={{ color: '#C9A84C', flexShrink: 0 }} /> {address}</li>
            </ul>
          </div>
        </div>
        <div className="divider-gold my-6 sm:my-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: '#A89F8F' }}>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/privacy" className="text-xs hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}>Privacy</Link>
            <Link href="/terms" className="text-xs hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

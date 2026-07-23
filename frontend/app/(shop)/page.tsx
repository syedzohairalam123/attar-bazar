import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getPerfumes, getAllSettings } from '@/lib/queries'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { ArrowRight, TrendingUp, Shield, Truck, Star, ChevronRight, Sparkles, MessageCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getHomeData() {
  const supabase = createClient()
  const [settings, featuredRes, latestRes, categoriesRes, statsRes] = await Promise.all([
    getAllSettings(supabase),
    getPerfumes(supabase, { featured: true, limit: 8 }),
    getPerfumes(supabase, { limit: 12 }),
    supabase.from('categories').select('*').order('name'),
    Promise.all([
      supabase.from('perfumes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    ]),
  ])
  const [listingsCount, sellersCount, deliveredCount] = statsRes
  return {
    settings,
    featured: featuredRes.data ?? [],
    latest: latestRes.data ?? [],
    categories: categoriesRes.data ?? [],
    stats: { listings: listingsCount.count ?? 0, sellers: sellersCount.count ?? 0, delivered: deliveredCount.count ?? 0 },
  }
}

export default async function HomePage() {
  const { settings: s, featured, latest, categories, stats } = await getHomeData()
  const siteName = s.site_name ?? 'Attar Bazaar'
  const heroTitle = s.hero_title ?? "Pakistan's Most Exclusive\nPerfume Marketplace"
  const heroSubtitle = s.hero_subtitle ?? 'Discover rare attars, luxury fragrances, and signature scents — directly from verified sellers across Pakistan.'
  const heroCta = s.hero_cta ?? 'Explore Fragrances'
  const tagline = s.tagline ?? 'Scents that tell your story'

  return (
    <div className="overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: '#06040E' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(201,168,76,0.12), transparent 60%), radial-gradient(ellipse 60% 80% at 80% 30%, rgba(255,148,72,0.08), transparent 60%)' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float" style={{ background: 'rgba(201,168,76,0.05)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-float-slow" style={{ background: 'rgba(255,148,72,0.05)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 animate-slide-up" style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)', color: '#C9A84C' }}><Sparkles size={14} /> {tagline}</div>
              <h1 className="font-bold leading-none mb-6 animate-slide-up delay-100" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
                {heroTitle.split('\n').map((line: string, i: number) => (<span key={i} className="block" style={i === 1 ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A,#C9A84C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : { color: '#F5F0E8' }}>{line}</span>))}
              </h1>
              <p className="text-lg leading-relaxed mb-10 max-w-xl animate-slide-up delay-200" style={{ color: '#A89F8F' }}>{heroSubtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up delay-300">
                <Link href="/products" className="px-8 py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 group transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>{heroCta} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link>
                <Link href="/sell" className="px-8 py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 group transition-all" style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>Sell Your Perfume <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link>
              </div>
              <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start animate-slide-up delay-400">
                {[{ n: stats.listings, label: 'Active Listings' }, { n: stats.sellers, label: 'Verified Sellers' }, { n: stats.delivered, label: 'Orders Delivered' }].map(st => (<div key={st.label} className="text-center lg:text-left"><p className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>{st.n.toLocaleString()}+</p><p className="text-xs mt-0.5" style={{ color: '#A89F8F' }}>{st.label}</p></div>))}
              </div>
            </div>
            <div className="relative flex items-center justify-center animate-slide-up delay-200">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
                <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: 'rgba(201,168,76,0.1)' }} />
                <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '1px solid rgba(201,168,76,0.15)', animationDuration: '20s' }} />
                <div className="absolute inset-4 rounded-full animate-spin" style={{ border: '1px solid rgba(201,168,76,0.1)', animationDuration: '15s', animationDirection: 'reverse' }} />
                <div className="absolute inset-12 rounded-full glass-card flex items-center justify-center"><div className="text-center"><span className="text-7xl sm:text-8xl block animate-float">🧴</span><span className="text-sm tracking-widest mt-2 block font-semibold" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>LUXURY</span></div></div>
                {featured.slice(0, 2).map((pf, i) => (<div key={pf.id} className="absolute glass-card rounded-xl p-3 w-32 animate-float hidden sm:block" style={{ top: i === 0 ? '-8px' : 'auto', right: i === 0 ? '-48px' : 'auto', bottom: i === 1 ? '32px' : 'auto', left: i === 1 ? '-48px' : 'auto', animationDelay: `${i * 1.5}s`, animationDuration: '7s' }}><p className="text-xs font-semibold truncate" style={{ color: '#C9A84C' }}>{pf.brand}</p><p className="text-xs truncate" style={{ color: '#F5F0E8' }}>{pf.title}</p><p className="text-sm font-bold mt-1" style={{ color: '#C9A84C' }}>Rs {pf.price.toLocaleString()}</p></div>))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"><div className="w-px h-10 bg-gradient-to-b from-transparent to-[#C9A84C]" /><span className="text-xs tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>SCROLL</span></div>
      </section>

      {categories.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12"><span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Shop By Type</span><h2 className="text-4xl font-bold mt-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Browse Categories</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map(cat => (<Link key={cat.id} href={`/products?category=${cat.slug}`} className="glass-card rounded-2xl p-5 text-center product-card group"><div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(201,168,76,0.1)' }}>{cat.image_url ? <Image src={cat.image_url} alt={cat.name} width={32} height={32} className="rounded-full object-cover" /> : <span className="text-xl">🌸</span>}</div><p className="text-sm font-medium" style={{ color: '#F5F0E8' }}>{cat.name}</p></Link>))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="py-20 relative">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(13,11,31,0.3), transparent)' }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"><div><span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Handpicked</span><h2 className="text-4xl font-bold mt-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Featured Fragrances</h2></div><Link href="/products?featured=true" className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 group w-fit" style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></Link></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">{featured.map(pf => <ProductCard key={pf.id} perfume={pf} featured />)}</div>
          </div>
        </section>
      )}

      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[{ icon: Shield, title: 'Verified Sellers', desc: 'Every seller is verified with CNIC and phone number', color: '#C9A84C' }, { icon: Truck, title: 'Pakistan-wide Delivery', desc: 'Doorstep delivery to all major cities', color: '#FF9448' }, { icon: MessageCircle, title: '24/7 WhatsApp Support', desc: 'Direct contact with sellers for fast response', color: '#25D366' }, { icon: Star, title: '100% Authentic', desc: 'Genuine products only — or full money back guarantee', color: '#E8A598' }].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass-card rounded-2xl p-6 text-center"><div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${color}15` }}><Icon size={24} style={{ color }} /></div><h3 className="font-semibold mb-2 text-[#F5F0E8]">{title}</h3><p className="text-sm leading-relaxed" style={{ color: '#A89F8F' }}>{desc}</p></div>
          ))}
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"><div><div className="flex items-center gap-2"><TrendingUp size={14} style={{ color: '#C9A84C' }} /><span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Just Listed</span></div><h2 className="text-4xl font-bold mt-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Latest Listings</h2></div><Link href="/products" className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 group w-fit" style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>Browse All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></Link></div>
        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">{[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}</div>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {latest.length === 0 ? (<div className="col-span-full glass-card rounded-2xl p-16 text-center"><span className="text-5xl block mb-4">🧴</span><p className="text-[#A89F8F]">No listings yet. Be the first to sell a perfume!</p><Link href="/sell" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Start Selling</Link></div>) : latest.map(pf => <ProductCard key={pf.id} perfume={pf} />)}
          </div>
        </Suspense>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.25)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.08), transparent 70%)' }} />
            <div className="relative"><span className="text-5xl mb-6 block">✨</span><h2 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Have a Perfume to Sell?</h2><p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: '#A89F8F' }}>List your fragrance in minutes, reach thousands of buyers across Pakistan, and receive payments via JazzCash or EasyPaisa.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center"><Link href="/sell" className="px-10 py-4 rounded-2xl text-base font-semibold inline-flex items-center justify-center gap-3 group transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>Start Selling Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></Link><Link href="/auth/register" className="px-10 py-4 rounded-2xl text-base font-semibold inline-flex items-center justify-center transition-all" style={{ border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>Create Free Account</Link></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

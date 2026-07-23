import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductDetailClient } from './ProductDetailClient'
import { ProductCard } from '@/components/ProductCard'
import { MapPin, Clock, User, Shield, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getPerfume(id: string) {
  const supabase = createClient()
  const { data } = await supabase.from('perfumes').select('*, profiles(full_name, avatar_url, whatsapp, city), categories(name, slug)').eq('id', id).single()
  if (data) await supabase.from('perfumes').update({ views: (data.views ?? 0) + 1 }).eq('id', id)
  return data
}
async function getSimilar(categoryId: string | null, excludeId: string) {
  if (!categoryId) return []
  const supabase = createClient()
  const { data } = await supabase.from('perfumes').select('*, profiles(full_name, avatar_url, whatsapp, city), categories(name, slug)').eq('category_id', categoryId).eq('status', 'active').neq('id', excludeId).limit(4)
  return data ?? []
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const perfume = await getPerfume(params.id)
  if (!perfume) notFound()
  const similar = await getSimilar(perfume.category_id, perfume.id)

  const condMap = { new: 'Brand New', 'like-new': 'Like New', used: 'Used' } as Record<string, string>
  const badgeMap = { new: 'badge-new', 'like-new': 'badge-like-new', used: 'badge-used' } as Record<string, string>
  const discount = perfume.original_price ? Math.round(((perfume.original_price - perfume.price) / perfume.original_price) * 100) : null

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm mb-8 flex-wrap" style={{ color: '#A89F8F' }}><Link href="/" className="hover:text-[#C9A84C]">Home</Link><span>/</span><Link href="/products" className="hover:text-[#C9A84C]">Browse</Link>{perfume.categories && <><span>/</span><Link href={`/products?category=${perfume.categories.slug}`} className="hover:text-[#C9A84C]">{perfume.categories.name}</Link></>}<span>/</span><span className="truncate max-w-[160px] sm:max-w-xs" style={{ color: '#F5F0E8' }}>{perfume.title}</span></nav>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 mb-16 sm:mb-20">
          <ProductDetailClient perfume={perfume} mode="gallery" />
          <div className="flex flex-col gap-5">
            <div>{perfume.categories && <Link href={`/products?category=${perfume.categories.slug}`} className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>{perfume.categories.name}</Link>}<h1 className="font-bold leading-tight mt-1 mb-1" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', color: '#F5F0E8' }}>{perfume.title}</h1><p className="text-xl font-medium" style={{ color: '#E8CC7A' }}>{perfume.brand}</p></div>
            <div className="flex items-baseline gap-3 flex-wrap"><span className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem,5vw,3rem)', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rs {perfume.price.toLocaleString()}</span>{perfume.original_price && <span className="text-xl line-through" style={{ color: '#A89F8F' }}>Rs {perfume.original_price.toLocaleString()}</span>}{discount && discount > 0 && <span className="text-sm px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>-{discount}%</span>}</div>
            <div className="flex flex-wrap gap-2"><span className={badgeMap[perfume.condition]}>{condMap[perfume.condition]}</span>{perfume.featured && <span className="badge-featured">⭐ Featured</span>}{perfume.quantity > 0 ? <span className="badge-new">In Stock ({perfume.quantity})</span> : <span className="badge-used">Out of Stock</span>}</div>
            {perfume.description && <div className="glass-card rounded-2xl p-5"><h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Description</h3><p className="leading-relaxed text-sm" style={{ color: '#A89F8F' }}>{perfume.description}</p></div>}
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#A89F8F' }}>{perfume.city && <span className="flex items-center gap-1.5"><MapPin size={13} style={{ color: '#C9A84C' }} />{perfume.city}</span>}<span className="flex items-center gap-1.5"><Clock size={13} style={{ color: '#C9A84C' }} />{new Date(perfume.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="flex items-center gap-1.5"><Eye size={13} style={{ color: '#C9A84C' }} />{perfume.views ?? 0} views</span></div>
            <ProductDetailClient perfume={perfume} mode="actions" />
            {perfume.profiles && <div className="glass-card rounded-2xl p-5"><h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Seller</h3><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'rgba(201,168,76,0.2)' }}>{perfume.profiles.avatar_url ? <Image src={perfume.profiles.avatar_url} alt="" width={48} height={48} className="rounded-full object-cover" /> : <User size={20} style={{ color: '#C9A84C' }} />}</div><div><p className="font-medium" style={{ color: '#F5F0E8' }}>{perfume.profiles.full_name ?? 'Anonymous Seller'}</p>{perfume.profiles.city && <p className="text-sm" style={{ color: '#A89F8F' }}>{perfume.profiles.city}</p>}</div><div className="ml-auto flex items-center gap-1 text-sm" style={{ color: '#C9A84C' }}><Shield size={14} /> Verified</div></div></div>}
          </div>
        </div>
        {similar.length > 0 && <div><h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Similar Fragrances</h2><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">{similar.map((pf: any) => <ProductCard key={pf.id} perfume={pf} />)}</div></div>}
      </div>
    </div>
  )
}

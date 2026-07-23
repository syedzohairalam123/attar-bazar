'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, MessageCircle, MapPin, Eye } from 'lucide-react'
import { useState } from 'react'
import { useCartStore } from '@/lib/store'
import { Perfume } from '@/lib/types'
import toast from 'react-hot-toast'

export function ProductCard({ perfume, featured = false }: { perfume: Perfume; featured?: boolean }) {
  const [liked, setLiked] = useState(false)
  const { addItem } = useCartStore()

  const handleAddToCart = (e: React.MouseEvent) => { e.preventDefault(); addItem(perfume); toast.success(`Added to cart!`, { duration: 2000 }) }
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault()
    const phone = (perfume.profiles?.whatsapp ?? '').replace(/[^0-9]/g, '')
    const msg = `Hello! I am interested in your perfume:\n\n*${perfume.brand} — ${perfume.title}*\nPrice: Rs ${perfume.price.toLocaleString()}\nCondition: ${perfume.condition}`
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    else toast.error('Seller WhatsApp not available')
  }

  const conditionLabel = { new: 'Brand New', 'like-new': 'Like New', used: 'Used' }[perfume.condition]
  const conditionClass = { new: 'badge-new', 'like-new': 'badge-like-new', used: 'badge-used' }[perfume.condition]
  const discount = perfume.original_price ? Math.round(((perfume.original_price - perfume.price) / perfume.original_price) * 100) : null

  return (
    <Link href={`/products/${perfume.id}`} className="block group product-card">
      <div className={`glass-card rounded-2xl overflow-hidden h-full flex flex-col ${featured ? 'border-[rgba(201,168,76,0.3)]' : ''}`}>
        <div className="relative aspect-[4/5] bg-[#13112A] overflow-hidden">
          {perfume.images?.[0] ? <Image src={perfume.images[0]} alt={perfume.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-2"><span className="text-5xl">🧴</span><span className="text-[#A89F8F] text-xs">{perfume.brand}</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06040E]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {featured && <span className="badge-featured">Featured</span>}
            <span className={conditionClass}>{conditionLabel}</span>
            {discount && discount > 0 && <span className="bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-md text-xs font-medium">-{discount}%</span>}
          </div>
          <button onClick={e => { e.preventDefault(); setLiked(!liked) }} className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${liked ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-red-500/80'}`}><Heart size={14} fill={liked ? 'white' : 'none'} /></button>
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <button onClick={handleAddToCart} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><ShoppingBag size={12} /> Add to Cart</button>
            <button onClick={handleWhatsApp} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#25D366', color: 'white' }}><MessageCircle size={14} /></button>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <p className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{perfume.brand}</p>
          <h3 className="text-[#F5F0E8] font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#C9A84C] transition-colors" style={{ fontFamily: 'Georgia, serif' }}>{perfume.title}</h3>
          <div className="flex items-baseline gap-2 mb-3"><span className="text-[#C9A84C] font-bold text-lg">Rs {perfume.price.toLocaleString()}</span>{perfume.original_price && <span className="text-[#A89F8F] text-sm line-through">Rs {perfume.original_price.toLocaleString()}</span>}</div>
          <div className="flex items-center gap-3 text-xs text-[#A89F8F] mt-auto pt-3 border-t border-[rgba(201,168,76,0.1)]">
            {perfume.city && <span className="flex items-center gap-1"><MapPin size={10} className="text-[#C9A84C]/50" />{perfume.city}</span>}
            <span className="flex items-center gap-1 ml-auto"><Eye size={10} className="text-[#C9A84C]/50" />{perfume.views ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (<div className="glass-card rounded-2xl overflow-hidden animate-pulse"><div className="aspect-[4/5] bg-[#13112A]" /><div className="p-4 space-y-3"><div className="h-3 w-1/3 rounded bg-[#17152E]" /><div className="h-5 w-3/4 rounded bg-[#17152E]" /><div className="h-6 w-1/2 rounded bg-[#17152E]" /></div></div>)
}

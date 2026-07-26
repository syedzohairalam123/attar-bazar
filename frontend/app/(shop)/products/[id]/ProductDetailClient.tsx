'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ShoppingBag, MessageCircle, Share2, Heart, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCartStore, useAuthStore } from '@/lib/store'
import { Perfume } from '@/lib/types'
import toast from 'react-hot-toast'

export function ProductDetailClient({ perfume, mode }: { perfume: Perfume; mode: 'gallery' | 'actions' }) {
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [liked, setLiked] = useState(false)
  const { addItem } = useCartStore()
  const { user } = useAuthStore()
  const images = perfume.images?.filter(Boolean) ?? []

  const addToCart = () => {
    if (!user?.is_buyer) { 
      if (user?.is_seller) {
        toast.error('You currently have Seller access. To purchase items, please activate Buyer role on your account.');
      } else {
        toast.error('Please sign in to purchase items.');
      }
      return;
    }
    for (let i = 0; i < qty; i++) addItem(perfume)
    toast.success(`${qty}× ${perfume.title} added to cart!`)
  }

  const whatsApp = () => {
    const phone = (perfume.profiles?.whatsapp ?? '').replace(/[^0-9]/g, '')
    const msg = `Hello!\n\nI am interested in your perfume:\n\n*${perfume.brand} — ${perfume.title}*\nCondition: ${perfume.condition}\nPrice: Rs ${perfume.price.toLocaleString()}\nQuantity: ${qty}`
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    else toast.error('Seller WhatsApp number not available')
  }

  const share = async () => {
    if (navigator.share) await navigator.share({ title: perfume.title, url: window.location.href })
    else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied to clipboard!') }
  }

  if (mode === 'gallery') {
    if (!images.length) return (<div className="aspect-square rounded-3xl glass-card flex items-center justify-center"><div className="text-center"><span className="text-8xl block mb-4">🧴</span><p style={{ color: '#A89F8F' }}>{perfume.brand}</p></div></div>)
    return (
      <div className="space-y-4">
        <div className="relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden glass-card group">
          <Image src={images[activeImg]} alt={perfume.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
          {images.length > 1 && <>
            <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#F5F0E8' }}><ChevronLeft size={20} /></button>
            <button onClick={() => setActiveImg(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#F5F0E8' }}><ChevronRight size={20} /></button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">{images.map((_, i) => (<button key={i} onClick={() => setActiveImg(i)} className="h-2 rounded-full transition-all" style={{ width: i === activeImg ? '24px' : '8px', background: i === activeImg ? '#C9A84C' : 'rgba(255,255,255,0.4)' }} />))}</div>
          </>}
        </div>
        {images.length > 1 && (<div className="flex gap-3 overflow-x-auto pb-1">{images.map((img, i) => (<button key={i} onClick={() => setActiveImg(i)} className="relative w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all" style={{ borderColor: i === activeImg ? '#C9A84C' : 'rgba(201,168,76,0.1)', opacity: i === activeImg ? 1 : 0.6 }}><Image src={img} alt="" fill className="object-cover" /></button>))}</div>)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm" style={{ color: '#A89F8F' }}>Quantity:</span>
        <div className="flex items-center gap-2 glass-card rounded-xl p-1">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-lg transition-all" style={{ color: '#A89F8F' }}><Minus size={16} /></button>
          <span className="w-8 text-center font-semibold" style={{ color: '#F5F0E8' }}>{qty}</span>
          <button onClick={() => setQty(q => Math.min(perfume.quantity, q + 1))} disabled={qty >= perfume.quantity} className="w-9 h-9 flex items-center justify-center rounded-lg transition-all disabled:opacity-30" style={{ color: '#A89F8F' }}><Plus size={16} /></button>
        </div>
      </div>
      <button onClick={addToCart} disabled={perfume.quantity === 0} className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}><ShoppingBag size={20} /> Add to Cart — Rs {(perfume.price * qty).toLocaleString()}</button>
      <button onClick={whatsApp} className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 text-white transition-all" style={{ background: '#25D366', boxShadow: '0 4px 15px rgba(37,211,102,0.3)' }}><MessageCircle size={20} /> Contact Seller on WhatsApp</button>
      <div className="flex gap-3">
        <button onClick={() => setLiked(!liked)} className="flex-1 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all" style={liked ? { borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#f87171' } : { borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}><Heart size={16} fill={liked ? 'currentColor' : 'none'} />{liked ? 'Saved' : 'Save'}</button>
        <button onClick={share} className="flex-1 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}><Share2 size={16} /> Share</button>
      </div>
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#A89F8F' }}>Pay Via</p>
        <div className="flex flex-wrap gap-2">
          {[{ l: 'JazzCash', bg: '#CC0000' }, { l: 'EasyPaisa', bg: '#00A651' }, { l: 'Bank Transfer', bg: '#1d4ed8' }, { l: 'Cash on Delivery', bg: '#4b5563' }].map(m => (
            <div key={m.l} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: m.bg }}>{m.l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
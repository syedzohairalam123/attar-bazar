'use client'
import { useCartStore } from '@/lib/store'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Minus, Trash2, ShoppingBag, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore()
  const cartTotal = total()

  const whatsappOrder = () => {
    const lines = items.map(i => `• ${i.perfume.brand} — ${i.perfume.title} x${i.quantity} = Rs ${(i.perfume.price * i.quantity).toLocaleString()}`)
    const msg = `Hello! I would like to order these perfumes:\n\n${lines.join('\n')}\n\nTotal: Rs ${cartTotal.toLocaleString()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (items.length === 0) return (
    <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-16">
        <div className="w-24 h-24 rounded-full bg-[rgba(201,168,76,0.1)] flex items-center justify-center mx-auto mb-6"><ShoppingBag size={40} className="text-[#C9A84C]/50" /></div>
        <h2 className="text-3xl font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Your Cart is Empty</h2>
        <p className="text-[#A89F8F] mb-8">Explore our luxury fragrance collection</p>
        <Link href="/products" className="px-8 py-4 rounded-2xl font-semibold inline-flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Browse Perfumes <ArrowRight size={18} /></Link>
      </div>
    </div>
  )

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div><Link href="/products" className="flex items-center gap-2 text-[#A89F8F] hover:text-[#C9A84C] transition-colors text-sm mb-2"><ArrowLeft size={14} /> Continue Shopping</Link><h1 className="text-4xl font-bold text-[#F5F0E8]" style={{ fontFamily: 'Georgia, serif' }}>Your Cart</h1><p className="text-[#A89F8F] mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p></div>
          <button onClick={clearCart} className="text-sm text-red-400/60 hover:text-red-400 transition-colors">Clear All</button>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.perfume.id} className="glass-card rounded-2xl p-5 flex gap-5">
                <Link href={`/products/${item.perfume.id}`} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#13112A] flex-shrink-0 block">{item.perfume.images?.[0] ? <Image src={item.perfume.images[0]} alt={item.perfume.title} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🧴</div>}</Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wide">{item.perfume.brand}</p>
                  <Link href={`/products/${item.perfume.id}`}><h3 className="text-[#F5F0E8] font-semibold hover:text-[#C9A84C] transition-colors mt-0.5">{item.perfume.title}</h3></Link>
                  <p className="text-[#C9A84C] font-bold text-lg mt-1">Rs {item.perfume.price.toLocaleString()}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 glass-card rounded-xl p-1.5">
                      <button onClick={() => updateQuantity(item.perfume.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-[#A89F8F] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)] rounded-lg transition-all"><Minus size={14} /></button>
                      <span className="text-[#F5F0E8] font-semibold w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.perfume.id, item.quantity + 1)} disabled={item.quantity >= item.perfume.quantity} className="w-8 h-8 flex items-center justify-center text-[#A89F8F] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)] rounded-lg transition-all disabled:opacity-30"><Plus size={14} /></button>
                    </div>
                    <div className="flex items-center gap-3"><span className="text-[#C9A84C] font-bold">Rs {(item.perfume.price * item.quantity).toLocaleString()}</span><button onClick={() => removeItem(item.perfume.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={16} /></button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <h3 className="text-xl font-bold text-[#F5F0E8] mb-5" style={{ fontFamily: 'Georgia, serif' }}>Order Summary</h3>
              <div className="space-y-3 mb-5"><div className="flex justify-between text-sm text-[#A89F8F]"><span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span><span>Rs {cartTotal.toLocaleString()}</span></div><div className="flex justify-between text-sm text-[#A89F8F]"><span>Delivery</span><span className="text-[#25D366]">Negotiate with seller</span></div></div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent mb-5" />
              <div className="flex justify-between font-bold text-xl mb-6"><span className="text-[#F5F0E8]">Total</span><span className="text-[#C9A84C]">Rs {cartTotal.toLocaleString()}</span></div>
              <div className="space-y-3"><Link href="/checkout" className="w-full py-4 rounded-2xl font-semibold text-center block" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Proceed to Checkout</Link><button onClick={whatsappOrder} className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm text-white" style={{ background: '#25D366' }}><MessageCircle size={16} /> Order via WhatsApp</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

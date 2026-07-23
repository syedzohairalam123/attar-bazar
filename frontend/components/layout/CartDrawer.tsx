'use client'
import { X, Plus, Minus, Trash2, ShoppingBag, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/lib/store'

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, clearCart } = useCartStore()
  const cartTotal = total()

  const whatsappOrder = () => {
    if (items.length === 0) return
    const lines = items.map(i => `• ${i.perfume.brand} — ${i.perfume.title} x${i.quantity} = Rs ${(i.perfume.price * i.quantity).toLocaleString()}`)
    const msg = `Hello! I would like to order these perfumes:\n\n${lines.join('\n')}\n\nTotal: Rs ${cartTotal.toLocaleString()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={closeCart} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md z-[70] flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ background: 'linear-gradient(180deg,#0D0B1F 0%,#06040E 100%)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)' }} />
        <div className="flex items-center justify-between p-5 border-b border-[rgba(201,168,76,0.1)]">
          <div className="flex items-center gap-3"><ShoppingBag size={20} className="text-[#C9A84C]" /><h2 className="text-xl font-semibold text-[#F5F0E8]" style={{ fontFamily: 'Georgia,serif' }}>Your Cart</h2>{items.length > 0 && <span className="px-2 py-0.5 bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] rounded-full text-[#C9A84C] text-xs font-medium">{items.length}</span>}</div>
          <button onClick={closeCart} className="w-8 h-8 rounded-full border border-[rgba(201,168,76,0.2)] flex items-center justify-center text-[#A89F8F] hover:text-[#F5F0E8] transition-all"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[rgba(201,168,76,0.1)] flex items-center justify-center"><ShoppingBag size={32} className="text-[rgba(201,168,76,0.5)]" /></div>
              <div><p className="text-[#F5F0E8] text-lg font-semibold">Cart is Empty</p><p className="text-[#A89F8F] text-sm mt-1">Explore our luxury fragrances</p></div>
              <Link href="/products" onClick={closeCart} className="px-6 py-2.5 rounded-full text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Browse Perfumes</Link>
            </div>
          ) : items.map(item => (
            <div key={item.perfume.id} className="rounded-xl p-3 flex gap-3" style={{ background: 'rgba(23,21,46,0.6)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#13112A] flex-shrink-0">{item.perfume.images?.[0] ? <Image src={item.perfume.images[0]} alt={item.perfume.title} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🧴</div>}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#C9A84C] font-medium truncate">{item.perfume.brand}</p>
                <p className="text-sm text-[#F5F0E8] font-medium truncate">{item.perfume.title}</p>
                <p className="text-[#C9A84C] font-semibold text-sm mt-0.5">Rs {(item.perfume.price * item.quantity).toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#13112A' }}>
                    <button onClick={() => updateQuantity(item.perfume.id, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center text-[#A89F8F] hover:text-[#C9A84C]"><Minus size={10} /></button>
                    <span className="text-[#F5F0E8] text-xs w-5 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.perfume.id, item.quantity + 1)} disabled={item.quantity >= item.perfume.quantity} className="w-5 h-5 flex items-center justify-center text-[#A89F8F] hover:text-[#C9A84C] disabled:opacity-30"><Plus size={10} /></button>
                  </div>
                  <button onClick={() => removeItem(item.perfume.id)} className="text-red-400/50 hover:text-red-400 ml-auto"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-[rgba(201,168,76,0.1)] space-y-3">
            <div className="flex items-center justify-between"><span className="text-[#A89F8F]">Total</span><span className="text-xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Georgia,serif' }}>Rs {cartTotal.toLocaleString()}</span></div>
            <Link href="/checkout" onClick={closeCart} className="w-full py-3 rounded-xl text-sm font-semibold text-center block" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Proceed to Checkout</Link>
            <button onClick={whatsappOrder} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white" style={{ background: '#25D366' }}><MessageCircle size={16} /> Order via WhatsApp</button>
            <button onClick={clearCart} className="w-full text-center text-xs text-[rgba(168,159,143,0.5)] hover:text-red-400 py-1">Clear Cart</button>
          </div>
        )}
      </div>
    </>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore, useAuthStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { sendEmail } from '@/lib/email'
import { CheckCircle, Loader2, ArrowLeft, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash', icon: '📱', desc: 'Pay via JazzCash mobile wallet', bg: '#CC0000' },
  { id: 'easypaisa', label: 'EasyPaisa', icon: '💚', desc: 'Pay via EasyPaisa account', bg: '#00A651' },
  { id: 'bank', label: 'Bank Transfer', icon: '🏦', desc: 'Direct bank transfer / IBFT', bg: '#1d4ed8' },
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive (cash)', bg: '#4b5563' },
]

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const supabase = createClient()
  const [payment, setPayment] = useState('jazzcash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', notes: '' })
  const cartTotal = total()

  if (!user) return (
    <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-12"><h2 className="text-3xl font-bold text-[#F5F0E8] mb-4" style={{ fontFamily: 'Georgia, serif' }}>Sign In Required</h2><p className="text-[#A89F8F] mb-6">Please sign in to complete your purchase.</p><Link href="/auth/login?redirect=/checkout" className="px-8 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Sign In</Link></div>
    </div>
  )

  // Defense in depth — middleware already blocks users without buyer access from reaching
  // this page, but this guards against any stale client-side navigation.
  // Multi-role support: Users with is_buyer=true can purchase regardless of other roles
  if (!user.is_buyer) return (
    <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-12">
        <h2 className="text-3xl font-bold text-[#F5F0E8] mb-4" style={{ fontFamily: 'Georgia, serif' }}>Buyer Access Required</h2>
        <p className="text-[#A89F8F] mb-6">
          {user.is_seller 
            ? 'You currently have Seller access. To place orders, please activate Buyer role on your account.'
            : 'Please sign in with a Buyer account to place an order.'}
        </p>
        {user.is_seller ? (
          <Link href="/account" className="px-8 py-3 rounded-xl font-semibold inline-block" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Activate Buyer Role</Link>
        ) : (
          <Link href="/auth/login?redirect=/checkout" className="px-8 py-3 rounded-xl font-semibold inline-block" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Sign In</Link>
        )}
      </div>
    </div>
  )

  if (items.length === 0 && !success) return (
    <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-12"><h2 className="text-3xl font-bold text-[#F5F0E8] mb-4" style={{ fontFamily: 'Georgia, serif' }}>Cart is Empty</h2><Link href="/products" className="px-8 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Browse Perfumes</Link></div>
    </div>
  )

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // guards against accidental double-submit
    const name = form.name.trim().slice(0, 100)
    const phone = form.phone.trim().slice(0, 20)
    const address = form.address.trim().slice(0, 300)
    if (!name || !phone || !address) { toast.error('Please fill all required fields'); return }
    setLoading(true)
    try {
      await ensureProfile(supabase, user.id, user.email)

      const orderRows = items.map(item => ({
        buyer_id: user.id,
        perfume_id: item.perfume.id,
        seller_id: item.perfume.seller_id ?? null,
        quantity: item.quantity,
        total_price: item.perfume.price * item.quantity,
        payment_method: payment,
        status: 'pending',
        buyer_name: name,
        buyer_phone: phone,
        buyer_email: user.email,
        delivery_address: `${address}${form.city ? ', ' + form.city.trim() : ''}`,
        notes: form.notes.trim().slice(0, 500) || null,
      }))

      const { data: orderData, error } = await supabase.from('orders').insert(orderRows).select()
      if (error) throw error

      const realOrderId = orderData?.[0]?.id ?? ''
      setOrderRef(realOrderId.slice(0, 8).toUpperCase())

      sendEmail({ to: user.email, type: 'order_placed_buyer', data: { orderId: realOrderId, buyerName: name, total: cartTotal, paymentMethod: payment, address: `${address}, ${form.city}`, phone, items: items.map(i => ({ brand: i.perfume.brand, title: i.perfume.title, price: i.perfume.price, quantity: i.quantity })) } }).catch(console.error)
      sendEmail({ to: user.email, type: 'order_placed_admin', data: { orderId: realOrderId, buyerName: name, buyerEmail: user.email, phone, total: cartTotal, paymentMethod: payment, address: `${address}, ${form.city}`, itemCount: items.reduce((s, i) => s + i.quantity, 0) } }).catch(console.error)
      for (const item of items) {
        if (item.perfume.profiles?.whatsapp) {
          sendEmail({ to: user.email, type: 'seller_new_order', data: { perfumeTitle: item.perfume.title, perfumeBrand: item.perfume.brand, buyerName: name, buyerPhone: phone, quantity: item.quantity, total: item.perfume.price * item.quantity, city: form.city, paymentMethod: payment } }).catch(console.error)
        }
      }

      clearCart()
      setSuccess(true)
    } catch (err: any) {
      if (err?.code === '23503') toast.error('Your account needs a quick refresh. Please sign out, sign back in, and try again.')
      else toast.error(err.message ?? 'Order failed. Please try again.')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-12">
        <CheckCircle size={64} className="text-[#C9A84C] mx-auto mb-4" />
        <h2 className="text-4xl font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Order Placed!</h2>
        <p className="text-[#A89F8F] mb-2">Your order <strong className="text-[#C9A84C]">#{orderRef}</strong> has been placed successfully.</p>
        <p className="text-[#A89F8F] mb-2 text-sm">A confirmation email has been sent to you.</p>
        <p className="text-[#A89F8F] mb-8 text-sm">The seller will contact you on WhatsApp shortly.</p>
        <div className="flex gap-4 justify-center flex-wrap"><Link href="/account" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>My Orders</Link><Link href="/products" className="px-6 py-3 rounded-xl font-semibold border border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)] transition-all">Continue Shopping</Link></div>
      </div>
    </div>
  )

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8"><Link href="/cart" className="flex items-center gap-2 text-[#A89F8F] hover:text-[#C9A84C] text-sm mb-4 transition-colors"><ArrowLeft size={16} /> Back to Cart</Link><h1 className="text-4xl font-bold text-[#F5F0E8]" style={{ fontFamily: 'Georgia, serif' }}>Checkout</h1></div>
        <form onSubmit={handleOrder} className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>Delivery Details</h3>
              {[{ key: 'name', label: 'Full Name *', placeholder: 'Muhammad Ali' }, { key: 'phone', label: 'Phone Number *', placeholder: '+92 300 0000000' }, { key: 'address', label: 'Delivery Address *', placeholder: 'House No, Street, Area' }, { key: 'city', label: 'City', placeholder: 'Karachi, Lahore...' }].map(({ key, label, placeholder }) => (
                <div key={key}><label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-1.5">{label}</label><input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required={label.includes('*')} maxLength={key === 'address' ? 300 : 100} className="w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]" /></div>
              ))}
              <div><label className="text-xs text-[#A89F8F] uppercase tracking-wider block mb-1.5">Order Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions for the seller..." rows={2} maxLength={500} className="w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm resize-none focus:outline-none focus:border-[#C9A84C]" /></div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest mb-4" style={{ fontFamily: 'Cinzel, serif' }}>Payment Method</h3>
              <div className="space-y-3">{PAYMENT_METHODS.map(pm => (<label key={pm.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === pm.id ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.05)]' : 'border-[rgba(201,168,76,0.1)] hover:border-[rgba(201,168,76,0.3)]'}`}><input type="radio" name="payment" value={pm.id} checked={payment === pm.id} onChange={() => setPayment(pm.id)} className="accent-[#C9A84C]" /><span className="text-2xl">{pm.icon}</span><div className="flex-1"><p className="text-[#F5F0E8] font-medium text-sm">{pm.label}</p><p className="text-[#A89F8F] text-xs">{pm.desc}</p></div>{payment === pm.id && <span className="text-xs font-bold px-3 py-1 rounded-lg text-white" style={{ background: pm.bg }}>{pm.label}</span>}</label>))}</div>
              <p className="text-xs mt-4" style={{ color: 'rgba(168,159,143,0.6)' }}>Attar Bazaar never asks for your card number, CVV, or banking password. Payment is arranged directly with the seller after they confirm your order.</p>
            </div>
          </div>
          <div>
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest mb-6" style={{ fontFamily: 'Cinzel, serif' }}>Order Summary</h3>
              <div className="space-y-4 mb-6">{items.map(item => (<div key={item.perfume.id} className="flex gap-3"><div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#13112A] flex-shrink-0">{item.perfume.images?.[0] ? <Image src={item.perfume.images[0]} alt={item.perfume.title} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🧴</div>}</div><div className="flex-1 min-w-0"><p className="text-[#C9A84C] text-xs font-semibold">{item.perfume.brand}</p><p className="text-[#F5F0E8] text-sm truncate">{item.perfume.title}</p><p className="text-[#A89F8F] text-xs">Qty: {item.quantity}</p></div><p className="text-[#F5F0E8] font-semibold text-sm">Rs {(item.perfume.price * item.quantity).toLocaleString()}</p></div>))}</div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent mb-4" />
              <div className="space-y-2 mb-6"><div className="flex justify-between text-sm text-[#A89F8F]"><span>Subtotal</span><span>Rs {cartTotal.toLocaleString()}</span></div><div className="flex justify-between text-sm text-[#A89F8F]"><span>Delivery</span><span className="text-[#25D366]">Negotiate with seller</span></div><div className="flex justify-between font-bold text-lg pt-1"><span className="text-[#F5F0E8]">Total</span><span className="text-[#C9A84C]">Rs {cartTotal.toLocaleString()}</span></div></div>
              <div className="flex items-start gap-2 text-xs text-[#A89F8F] bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.1)] rounded-xl p-3 mb-4"><MessageCircle size={12} className="text-[#C9A84C] mt-0.5 flex-shrink-0" /> Confirmation email will be sent to you and the seller</div>
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : `Place Order — Rs ${cartTotal.toLocaleString()}`}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
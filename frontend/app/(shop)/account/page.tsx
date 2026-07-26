'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { ORDER_STATUS_LABEL, OrderStatus } from '@/lib/types'
import { TrendingUp, Package, Loader2, User, ArrowRight, Sparkles, Wifi, Store } from 'lucide-react'

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'badge-like-new', confirmed: 'badge-new', dispatched: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs',
  out_for_delivery: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs', delivered: 'badge-new', cancelled: 'badge-used',
}

export default function AccountPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveUpdated, setLiveUpdated] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('orders').select('*, perfumes(title, brand, images)').eq('buyer_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })

    // Realtime: any change to my orders updates this screen instantly,
    // no manual refresh needed.
    const channel = supabase.channel('account-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${user.id}` }, (payload) => {
        setLiveUpdated(true)
        setTimeout(() => setLiveUpdated(false), 2000)
        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
        } else if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as any, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  if (!user) return (
    <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
      <div className="glass-card rounded-3xl p-12"><User size={48} className="text-[#C9A84C] mx-auto mb-4" /><h2 className="text-3xl font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Sign In Required</h2><Link href="/auth/login?redirect=/account" className="px-8 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Sign In</Link></div>
    </div>
  )

  const totalSpend = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const deliveredCount = orders.filter(o => o.status === 'delivered').length
  const activeCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <div className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#F5F0E8]" style={{ fontFamily: 'Georgia, serif' }}>My Account</h1>
          <p className="text-[#A89F8F] mt-1">Welcome back, {user.full_name ?? user.email.split('@')[0]}</p>
        </div>
        {liveUpdated && <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}><Wifi size={12} /> Live update</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-5"><TrendingUp size={20} style={{ color: '#C9A84C' }} className="mb-3" /><p className="font-bold text-2xl" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>Rs {totalSpend.toLocaleString()}</p><p className="text-[#A89F8F] text-sm mt-1">Total Spend</p></div>
        <div className="glass-card rounded-2xl p-5"><Package size={20} style={{ color: '#FF9448' }} className="mb-3" /><p className="font-bold text-2xl" style={{ color: '#FF9448', fontFamily: 'Georgia, serif' }}>{activeCount}</p><p className="text-[#A89F8F] text-sm mt-1">Active Orders</p></div>
        <div className="glass-card rounded-2xl p-5 col-span-2 sm:col-span-1"><Package size={20} style={{ color: '#25D366' }} className="mb-3" /><p className="font-bold text-2xl" style={{ color: '#25D366', fontFamily: 'Georgia, serif' }}>{deliveredCount}</p><p className="text-[#A89F8F] text-sm mt-1">Delivered</p></div>
      </div>

      {/* Become a Seller CTA — only shown to users without seller role */}
      {user.is_buyer && !user.is_seller && (
        <div className="glass-card rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-4" style={{ border: '1px solid rgba(201,168,76,0.3)' }}>
          <Sparkles size={28} style={{ color: '#C9A84C' }} className="flex-shrink-0" />
          <div className="flex-1 text-center sm:text-left"><p className="font-semibold" style={{ color: '#F5F0E8' }}>Want to sell your own perfumes?</p><p className="text-sm" style={{ color: '#A89F8F' }}>Get your own seller dashboard with inventory management and live sales tracking.</p></div>
          <Link href="/seller/setup" className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Become a Seller <ArrowRight size={16} /></Link>
        </div>
      )}

      {/* Switch to Seller CTA — shown to users with seller role */}
      {user.is_buyer && user.is_seller && (
        <div className="glass-card rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-4" style={{ border: '1px solid rgba(201,168,76,0.3)' }}>
          <Store size={28} style={{ color: '#C9A84C' }} className="flex-shrink-0" />
          <div className="flex-1 text-center sm:text-left"><p className="font-semibold" style={{ color: '#F5F0E8' }}>You have Seller access!</p><p className="text-sm" style={{ color: '#A89F8F' }}>Switch to your Seller Dashboard to manage your products and orders.</p></div>
          <Link href="/seller" className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap border" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>Switch to Seller <ArrowRight size={16} /></Link>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-5" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Order History</h2>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center"><Package size={48} className="mx-auto mb-4" style={{ color: 'rgba(201,168,76,0.3)' }} /><p style={{ color: '#A89F8F' }} className="mb-4">No orders yet</p><Link href="/products" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Start Shopping</Link></div>
          ) : orders.map(order => (
            <div key={order.id} className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-1" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>#{order.id?.slice(0, 8).toUpperCase()}</p>
                <p className="text-[#F5F0E8] font-medium">{order.perfumes?.brand} — {order.perfumes?.title}</p>
                <p className="text-[#A89F8F] text-sm mt-0.5">Qty: {order.quantity} • {new Date(order.created_at).toLocaleDateString('en-PK')} • {order.payment_method?.toUpperCase()}</p>
              </div>
              <p className="text-[#C9A84C] font-bold">Rs {order.total_price?.toLocaleString()}</p>
              <span className={STATUS_BADGE[order.status as OrderStatus] ?? 'badge-like-new'}>{ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

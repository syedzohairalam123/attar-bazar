'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { ORDER_STATUS_LABEL, OrderStatus } from '@/lib/types'
import { TrendingUp, Package, ShoppingBag, Clock, Loader2, Plus, Wifi, ArrowRight } from 'lucide-react'

export default function SellerDashboard() {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [listings, setListings] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveUpdated, setLiveUpdated] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('perfumes').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, perfumes(title, brand)').eq('seller_id', user.id).order('created_at', { ascending: false }),
    ]).then(([{ data: l }, { data: o }]) => { setListings(l ?? []); setOrders(o ?? []); setLoading(false) })

    const channel = supabase.channel('seller-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${user.id}` }, (payload) => {
        setLiveUpdated(true)
        setTimeout(() => setLiveUpdated(false), 2000)
        if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as any, ...prev])
        else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfumes', filter: `seller_id=eq.${user.id}` }, (payload) => {
        setLiveUpdated(true)
        setTimeout(() => setLiveUpdated(false), 2000)
        if (payload.eventType === 'UPDATE') setListings(prev => prev.map(l => l.id === (payload.new as any).id ? { ...l, ...payload.new } : l))
        else if (payload.eventType === 'INSERT') setListings(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const pendingRevenue = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const shippedCount = orders.filter(o => o.status === 'dispatched' || o.status === 'out_for_delivery').length
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length
  const activeListings = listings.filter(l => l.status === 'active').length

  const statCards = [
    { label: 'Revenue (Delivered)', value: `Rs ${revenue.toLocaleString()}`, icon: TrendingUp, color: '#25D366' },
    { label: 'Pending Revenue', value: `Rs ${pendingRevenue.toLocaleString()}`, icon: Clock, color: '#FF9448' },
    { label: 'Shipped Orders', value: shippedCount, icon: ShoppingBag, color: '#2196F3' },
    { label: 'Active Listings', value: activeListings, icon: Package, color: '#C9A84C' },
  ]

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Seller Dashboard</h1><p className="text-sm mt-1" style={{ color: '#A89F8F' }}>Real-time overview of your shop</p></div>
        <div className="flex items-center gap-3">
          {liveUpdated && <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}><Wifi size={12} /> Live update</span>}
          {user?.is_buyer && (
            <Link href="/" className="text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              <ShoppingBag size={12} /> Buyer <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-2xl p-5"><Icon size={20} style={{ color }} className="mb-3" /><p className="font-bold text-xl lg:text-2xl" style={{ color, fontFamily: 'Georgia, serif' }}>{loading ? '—' : value}</p><p className="text-xs mt-1" style={{ color: '#A89F8F' }}>{label}</p></div>
        ))}
      </div>

      <div className="flex gap-3 mb-8">
        <Link href="/seller/products/new" className="px-5 py-3 rounded-xl font-semibold flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><Plus size={16} /> Add Product</Link>
        <Link href="/seller/orders" className="px-5 py-3 rounded-xl font-semibold border" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>View Orders</Link>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Recent Orders</h3><Link href="/seller/orders" className="text-xs" style={{ color: '#C9A84C' }}>View All →</Link></div>
            <div className="space-y-3">
              {orders.length === 0 ? <p className="text-sm text-center py-6" style={{ color: '#A89F8F' }}>No orders yet</p> : orders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>{o.perfumes?.brand} — {o.perfumes?.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{new Date(o.created_at).toLocaleDateString('en-PK')}</p></div>
                  <p className="font-bold text-sm" style={{ color: '#C9A84C' }}>Rs {o.total_price?.toLocaleString()}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full badge-like-new">{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>My Listings</h3><Link href="/seller/products" className="text-xs" style={{ color: '#C9A84C' }}>Manage →</Link></div>
            <div className="space-y-3">
              {listings.length === 0 ? <p className="text-sm text-center py-6" style={{ color: '#A89F8F' }}>No listings yet</p> : listings.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>{l.brand} — {l.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{l.views ?? 0} views</p></div>
                  <p className="font-bold text-sm" style={{ color: '#C9A84C' }}>Rs {l.price?.toLocaleString()}</p>
                  <span className={l.status === 'active' ? 'badge-new' : 'badge-used'}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

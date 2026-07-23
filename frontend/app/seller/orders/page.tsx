'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { sendEmail } from '@/lib/email'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, OrderStatus } from '@/lib/types'
import { Loader2, MessageCircle, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SellerOrders() {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [liveUpdated, setLiveUpdated] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('orders').select('*, perfumes(title, brand, images)').eq('seller_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { setOrders(data ?? []); setLoading(false) })

    const channel = supabase.channel('seller-orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${user.id}` }, (payload) => {
        setLiveUpdated(true); setTimeout(() => setLiveUpdated(false), 2000)
        if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as any, ...prev])
        else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const updateStatus = async (order: any, newStatus: OrderStatus) => {
    setUpdatingId(order.id)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
      if (order.buyer_email) sendEmail({ to: order.buyer_email, type: 'order_status_update', data: { orderId: order.id, status: newStatus, paymentMethod: order.payment_method } }).catch(console.error)
      toast.success(`Order marked "${ORDER_STATUS_LABEL[newStatus]}" — buyer notified by email`)
    } else toast.error('Update failed')
    setUpdatingId(null)
  }

  const statusColor: Record<string, string> = { delivered: 'badge-new', cancelled: 'badge-used', confirmed: 'badge-new', dispatched: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs', out_for_delivery: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs', pending: 'badge-like-new' }

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Orders</h1><p className="text-sm mt-1" style={{ color: '#A89F8F' }}>{orders.length} total orders — update status to notify buyers automatically</p></div>
        {liveUpdated && <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}><Wifi size={12} /> Live update</span>}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">
          {orders.length === 0 ? <div className="glass-card rounded-2xl p-12 text-center" style={{ color: '#A89F8F' }}>No orders yet</div> : orders.map(o => (
            <div key={o.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2"><span className="font-semibold" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif', fontSize: '12px' }}>#{o.id?.slice(0, 8).toUpperCase()}</span><span className={statusColor[o.status] ?? 'badge-like-new'}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span><span className="text-xs" style={{ color: '#A89F8F' }}>{new Date(o.created_at).toLocaleString('en-PK')}</span></div>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Buyer</p><p className="font-medium" style={{ color: '#F5F0E8' }}>{o.buyer_name ?? '—'}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{o.buyer_phone}</p></div>
                    <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Product</p><p className="font-medium truncate" style={{ color: '#F5F0E8' }}>{o.perfumes?.brand} — {o.perfumes?.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>Qty: {o.quantity}</p></div>
                    <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Payment</p><p className="font-bold" style={{ color: '#C9A84C' }}>Rs {o.total_price?.toLocaleString()}</p><p className="text-xs capitalize" style={{ color: '#A89F8F' }}>{o.payment_method}</p></div>
                  </div>
                  {o.delivery_address && <p className="text-xs mt-2" style={{ color: '#A89F8F' }}>📍 {o.delivery_address}</p>}
                  {o.buyer_phone && <a href={`https://wa.me/${o.buyer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 mt-2 w-fit" style={{ color: '#25D366' }}><MessageCircle size={12} /> Message buyer on WhatsApp</a>}
                </div>
                <div className="flex-shrink-0 lg:w-44">
                  <p className="text-xs mb-2 text-center lg:text-left" style={{ color: '#A89F8F' }}>Update Status</p>
                  <div className="flex flex-wrap gap-1 lg:flex-col">
                    {ORDER_STATUSES.map(s => (<button key={s} onClick={() => updateStatus(o, s)} disabled={o.status === s || updatingId === o.id} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40" style={o.status === s ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>{updatingId === o.id ? '...' : ORDER_STATUS_LABEL[s]}</button>))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

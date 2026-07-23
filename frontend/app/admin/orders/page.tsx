'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendEmail } from '@/lib/email'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, OrderStatus } from '@/lib/types'
import { Loader2, Search, Banknote, Smartphone, Copy, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'

const PAYMENT_KIND: Record<string, { label: string; kind: 'Cash' | 'Online'; icon: any; color: string }> = {
  cod: { label: 'Cash on Delivery', kind: 'Cash', icon: Banknote, color: '#4b5563' },
  jazzcash: { label: 'JazzCash', kind: 'Online', icon: Smartphone, color: '#CC0000' },
  easypaisa: { label: 'EasyPaisa', kind: 'Online', icon: Smartphone, color: '#00A651' },
  bank: { label: 'Bank Transfer', kind: 'Online', icon: Smartphone, color: '#1d4ed8' },
}

export default function AdminOrders() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Cash' | 'Online'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [liveUpdated, setLiveUpdated] = useState(false)

  useEffect(() => {
    supabase.from('orders').select('*, perfumes(title, brand, images)').order('created_at', { ascending: false }).then(({ data }) => { setOrders(data ?? []); setLoading(false) })
    const channel = supabase.channel('admin-orders-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        setLiveUpdated(true); setTimeout(() => setLiveUpdated(false), 2000)
        if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as any, ...prev])
        else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateStatus = async (order: any, newStatus: OrderStatus) => {
    setUpdatingId(order.id)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
      if (order.buyer_email) { sendEmail({ to: order.buyer_email, type: 'order_status_update', data: { orderId: order.id, status: newStatus, paymentMethod: order.payment_method } }).catch(console.error); toast.success(`Order updated to "${ORDER_STATUS_LABEL[newStatus]}" — email sent to customer`) }
      else toast.success(`Order updated to "${ORDER_STATUS_LABEL[newStatus]}"`)
    } else toast.error('Update failed')
    setUpdatingId(null)
  }

  const copyId = (id: string) => { navigator.clipboard.writeText(id); toast.success('Customer ID copied') }
  const filtered = orders.filter(o => {
    const s = search.toLowerCase()
    const paymentKind = PAYMENT_KIND[o.payment_method]?.kind
    return (filter === 'all' || o.status === filter) && (paymentFilter === 'all' || paymentKind === paymentFilter)
      && (!s || o.buyer_name?.toLowerCase().includes(s) || o.buyer_phone?.includes(s) || o.buyer_email?.toLowerCase().includes(s) || o.id?.includes(s) || o.buyer_id?.includes(s))
  })

  const statusColor: Record<string, string> = { delivered: 'badge-new', cancelled: 'badge-used', confirmed: 'badge-new', dispatched: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs', out_for_delivery: 'text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 text-xs', pending: 'badge-like-new' }
  const inp = "bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-2.5 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C]"

  const cashTotal = orders.filter(o => PAYMENT_KIND[o.payment_method]?.kind === 'Cash').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const onlineTotal = orders.filter(o => PAYMENT_KIND[o.payment_method]?.kind === 'Online').reduce((s, o) => s + (o.total_price ?? 0), 0)
  const deliveredCount = orders.filter(o => o.status === 'delivered').length
  const pendingCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Manage Orders</h1><p className="text-sm mt-0.5" style={{ color: '#A89F8F' }}>{orders.length} total orders — customer, product, bill, and delivery status all in one place</p></div>
        {liveUpdated && <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}><Wifi size={12} /> Live update</span>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4"><p className="text-xs mb-1" style={{ color: '#A89F8F' }}>Cash Total</p><p className="text-xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Rs {cashTotal.toLocaleString()}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs mb-1" style={{ color: '#A89F8F' }}>Online Total</p><p className="text-xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>Rs {onlineTotal.toLocaleString()}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs mb-1" style={{ color: '#A89F8F' }}>Delivered</p><p className="text-xl font-bold" style={{ color: '#25D366', fontFamily: 'Georgia, serif' }}>{deliveredCount}</p></div>
        <div className="glass-card rounded-xl p-4"><p className="text-xs mb-1" style={{ color: '#A89F8F' }}>Not Yet Delivered</p><p className="text-xl font-bold" style={{ color: '#FF9448', fontFamily: 'Georgia, serif' }}>{pendingCount}</p></div>
      </div>
      <div className="relative mb-4"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A89F8F' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer name, email, phone, or order/customer ID..." className={inp + ' w-full pl-10'} /></div>
      <div className="flex flex-wrap gap-2 mb-2"><span className="text-xs self-center mr-1" style={{ color: '#A89F8F' }}>Status:</span>{['all', ...ORDER_STATUSES].map(f => (<button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all" style={filter === f ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>{f === 'all' ? 'all' : ORDER_STATUS_LABEL[f as OrderStatus]}</button>))}</div>
      <div className="flex flex-wrap gap-2 mb-6"><span className="text-xs self-center mr-1" style={{ color: '#A89F8F' }}>Payment:</span>{(['all', 'Cash', 'Online'] as const).map(f => (<button key={f} onClick={() => setPaymentFilter(f)} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={paymentFilter === f ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>{f}</button>))}</div>

      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">
          {filtered.map(o => {
            const pay = PAYMENT_KIND[o.payment_method] ?? { label: o.payment_method, kind: 'Online', icon: Smartphone, color: '#C9A84C' }
            const PayIcon = pay.icon
            return (
              <div key={o.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#13112A' }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2"><span className="font-semibold" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif', fontSize: '12px' }}>Order #{o.id?.slice(0, 8).toUpperCase()}</span><span className={`capitalize ${statusColor[o.status] ?? 'badge-like-new'}`}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span><span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: `${pay.color}20`, color: pay.color }}><PayIcon size={11} />{pay.kind}: {pay.label}</span><span className="text-xs" style={{ color: '#A89F8F' }}>{new Date(o.created_at).toLocaleString('en-PK')}</span></div>
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Customer</p><p className="font-medium" style={{ color: '#F5F0E8' }}>{o.buyer_name ?? '—'}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{o.buyer_email ?? '—'}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{o.buyer_phone ?? '—'}</p><button onClick={() => copyId(o.buyer_id)} className="text-xs flex items-center gap-1 mt-1 hover:text-[#C9A84C] transition-colors" style={{ color: '#A89F8F' }}><Copy size={10} /> Customer ID: {o.buyer_id?.slice(0, 8)}…</button></div>
                      <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Product Purchased</p><p className="font-medium truncate" style={{ color: '#F5F0E8' }}>{o.perfumes?.brand} — {o.perfumes?.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>Qty: {o.quantity}</p></div>
                      <div><p className="text-xs mb-0.5" style={{ color: '#A89F8F' }}>Bill Total</p><p className="font-bold text-lg" style={{ color: '#C9A84C' }}>Rs {o.total_price?.toLocaleString()}</p></div>
                    </div>
                    {o.delivery_address && <p className="text-xs mt-2" style={{ color: '#A89F8F' }}>📍 {o.delivery_address}</p>}
                    {o.notes && <p className="text-xs mt-1 italic" style={{ color: '#A89F8F' }}>Note: {o.notes}</p>}
                  </div>
                  <div className="flex-shrink-0 lg:w-44">
                    <p className="text-xs mb-2 text-center lg:text-left" style={{ color: '#A89F8F' }}>Delivery Status</p>
                    <div className="flex flex-wrap gap-1 lg:flex-col">{ORDER_STATUSES.map(s => (<button key={s} onClick={() => updateStatus(o, s)} disabled={o.status === s || updatingId === o.id} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40" style={o.status === s ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>{updatingId === o.id ? '...' : ORDER_STATUS_LABEL[s]}</button>))}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="glass-card rounded-2xl p-10 text-center" style={{ color: '#A89F8F' }}>No orders found</div>}
        </div>
      )}
    </div>
  )
}

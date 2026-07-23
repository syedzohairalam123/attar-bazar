'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Package, ShoppingBag, MessageSquare, Settings, TrendingUp, Tag, Wifi } from 'lucide-react'

export default function AdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ users: 0, listings: 0, orders: 0, messages: 0, revenue: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [recentListings, setRecentListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveUpdated, setLiveUpdated] = useState(false)

  const loadStats = () => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('perfumes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_price').eq('status', 'delivered'),
      supabase.from('orders').select('*, perfumes(title,brand)').order('created_at', { ascending: false }).limit(5),
      supabase.from('perfumes').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    ]).then(([u, p, o, m, rev, orders, listings]) => {
      setStats({ users: u.count ?? 0, listings: p.count ?? 0, orders: o.count ?? 0, messages: m.count ?? 0, revenue: (rev.data ?? []).reduce((s: number, r: any) => s + (r.total_price ?? 0), 0) })
      setRecentOrders(orders.data ?? [])
      setRecentListings(listings.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadStats()
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { setLiveUpdated(true); setTimeout(() => setLiveUpdated(false), 2000); loadStats() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { setLiveUpdated(true); setTimeout(() => setLiveUpdated(false), 2000); loadStats() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const menuItems = [
    { href: '/admin/users', icon: Users, label: 'Manage Users', desc: 'View, edit, change roles, ban users' },
    { href: '/admin/listings', icon: Package, label: 'Manage Listings', desc: 'Approve, reject, feature, delete' },
    { href: '/admin/orders', icon: ShoppingBag, label: 'Manage Orders', desc: 'Customer, product, payment & delivery status' },
    { href: '/admin/categories', icon: Tag, label: 'Categories', desc: 'Add/edit perfume categories' },
    { href: '/admin/settings', icon: Settings, label: 'Site Settings', desc: 'Name, tagline, hero text, contact info' },
    { href: '/admin/messages', icon: MessageSquare, label: 'Contact Messages', desc: 'Customer inquiries & support' },
  ]
  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: '#C9A84C', href: '/admin/users' },
    { label: 'Active Listings', value: stats.listings, icon: Package, color: '#FF9448', href: '/admin/listings' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, color: '#25D366', href: '/admin/orders' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, color: '#E8A598', href: '/admin/messages' },
    { label: 'Revenue', value: `Rs ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: '#C9A84C', href: '/admin/orders' },
  ]
  const statusColor: Record<string, string> = { delivered: 'badge-new', cancelled: 'badge-used', pending: 'badge-like-new', active: 'badge-new', sold: 'badge-used' }

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Dashboard</h1>
        {liveUpdated && <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(37,211,102,0.15)', color: '#25D366' }}><Wifi size={12} /> Live update</span>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">{statCards.map(({ label, value, icon: Icon, color, href }) => (<Link key={label} href={href} className="glass-card rounded-2xl p-5 hover:border-[rgba(201,168,76,0.4)] transition-all group"><Icon size={20} style={{ color }} className="mb-3" /><p className="font-bold text-2xl lg:text-3xl" style={{ color, fontFamily: 'Georgia, serif' }}>{loading ? '—' : value}</p><p className="text-xs mt-1" style={{ color: '#A89F8F' }}>{label}</p></Link>))}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">{menuItems.map(({ href, icon: Icon, label, desc }) => (<Link key={href} href={href} className="glass-card rounded-2xl p-6 flex items-start gap-4 hover:border-[rgba(201,168,76,0.4)] transition-all group"><div className="w-12 h-12 rounded-2xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center flex-shrink-0"><Icon size={22} className="text-[#C9A84C]" /></div><div><p className="font-semibold" style={{ color: '#F5F0E8' }}>{label}</p><p className="text-sm mt-0.5" style={{ color: '#A89F8F' }}>{desc}</p></div></Link>))}</div>
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-6"><div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Recent Orders</h3><Link href="/admin/orders" className="text-xs" style={{ color: '#C9A84C' }}>View All →</Link></div><div className="space-y-3">{recentOrders.length === 0 ? <p className="text-sm text-center py-4" style={{ color: '#A89F8F' }}>No orders yet</p> : recentOrders.map(o => (<div key={o.id} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>{o.perfumes?.brand} — {o.perfumes?.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{new Date(o.created_at).toLocaleDateString('en-PK')}</p></div><p className="font-bold text-sm" style={{ color: '#C9A84C' }}>Rs {o.total_price?.toLocaleString()}</p><span className={`text-xs capitalize ${statusColor[o.status] ?? 'badge-like-new'}`}>{o.status}</span></div>))}</div></div>
          <div className="glass-card rounded-2xl p-6"><div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Recent Listings</h3><Link href="/admin/listings" className="text-xs" style={{ color: '#C9A84C' }}>View All →</Link></div><div className="space-y-3">{recentListings.length === 0 ? <p className="text-sm text-center py-4" style={{ color: '#A89F8F' }}>No listings yet</p> : recentListings.map(l => (<div key={l.id} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: 'rgba(201,168,76,0.08)' }}><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#F5F0E8' }}>{l.brand} — {l.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{l.profiles?.full_name} • {new Date(l.created_at).toLocaleDateString('en-PK')}</p></div><p className="font-bold text-sm" style={{ color: '#C9A84C' }}>Rs {l.price?.toLocaleString()}</p><span className={`text-xs capitalize ${statusColor[l.status] ?? 'badge-like-new'}`}>{l.status}</span></div>))}</div></div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Star, CheckCircle, XCircle, Eye, Trash2, Loader2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminListings() {
  const supabase = createClient()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { supabase.from('perfumes').select('*, profiles(full_name)').order('created_at', { ascending: false }).then(({ data }) => { setListings(data ?? []); setLoading(false) }) }, [])

  const update = async (id: string, updates: any, msg: string) => {
    const { error } = await supabase.from('perfumes').update(updates).eq('id', id)
    if (!error) { setListings(p => p.map(l => l.id === id ? { ...l, ...updates } : l)); toast.success(msg) } else toast.error('Update failed')
  }
  const del = async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return
    const { error } = await supabase.from('perfumes').delete().eq('id', id)
    if (!error) { setListings(p => p.filter(l => l.id !== id)); toast.success('Listing deleted') }
  }

  const filtered = listings.filter(l => { const s = search.toLowerCase(); return (filter === 'all' || l.status === filter) && (!s || l.title.toLowerCase().includes(s) || l.brand.toLowerCase().includes(s)) })
  const inp = "bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-2.5 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C]"
  const statusBadge: Record<string, string> = { active: 'badge-new', sold: 'badge-used', rejected: 'badge-used', pending: 'badge-like-new' }

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Manage Listings</h1>
      <p className="text-sm mb-6" style={{ color: '#A89F8F' }}>{listings.length} total listings</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-6"><div className="relative flex-1"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A89F8F' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or brand..." className={inp + " w-full pl-10"} /></div><div className="flex gap-2 flex-wrap">{['all', 'active', 'sold', 'pending', 'rejected'].map(f => (<button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all" style={filter === f ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>{f}</button>))}</div></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">{filtered.map(l => (
          <div key={l.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#13112A' }}>{l.images?.[0] ? <Image src={l.images[0]} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🧴</div>}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5 flex-wrap"><span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>{l.brand}</span>{l.featured && <span className="badge-featured">⭐ Featured</span>}<span className={statusBadge[l.status] ?? 'badge-like-new'}>{l.status}</span></div><p className="font-medium text-sm truncate" style={{ color: '#F5F0E8' }}>{l.title}</p><p className="text-xs" style={{ color: '#A89F8F' }}>{l.profiles?.full_name ?? '—'} • Rs {l.price.toLocaleString()} • {new Date(l.created_at).toLocaleDateString('en-PK')}</p></div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => update(l.id, { featured: !l.featured }, l.featured ? 'Unfeatured' : 'Featured!')} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: l.featured ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)', color: '#C9A84C' }}><Star size={13} fill={l.featured ? 'currentColor' : 'none'} /></button>
              <button onClick={() => update(l.id, { status: 'active' }, 'Approved!')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}><CheckCircle size={13} /></button>
              <button onClick={() => update(l.id, { status: 'rejected' }, 'Rejected')} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><XCircle size={13} /></button>
              <Link href={`/products/${l.id}`} target="_blank" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}><Eye size={13} /></Link>
              <button onClick={() => del(l.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
          {filtered.length === 0 && <div className="glass-card rounded-2xl p-10 text-center" style={{ color: '#A89F8F' }}>No listings found</div>}
        </div>
      )}
    </div>
  )
}

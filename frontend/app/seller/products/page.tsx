'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { Plus, Trash2, Eye, CheckCircle, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SellerProducts() {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('perfumes').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { setListings(data ?? []); setLoading(false) })
  }, [user?.id])

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'sold' : 'active'
    const { error } = await supabase.from('perfumes').update({ status: newStatus }).eq('id', id)
    if (!error) { setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l)); toast.success(`Marked as ${newStatus}`) }
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Delete this listing permanently? This cannot be undone.')) return
    const { error } = await supabase.from('perfumes').delete().eq('id', id)
    if (!error) { setListings(prev => prev.filter(l => l.id !== id)); toast.success('Listing deleted') }
    else toast.error('Failed to delete listing')
  }

  const statusColor: Record<string, string> = { active: 'badge-new', sold: 'badge-used', pending: 'badge-like-new', rejected: 'badge-used' }

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>My Products</h1><p className="text-sm mt-1" style={{ color: '#A89F8F' }}>{listings.length} total listings</p></div>
        <Link href="/seller/products/new" className="px-5 py-3 rounded-xl font-semibold flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><Plus size={16} /> Add Product</Link>
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center"><p className="mb-4" style={{ color: '#A89F8F' }}>No listings yet</p><Link href="/seller/products/new" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Create Your First Listing</Link></div>
          ) : listings.map(l => (
            <div key={l.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#13112A' }}>{l.images?.[0] ? <Image src={l.images[0]} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🧴</div>}</div>
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><p className="text-xs" style={{ color: '#C9A84C' }}>{l.brand}</p><span className={statusColor[l.status] ?? 'badge-like-new'}>{l.status}</span></div><p className="font-medium truncate" style={{ color: '#F5F0E8' }}>{l.title}</p><p className="font-bold" style={{ color: '#C9A84C' }}>Rs {l.price.toLocaleString()}</p></div>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#A89F8F' }}><Eye size={12} /> {l.views ?? 0}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(l.id, l.status)} title={l.status === 'active' ? 'Mark as Sold' : 'Mark as Active'} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>{l.status === 'active' ? <CheckCircle size={14} /> : <Clock size={14} />}</button>
                <Link href={`/products/${l.id}`} target="_blank" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}><Eye size={14} /></Link>
                <button onClick={() => deleteListing(l.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

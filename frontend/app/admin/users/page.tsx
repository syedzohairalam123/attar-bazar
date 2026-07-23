'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => { setUsers(data ?? []); setLoading(false) }) }, [])

  const updateRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (!error) { setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u)); toast.success(`Role updated to ${role}`) } else toast.error(error.message ?? 'Update failed')
  }

  const filtered = users.filter(u => { const s = search.toLowerCase(); return (filter === 'all' || u.role === filter) && (!s || u.full_name?.toLowerCase().includes(s) || u.phone?.includes(s) || u.city?.toLowerCase().includes(s)) })
  const roleColor: Record<string, string> = { admin: 'bg-[rgba(201,168,76,0.2)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] rounded-full px-2 py-0.5 text-xs', seller: 'badge-like-new', buyer: 'badge-new' }
  const inp = "bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-2.5 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C] w-full"

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Manage Users</h1>
      <p className="text-sm mb-6" style={{ color: '#A89F8F' }}>{users.length} registered users</p>
      <div className="grid grid-cols-3 gap-4 mb-6">{['buyer', 'seller', 'admin'].map(r => (<div key={r} className="glass-card rounded-xl p-4 text-center"><p className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>{users.filter(u => u.role === r).length}</p><p className="text-xs capitalize mt-1" style={{ color: '#A89F8F' }}>{r}s</p></div>))}</div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6"><div className="relative flex-1"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A89F8F' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or city..." className={inp + ' pl-10'} /></div><div className="flex gap-2">{['all', 'buyer', 'seller', 'admin'].map(f => (<button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all" style={filter === f ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>{f}</button>))}</div></div>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">{filtered.map(u => (
          <div key={u.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(201,168,76,0.2)' }}>{u.avatar_url ? <Image src={u.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover" /> : <User size={18} style={{ color: '#C9A84C' }} />}</div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-sm" style={{ color: '#F5F0E8' }}>{u.full_name ?? 'Anonymous'}</p><span className={`capitalize ${roleColor[u.role] ?? 'badge-new'}`}>{u.role}</span></div><p className="text-xs" style={{ color: '#A89F8F' }}>ID: {u.id.slice(0, 8)}… • {u.phone ?? '—'} • {u.city ?? '—'} • Joined {new Date(u.created_at).toLocaleDateString('en-PK')}</p></div>
            <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} className="bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-3 py-2 text-[#F5F0E8] text-xs focus:outline-none"><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="admin">Admin</option></select>
          </div>
        ))}
          {filtered.length === 0 && <div className="glass-card rounded-2xl p-10 text-center" style={{ color: '#A89F8F' }}>No users found</div>}
        </div>
      )}
    </div>
  )
}

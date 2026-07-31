'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2, User, Shield, Store, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'buyer', 'seller', 'admin'
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => { 
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => { 
      setUsers(data ?? []) 
      setLoading(false) 
    }) 
  }, [])

  // Update specific boolean role flag for a user
  const updateRoleFlag = async (userId: string, field: 'is_buyer' | 'is_seller' | 'is_admin', currentValue: boolean) => {
    const newValue = !currentValue
    setUpdatingId(userId)

    const { error } = await supabase
      .from('profiles')
      .update({ [field]: newValue })
      .eq('id', userId)

    if (!error) {
      setUsers(p => p.map(u => u.id === userId ? { ...u, [field]: newValue } : u))
      toast.success(`Successfully updated ${field.replace('is_', '')} access!`)
    } else {
      toast.error(error.message ?? 'Update failed! Check security policies.')
    }
    setUpdatingId(null)
  }

  // Filter logic adapted for boolean multi-roles
  const filtered = users.filter(u => {
    const s = search.toLowerCase()
    const matchesSearch = !s || u.full_name?.toLowerCase().includes(s) || u.phone?.includes(s) || u.city?.toLowerCase().includes(s)
    
    if (!matchesSearch) return false

    if (filter === 'admin') return u.is_admin === true
    if (filter === 'seller') return u.is_seller === true
    if (filter === 'buyer') return u.is_buyer !== false // default true fallback
    return true
  })

  const inp = "bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-2.5 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C] w-full"

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Manage Users & Roles</h1>
      <p className="text-sm mb-6" style={{ color: '#A89F8F' }}>{users.length} registered users on platform</p>
      
      {/* Role Counts Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            {users.filter(u => u.is_buyer !== false).length}
          </p>
          <p className="text-xs capitalize mt-1" style={{ color: '#A89F8F' }}>Buyers</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            {users.filter(u => u.is_seller).length}
          </p>
          <p className="text-xs capitalize mt-1" style={{ color: '#A89F8F' }}>Sellers</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
            {users.filter(u => u.is_admin).length}
          </p>
          <p className="text-xs capitalize mt-1" style={{ color: '#A89F8F' }}>Admins</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A89F8F' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or city..." className={inp + ' pl-10'} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'buyer', 'seller', 'admin'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all" 
              style={filter === f ? { background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' } : { border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users List Container */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.id} className="glass-card rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              
              {/* User Avatar & Details */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(201,168,76,0.2)' }}>
                  {u.avatar_url ? (
                    <Image src={u.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover" />
                  ) : (
                    <User size={18} style={{ color: '#C9A84C' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm" style={{ color: '#F5F0E8' }}>{u.full_name ?? 'Anonymous'}</p>
                    
                    {/* Role Badges */}
                    {u.is_admin && (
                      <span className="bg-[rgba(201,168,76,0.2)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                    {u.is_seller && (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <Store size={10} /> Seller
                      </span>
                    )}
                    {u.is_buyer !== false && (
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                        <ShoppingBag size={10} /> Buyer
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#A89F8F' }}>
                    ID: {u.id.slice(0, 8)}… • {u.phone ?? 'No phone'} • {u.city ?? 'No city'} • Joined {new Date(u.created_at).toLocaleDateString('en-PK')}
                  </p>
                </div>
              </div>

              {/* Multi-Role Quick Toggles (Interactive Buttons) */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-[rgba(201,168,76,0.1)]">
                {updatingId === u.id ? (
                  <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </div>
                ) : (
                  <>
                    {/* Buyer Toggle */}
                    <button
                      onClick={() => updateRoleFlag(u.id, 'is_buyer', u.is_buyer !== false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        u.is_buyer !== false 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/50'
                      }`}
                    >
                      Buyer: {u.is_buyer !== false ? 'Active' : 'Off'}
                    </button>

                    {/* Seller Toggle */}
                    <button
                      onClick={() => updateRoleFlag(u.id, 'is_seller', !!u.is_seller)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        u.is_seller 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/50'
                      }`}
                    >
                      Seller: {u.is_seller ? 'Yes' : 'No'}
                    </button>

                    {/* Admin Toggle */}
                    <button
                      onClick={() => updateRoleFlag(u.id, 'is_admin', !!u.is_admin)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        u.is_admin 
                          ? 'bg-[#C9A84C] text-[#06040E] shadow-md' 
                          : 'bg-gray-800/40 text-[#A89F8F] border border-[rgba(201,168,76,0.2)] hover:border-[#C9A84C]'
                      }`}
                    >
                      {u.is_admin ? '👑 Admin' : '+ Make Admin'}
                    </button>
                  </>
                )}
              </div>

            </div>
          ))}

          {filtered.length === 0 && (
            <div className="glass-card rounded-2xl p-10 text-center" style={{ color: '#A89F8F' }}>
              No users found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
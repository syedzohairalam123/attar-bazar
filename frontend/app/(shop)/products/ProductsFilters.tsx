'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react'
import { Category } from '@/lib/types'

export function ProductsFilters({ cities, categories, currentParams }: { cities: string[]; categories: Category[]; currentParams: Record<string, string | undefined> }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState({ category: currentParams.category ?? '', condition: currentParams.condition ?? '', city: currentParams.city ?? '', minPrice: currentParams.minPrice ?? '', maxPrice: currentParams.maxPrice ?? '' })
  const activeCount = Object.values(filters).filter(Boolean).length

  const apply = () => {
    const params = new URLSearchParams()
    if (currentParams.search) params.set('search', currentParams.search)
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }
  const reset = () => {
    setFilters({ category: '', condition: '', city: '', minPrice: '', maxPrice: '' })
    const params = new URLSearchParams()
    if (currentParams.search) params.set('search', currentParams.search)
    router.push(`${pathname}${params.toString() ? '?' + params.toString() : ''}`)
  }

  const inputClass = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-3 py-2 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#C9A84C]"

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Filters</span>{activeCount > 0 && <button onClick={reset} className="text-xs flex items-center gap-1 hover:text-red-400" style={{ color: '#A89F8F' }}><RotateCcw size={10} /> Reset</button>}</div>
      {categories.length > 0 && (<div><p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#A89F8F' }}>Category</p><div className="space-y-1">{[{ id: '', name: 'All Categories', slug: '' }, ...categories].map(cat => (<button key={cat.id} onClick={() => setFilters(f => ({ ...f, category: cat.slug }))} className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all" style={filters.category === cat.slug ? { background: 'rgba(201,168,76,0.1)', color: '#C9A84C' } : { color: '#A89F8F' }}>{cat.name}</button>))}</div></div>)}
      <div><p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#A89F8F' }}>Condition</p><div className="space-y-1">{[{ value: '', label: 'All Conditions' }, { value: 'new', label: 'Brand New' }, { value: 'like-new', label: 'Like New' }, { value: 'used', label: 'Used' }].map(c => (<button key={c.value} onClick={() => setFilters(f => ({ ...f, condition: c.value }))} className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all" style={filters.condition === c.value ? { background: 'rgba(201,168,76,0.1)', color: '#C9A84C' } : { color: '#A89F8F' }}>{c.label}</button>))}</div></div>
      <div><p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#A89F8F' }}>Price Range (Rs)</p><div className="flex gap-2"><input type="number" placeholder="Min" value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} className={inputClass} /><input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} className={inputClass} /></div></div>
      {cities.length > 0 && (<div><p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#A89F8F' }}>City</p><select value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} className={inputClass}><option value="">All Cities</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}
      <button onClick={apply} className="w-full py-3 rounded-xl text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Apply Filters {activeCount > 0 && `(${activeCount})`}</button>
    </div>
  )

  return (<>
    <button onClick={() => setOpen(!open)} className="lg:hidden w-full glass-card rounded-xl px-4 py-3 flex items-center justify-between mb-4" style={{ color: '#F5F0E8' }}><span className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal size={16} style={{ color: '#C9A84C' }} />Filters {activeCount > 0 && <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: '#C9A84C', color: '#06040E' }}>{activeCount}</span>}</span><ChevronDown size={16} style={{ color: '#A89F8F' }} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div className="lg:hidden glass-card rounded-2xl p-5 mb-4"><FilterContent /></div>}
    <div className="hidden lg:block glass-card rounded-2xl p-5"><FilterContent /></div>
  </>)
}

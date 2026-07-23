'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCategories() {
  const supabase = createClient()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', slug: '', image_url: '' })

  useEffect(() => { supabase.from('categories').select('*').order('name').then(({ data }) => { setCategories(data ?? []); setLoading(false) }) }, [])
  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim()

  const addCategory = async () => {
    if (!newCat.name || !newCat.slug) { toast.error('Name and slug are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('categories').insert({ name: newCat.name.trim(), slug: newCat.slug.trim(), image_url: newCat.image_url || null }).select().single()
    if (!error && data) { setCategories(p => [...p, data]); setNewCat({ name: '', slug: '', image_url: '' }); toast.success('Category added!') } else toast.error(error?.message ?? 'Failed to add category')
    setSaving(false)
  }
  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) { setCategories(p => p.filter(c => c.id !== id)); toast.success('Category deleted') } else toast.error('Failed to delete')
  }

  const inp = "bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="p-5 sm:p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Categories</h1>
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Add New Category</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input value={newCat.name} placeholder="Category Name *" onChange={e => setNewCat(c => ({ ...c, name: e.target.value, slug: autoSlug(e.target.value) }))} className={inp} />
          <input value={newCat.slug} placeholder="Slug (auto-generated)" onChange={e => setNewCat(c => ({ ...c, slug: e.target.value }))} className={inp} />
          <input value={newCat.image_url} placeholder="Image URL (optional)" onChange={e => setNewCat(c => ({ ...c, image_url: e.target.value }))} className={inp} />
        </div>
        <button onClick={addCategory} disabled={saving} className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Category</button>
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-3">
          {categories.map(c => (
            <div key={c.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>{c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full rounded-xl object-cover" /> : <span className="text-xl">🌸</span>}</div>
              <div className="flex-1"><p className="font-medium" style={{ color: '#F5F0E8' }}>{c.name}</p><p className="text-xs" style={{ color: '#A89F8F' }}>/{c.slug}</p></div>
              <button onClick={() => deleteCategory(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}><Trash2 size={13} /></button>
            </div>
          ))}
          {categories.length === 0 && <div className="glass-card rounded-2xl p-8 text-center" style={{ color: '#A89F8F' }}>No categories yet. Add one above!</div>}
        </div>
      )}
    </div>
  )
}

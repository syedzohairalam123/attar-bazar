'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload, X, Plus, CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile } from '@/lib/queries'
import { useAuthStore } from '@/lib/store'
import { sendEmail } from '@/lib/email'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const { user } = useAuthStore()
  const supabase = createClient()
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ title: '', brand: '', description: '', price: '', original_price: '', condition: 'new', quantity: '1', city: '', category_id: '' })

  useEffect(() => { supabase.from('categories').select('*').order('name').then(({ data }) => { if (data) setCategories(data) }) }, [])

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (images.length + files.length > 6) { toast.error('Maximum 6 images allowed'); return }
    // basic file-type/size guard — mirrors the storage bucket policy server-side
    for (const f of files) {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} is larger than 5MB`); return }
    }
    setImages(p => [...p, ...files])
    files.forEach(f => { const r = new FileReader(); r.onload = () => setPreviews(p => [...p, r.result as string]); r.readAsDataURL(f) })
  }
  const removeImage = (i: number) => { setImages(p => p.filter((_, j) => j !== i)); setPreviews(p => p.filter((_, j) => j !== i)) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return
    if (!form.title.trim() || !form.brand.trim() || !form.price) { toast.error('Title, brand and price are required'); return }
    const price = parseFloat(form.price)
    if (!Number.isFinite(price) || price <= 0) { toast.error('Please enter a valid price'); return }
    setLoading(true)
    try {
      await ensureProfile(supabase, user.id, user.email)
      const imageUrls: string[] = []
      for (const file of images) {
        const ext = file.name.split('.').pop()
        const name = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('perfumes').upload(name, file)
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase.storage.from('perfumes').getPublicUrl(name)
        imageUrls.push(publicUrl)
      }
      const { data: perfume, error } = await supabase.from('perfumes').insert({
        title: form.title.trim().slice(0, 150), brand: form.brand.trim().slice(0, 100), description: form.description.trim().slice(0, 1000) || null,
        price, original_price: form.original_price ? parseFloat(form.original_price) : null,
        condition: form.condition, quantity: Math.max(1, parseInt(form.quantity) || 1),
        city: form.city.trim().slice(0, 100) || null, category_id: form.category_id || null,
        seller_id: user.id, images: imageUrls, status: 'active', featured: false, views: 0,
      }).select().single()
      if (error) throw error

      sendEmail({ to: user.email, type: 'new_listing_admin', data: { id: perfume.id, title: form.title, brand: form.brand, price, condition: form.condition, city: form.city, sellerName: user.email.split('@')[0], sellerEmail: user.email } }).catch(console.error)
      setSuccessId(perfume.id)
      toast.success('Listing published successfully!')
    } catch (err: any) { toast.error(err.message ?? 'Failed to create listing') } finally { setLoading(false) }
  }

  if (successId) return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto text-center pt-16">
      <div className="glass-card rounded-3xl p-12"><CheckCircle size={64} className="text-[#C9A84C] mx-auto mb-4" /><h2 className="text-3xl font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Listing Published!</h2><p className="text-[#A89F8F] mb-8">Your perfume is now live on the marketplace.</p>
        <div className="flex gap-4 justify-center flex-wrap"><Link href={`/products/${successId}`} target="_blank" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>View Listing</Link><Link href="/seller/products" className="px-6 py-3 rounded-xl font-semibold border" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>My Products</Link></div>
      </div>
    </div>
  )

  const inputClass = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]"
  const labelClass = "text-xs text-[#A89F8F] uppercase tracking-wider block mb-2"
  const sectionClass = "glass-card rounded-2xl p-6 space-y-4"

  return (
    <div className="p-5 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-[#F5F0E8] mb-6" style={{ fontFamily: 'Georgia, serif' }}>Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>Photos (Max 6)</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {previews.map((src, i) => (<div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#13112A]"><Image src={src} alt="" fill className="object-cover" /><button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"><X size={10} /></button></div>))}
            {previews.length < 6 && (<button type="button" onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-[rgba(201,168,76,0.3)] flex flex-col items-center justify-center gap-1 hover:border-[rgba(201,168,76,0.6)] transition-all text-[#A89F8F] hover:text-[#C9A84C]"><Upload size={20} /><span className="text-xs">Add</span></button>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
        </div>
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>Basic Information</h3>
          <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Perfume Title *</label><input required maxLength={150} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Oud Rose 100ml" className={inputClass} /></div><div><label className={labelClass}>Brand *</label><input required maxLength={100} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Al Haramain" className={inputClass} /></div></div>
          <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Fragrance notes, bottle size..." rows={4} maxLength={1000} className={inputClass + ' resize-none'} /></div>
          {categories.length > 0 && (<div><label className={labelClass}>Category</label><select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={inputClass}><option value="">Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>)}
        </div>
        <div className={sectionClass}>
          <h3 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>Pricing & Details</h3>
          <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Asking Price (Rs) *</label><input required type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000" className={inputClass} /></div><div><label className={labelClass}>Original Price (Rs)</label><input type="number" min="1" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="For discount display" className={inputClass} /></div></div>
          <div className="grid sm:grid-cols-3 gap-4"><div><label className={labelClass}>Condition *</label><select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className={inputClass}><option value="new">Brand New</option><option value="like-new">Like New</option><option value="used">Used</option></select></div><div><label className={labelClass}>Quantity</label><input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputClass} /></div><div><label className={labelClass}>City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Karachi" className={inputClass} /></div></div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <><Loader2 size={20} className="animate-spin" /> Publishing...</> : <><Plus size={20} /> Publish Listing</>}</button>
      </form>
    </div>
  )
}

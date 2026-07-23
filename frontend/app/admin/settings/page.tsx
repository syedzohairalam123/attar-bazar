'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const SETTINGS = [
  { key: 'site_name', label: 'Website Name', placeholder: 'Attar Bazaar', type: 'text', group: 'General' },
  { key: 'tagline', label: 'Tagline', placeholder: 'Scents that tell your story', type: 'text', group: 'General' },
  { key: 'hero_title', label: 'Hero Title (use \\n for new line)', placeholder: "Pakistan's Most Exclusive\nPerfume Marketplace", type: 'textarea', group: 'Homepage' },
  { key: 'hero_subtitle', label: 'Hero Subtitle', placeholder: 'Discover rare attars...', type: 'textarea', group: 'Homepage' },
  { key: 'hero_cta', label: 'Hero Button Text', placeholder: 'Explore Fragrances', type: 'text', group: 'Homepage' },
  { key: 'about_text', label: 'About Us Text', placeholder: 'About our marketplace...', type: 'textarea', group: 'About' },
  { key: 'mission_text', label: 'Mission Statement', placeholder: 'Our mission is...', type: 'textarea', group: 'About' },
  { key: 'founded_year', label: 'Founded Year', placeholder: '2024', type: 'text', group: 'About' },
  { key: 'contact_email', label: 'Contact Email', placeholder: 'hello@attarbazaar.pk', type: 'email', group: 'Contact' },
  { key: 'whatsapp_number', label: 'WhatsApp Number (with country code)', placeholder: '923190958709', type: 'text', group: 'Contact' },
  { key: 'address', label: 'Office Address', placeholder: 'Karachi, Pakistan', type: 'text', group: 'Contact' },
  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/attarbazaar', type: 'url', group: 'Social' },
  { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/attarbazaar', type: 'url', group: 'Social' },
]

export default function AdminSettings() {
  const supabase = createClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('key,value').then(({ data }) => {
      const v: Record<string, string> = {}
      data?.forEach(r => { v[r.key] = r.value })
      setValues(v)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const upserts = Object.entries(values).map(([key, value]) => ({ key, value }))
      const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      setSaved(true)
      toast.success('Settings saved! Changes are now live on the website.')
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) { toast.error(err.message ?? 'Failed to save settings') } finally { setSaving(false) }
  }

  const groups = [...new Set(SETTINGS.map(s => s.group))]
  const inp = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="p-5 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-3xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Site Settings</h1><p className="text-sm mt-0.5" style={{ color: '#A89F8F' }}>Applies to the website instantly</p></div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />} {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}</button>
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group} className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>{group}</h3>
              <div className="space-y-4">{SETTINGS.filter(s => s.group === group).map(({ key, label, placeholder, type }) => (
                <div key={key}><label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: '#A89F8F' }}>{label}</label>{type === 'textarea' ? <textarea value={values[key] ?? ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} placeholder={placeholder} rows={3} className={inp + ' resize-y'} /> : <input type={type} value={values[key] ?? ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} placeholder={placeholder} className={inp} />}</div>
              ))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

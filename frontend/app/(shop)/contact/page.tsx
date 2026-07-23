'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendEmail } from '@/lib/email'
import { MessageCircle, Mail, MapPin, Send, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [s, setS] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('settings').select('key,value').then(({ data }) => {
      const m: Record<string, string> = {}
      data?.forEach(r => { m[r.key] = r.value })
      setS(m)
    })
  }, [])

  const whatsapp = s.whatsapp_number ?? '923190958709'
  const email = s.contact_email ?? 'syedzohairalam@gmail.com'
  const address = s.address ?? 'Karachi, Pakistan'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const name = form.name.trim().slice(0, 100)
    const msg = form.message.trim().slice(0, 1000)
    if (!name || !form.email.trim() || !msg) { toast.error('Please fill all required fields'); return }
    setLoading(true)
    try {
      await supabase.from('contact_messages').insert({ name, email: form.email.trim(), phone: form.phone.trim() || null, subject: form.subject.trim() || null, message: msg }).then(() => {})
      await Promise.allSettled([sendEmail({ to: email, type: 'contact_form_admin', data: form }), sendEmail({ to: form.email, type: 'contact_form_user', data: form })])
      setSuccess(true)
    } catch { toast.error('Failed to send. Please try WhatsApp instead.') } finally { setLoading(false) }
  }

  const inp = "w-full bg-[#13112A] border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder:text-[rgba(168,159,143,0.4)] text-sm focus:outline-none focus:border-[#C9A84C]"

  return (
    <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12 sm:mb-16"><span className="text-sm font-semibold uppercase tracking-widest block mb-3" style={{ color: '#C9A84C', fontFamily: 'Cinzel, serif' }}>Get In Touch</span><h1 className="font-bold mb-4" style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem,6vw,4rem)', color: '#F5F0E8' }}>Contact Us</h1><p className="text-xl max-w-2xl mx-auto" style={{ color: '#A89F8F' }}>Have a question, problem, or feedback? We're here to help.</p></div>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
        <div className="lg:col-span-2 space-y-4">
          {[{ icon: MessageCircle, label: 'WhatsApp', value: `+${whatsapp}`, href: `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello! I need help with Attar Bazaar.')}`, color: '#25D366' }, { icon: Mail, label: 'Email', value: email, href: `mailto:${email}`, color: '#C9A84C' }, { icon: MapPin, label: 'Location', value: address, href: null, color: '#E8A598' }].map(({ icon: Icon, label, value, href, color }) => (
            <div key={label} className="glass-card rounded-2xl p-5 flex items-start gap-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}><Icon size={22} style={{ color }} /></div><div><p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#A89F8F' }}>{label}</p>{href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-medium transition-opacity hover:opacity-80" style={{ color }}>{value}</a> : <p className="font-medium" style={{ color: '#F5F0E8' }}>{value}</p>}</div></div>
          ))}
          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello! I need help with Attar Bazaar.')}`} target="_blank" rel="noopener noreferrer" className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-white transition-all block text-center" style={{ background: '#25D366', boxShadow: '0 4px 15px rgba(37,211,102,0.3)' }}><MessageCircle size={20} /> Chat on WhatsApp</a>
        </div>
        <div className="lg:col-span-3">
          {success ? (
            <div className="glass-card rounded-3xl p-10 sm:p-14 text-center h-full flex flex-col items-center justify-center"><CheckCircle size={64} className="mb-4" style={{ color: '#C9A84C' }} /><h3 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Georgia, serif', color: '#F5F0E8' }}>Message Sent!</h3><p style={{ color: '#A89F8F' }} className="mb-2">We'll reply within 24 hours.</p><button onClick={() => { setSuccess(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }) }} className="px-6 py-3 rounded-xl font-semibold border transition-all mt-6" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>Send Another Message</button></div>
          ) : (
            <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8">
              <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Georgia, serif', color: '#F5F0E8' }}>Send a Message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">{[{ k: 'name', l: 'Full Name *', p: 'Muhammad Ali', t: 'text' }, { k: 'email', l: 'Email *', p: 'you@example.com', t: 'email' }, { k: 'phone', l: 'Phone', p: '+92 300 0000000', t: 'tel' }, { k: 'subject', l: 'Subject', p: 'How can we help?', t: 'text' }].map(({ k, l, p, t }) => (<div key={k}><label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: '#A89F8F' }}>{l}</label><input type={t} required={l.includes('*')} maxLength={100} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} className={inp} /></div>))}</div>
                <div><label className="text-xs uppercase tracking-wider block mb-1.5" style={{ color: '#A89F8F' }}>Message *</label><textarea required maxLength={1000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your question or issue in detail..." rows={6} className={inp + ' resize-none'} /></div>
                <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : <><Send size={18} /> Send Message</>}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

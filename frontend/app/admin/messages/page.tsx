'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Phone, Loader2, MessageSquare } from 'lucide-react'

export default function AdminMessages() {
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => { setMessages(data ?? []); setLoading(false) }) }, [])
  const markRead = async (id: string) => { await supabase.from('contact_messages').update({ is_read: true }).eq('id', id); setMessages(p => p.map(m => m.id === id ? { ...m, is_read: true } : m)) }
  const unread = messages.filter(m => !m.is_read).length

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Contact Messages</h1>
      <p className="text-sm mb-6" style={{ color: '#A89F8F' }}>{messages.length} total · <span style={{ color: '#C9A84C' }}>{unread} unread</span></p>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {messages.length === 0 ? <div className="glass-card rounded-2xl p-10 text-center" style={{ color: '#A89F8F' }}>No messages yet</div> : messages.map(m => (
              <button key={m.id} onClick={() => { setSelected(m); if (!m.is_read) markRead(m.id) }} className="w-full text-left glass-card rounded-2xl p-4 transition-all hover:border-[rgba(201,168,76,0.4)]" style={selected?.id === m.id ? { borderColor: 'rgba(201,168,76,0.4)' } : !m.is_read ? { borderColor: 'rgba(201,168,76,0.2)' } : { opacity: 0.7 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{!m.is_read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C9A84C' }} />}<p className="font-medium text-sm truncate" style={{ color: '#F5F0E8' }}>{m.name}</p></div><p className="text-xs mb-1 truncate" style={{ color: '#C9A84C' }}>{m.subject || 'No subject'}</p><p className="text-xs truncate" style={{ color: '#A89F8F' }}>{m.message}</p></div>
                  <p className="text-xs flex-shrink-0" style={{ color: '#A89F8F' }}>{new Date(m.created_at).toLocaleDateString('en-PK')}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="sticky top-8">
            {selected ? (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>{selected.name}</h3><span className="text-xs" style={{ color: '#A89F8F' }}>{new Date(selected.created_at).toLocaleString('en-PK')}</span></div>
                <div className="space-y-2 mb-4"><div className="flex items-center gap-2 text-sm" style={{ color: '#A89F8F' }}><Mail size={13} style={{ color: '#C9A84C' }} />{selected.email}</div>{selected.phone && <div className="flex items-center gap-2 text-sm" style={{ color: '#A89F8F' }}><Phone size={13} style={{ color: '#C9A84C' }} />{selected.phone}</div>}</div>
                {selected.subject && <div className="mb-4"><p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#A89F8F' }}>Subject</p><p className="font-medium" style={{ color: '#F5F0E8' }}>{selected.subject}</p></div>}
                <div className="rounded-xl p-4 mb-6" style={{ background: '#13112A' }}><p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#A89F8F' }}>Message</p><p className="text-sm leading-relaxed" style={{ color: '#F5F0E8' }}>{selected.message}</p></div>
                <div className="flex gap-3">
                  <a href={`mailto:${selected.email}?subject=Re: ${selected.subject || 'Your message'}`} className="flex-1 py-3 rounded-xl font-semibold text-sm text-center transition-all" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Reply via Email</a>
                  {selected.phone && <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl font-semibold text-sm text-center text-white transition-all" style={{ background: '#25D366' }}>Reply on WhatsApp</a>}
                </div>
              </div>
            ) : <div className="glass-card rounded-2xl p-12 text-center"><MessageSquare size={40} className="mx-auto mb-3" style={{ color: 'rgba(201,168,76,0.3)' }} /><p style={{ color: '#A89F8F' }}>Select a message to view details</p></div>}
          </div>
        </div>
      )}
    </div>
  )
}

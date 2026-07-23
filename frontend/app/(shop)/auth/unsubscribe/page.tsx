'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function UnsubscribePage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const handleUnsubscribe = () => { setLoading(true); setTimeout(() => { setLoading(false); setDone(true) }, 1200) }
  if (done) return (<div className="min-h-screen flex items-center justify-center px-4 text-center"><div className="glass-card rounded-3xl p-12 max-w-md"><CheckCircle size={56} className="text-[#C9A84C] mx-auto mb-4" /><h2 className="text-2xl font-bold text-[#F5F0E8] mb-2" style={{ fontFamily: 'Georgia, serif' }}>Unsubscribed</h2><p className="text-[#A89F8F] mb-6">You will still receive order and security emails.</p><Link href="/" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Back to Home</Link></div></div>)
  return (<div className="min-h-screen flex items-center justify-center px-4 text-center"><div className="glass-card rounded-3xl p-12 max-w-md"><h2 className="text-2xl font-bold text-[#F5F0E8] mb-3" style={{ fontFamily: 'Georgia, serif' }}>Unsubscribe from Emails?</h2><p className="text-[#A89F8F] mb-6 text-sm">Order confirmations and security alerts will still be sent.</p><div className="flex gap-4 justify-center"><button onClick={handleUnsubscribe} disabled={loading} className="px-6 py-3 rounded-xl font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>{loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}</button><Link href="/" className="px-6 py-3 rounded-xl font-semibold border" style={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C' }}>Cancel</Link></div></div></div>)
}

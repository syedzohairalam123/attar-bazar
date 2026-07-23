'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Package, ShoppingBag, Tag, Settings, MessageSquare, LogOut, Shield, Menu, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resetAllClientState, useAuthStore } from '@/lib/store'
import { Toaster } from 'react-hot-toast'

// One role check here instead of copy-pasted into every /admin/* page —
// this is what prevents the "admin portal won't open" class of bugs,
// where one page's check was slightly different from another's.
// Middleware already redirects non-admins away before this even renders,
// this is a client-side second layer of defense plus the loading state.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    if (!user) { router.replace('/auth/login?redirect=/admin'); return }
    if (user.role !== 'admin') { router.replace('/'); return }
  }, [user, hasHydrated])

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    resetAllClientState()
    window.location.href = '/auth/login'
  }

  if (!hasHydrated || !user || user.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#06040E' }}><Loader2 size={32} className="animate-spin" style={{ color: '#C9A84C' }} /></div>
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/listings', label: 'Listings', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/categories', label: 'Categories', icon: Tag },
    { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#06040E' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#17152E', color: '#F5F0E8', border: '1px solid rgba(201,168,76,0.3)' } }} />
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 p-5" style={{ background: '#0D0B1F', borderRight: '1px solid rgba(201,168,76,0.1)' }}>
        <Link href="/admin" className="flex items-center gap-3 mb-10 px-2"><div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><Shield size={16} style={{ color: '#06040E' }} /></div><div><p className="text-sm font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Attar Bazaar</p><p className="text-xs" style={{ color: '#C9A84C' }}>Admin Portal</p></div></Link>
        <nav className="flex-1 space-y-1">{navItems.map(({ href, label, icon: Icon, exact }) => { const active = exact ? pathname === href : pathname.startsWith(href); return (<Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}><Icon size={16} /> {label}</Link>) })}</nav>
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}><p className="text-xs px-3 mb-2 truncate" style={{ color: '#A89F8F' }}>{user.email}</p><button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ color: '#A89F8F' }}><LogOut size={16} /> {loggingOut ? 'Signing out...' : 'Sign Out'}</button></div>
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <Link href="/admin" className="flex items-center gap-2"><Shield size={18} style={{ color: '#C9A84C' }} /><span className="text-sm font-bold" style={{ color: '#C9A84C' }}>Admin Portal</span></Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>{mobileOpen ? <X size={16} /> : <Menu size={16} />}</button>
      </div>
      {mobileOpen && (<div className="lg:hidden fixed top-16 left-0 right-0 z-50 p-4" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>{navItems.map(({ href, label, icon: Icon, exact }) => { const active = exact ? pathname === href : pathname.startsWith(href); return (<Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}><Icon size={16} /> {label}</Link>) })}<button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mt-2" style={{ color: '#A89F8F' }}><LogOut size={16} /> Sign Out</button></div>)}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">{children}</main>
    </div>
  )
}

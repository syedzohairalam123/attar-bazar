'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resetAllClientState, useAuthStore } from '@/lib/store'
import { Toaster } from 'react-hot-toast'

// Fully isolated from the storefront: no Navbar, no Footer, no
// CartDrawer. A seller lives entirely inside this shell — middleware
// already prevents them from reaching "/", "/products", "/cart", or
// "/checkout" at all, so this layout is the only UI they ever see.
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    resetAllClientState()
    window.location.href = '/auth/login'
  }

  const navItems = [
    { href: '/seller', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#06040E' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#17152E', color: '#F5F0E8', border: '1px solid rgba(201,168,76,0.3)' } }} />

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 p-5" style={{ background: '#0D0B1F', borderRight: '1px solid rgba(201,168,76,0.1)' }}>
        <Link href="/seller" className="flex items-center gap-3 mb-10 px-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="font-bold text-sm" style={{ color: '#06040E', fontFamily: 'Cinzel, serif' }}>A</span></div>
          <div><p className="text-sm font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Attar Bazaar</p><p className="text-xs" style={{ color: '#C9A84C' }}>Merchant Center</p></div>
        </Link>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (<Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}><Icon size={16} /> {label}</Link>)
          })}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
          <p className="text-xs px-3 mb-2 truncate" style={{ color: '#A89F8F' }}>{user?.email}</p>
          <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ color: '#A89F8F' }}><LogOut size={16} /> {loggingOut ? 'Signing out...' : 'Sign Out'}</button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <Link href="/seller" className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}><span className="font-bold text-xs" style={{ color: '#06040E' }}>A</span></div><span className="text-sm font-bold" style={{ color: '#C9A84C' }}>Merchant Center</span></Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>{mobileOpen ? <X size={16} /> : <Menu size={16} />}</button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 z-50 p-4" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (<Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}><Icon size={16} /> {label}</Link>)
          })}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mt-2" style={{ color: '#A89F8F' }}><LogOut size={16} /> Sign Out</button>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">{children}</main>
    </div>
  )
}

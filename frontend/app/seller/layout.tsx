'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Menu, X, Store, ShoppingBag as ShopIcon, Shield, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resetAllClientState, useAuthStore } from '@/lib/store'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

// Fully isolated from the storefront: no Navbar, no Footer, no
// CartDrawer. A seller lives entirely inside this shell — middleware
// already prevents them from reaching "/", "/products", "/cart", or
// "/checkout" at all, so this layout is the only UI they ever see.
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, setActiveRole, updateUserRoles } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [upgradingRole, setUpgradingRole] = useState(false)
  const supabase = createClient()
  
  const u = user as any

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    resetAllClientState()
    window.location.href = '/auth/login'
  }

  const handleSwitchRole = (targetRole: 'buyer' | 'seller' | 'admin') => {
    setActiveRole(targetRole)
    const targetPath = targetRole === 'seller' ? '/seller' : targetRole === 'admin' ? '/admin' : '/'
    window.location.href = targetPath
  }

  const handleBecomeBuyer = async () => {
    setUpgradingRole(true)

    try {
      // Try SECURITY DEFINER RPC first (bypasses RLS)
      let success = false
      try {
        const { error: rpcError } = await supabase.rpc('activate_buyer_role' as any)
        if (!rpcError) success = true
      } catch { /* RPC not available */ }

      if (!success) {
        const { error } = await supabase.from('profiles').update({ is_buyer: true }).eq('id', u.id)
        if (error) throw error
        success = true
      }

      updateUserRoles({ is_buyer: true })
      toast.success('Buyer account activated successfully!')
      setActiveRole('buyer')
      setTimeout(() => { window.location.href = '/' }, 500)
    } catch (err: any) {
      toast.error('Could not activate buyer account. Please run the SQL migration in Supabase.')
    } finally {
      setUpgradingRole(false)
    }
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
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}>
            <span className="font-bold text-sm" style={{ color: '#06040E', fontFamily: 'Cinzel, serif' }}>A</span>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>Attar Bazaar</p>
            <p className="text-xs" style={{ color: '#C9A84C' }}>Merchant Center</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}>
                <Icon size={16} /> {label}
              </Link>
            )
          })}
        </nav>
        
        {/* ROLE SWITCHING SECTION */}
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
          <p className="text-xs uppercase tracking-wider mb-2 px-3" style={{ color: '#C9A84C' }}>Switch Role</p>
          
          {/* Buyer Role */}
          {u?.is_buyer !== false ? (
            <button 
              onClick={() => handleSwitchRole('buyer')}
              disabled={u?.activeRole === 'buyer'}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
              style={{ color: u?.activeRole === 'buyer' ? '#C9A84C' : '#A89F8F' }}
            >
              <div className="flex items-center gap-3">
                <ShopIcon size={16} className={u?.activeRole === 'buyer' ? 'text-[#C9A84C]' : 'text-amber-400'} />
                <span>View Buyer Storefront</span>
              </div>
              {u?.activeRole === 'buyer' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
            </button>
          ) : (
            <button 
              onClick={handleBecomeBuyer}
              disabled={upgradingRole}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
              style={{ color: '#C9A84C' }}
            >
              <ShopIcon size={16} />
              <span>{upgradingRole ? 'Activating...' : '+ Become a Buyer'}</span>
            </button>
          )}

          {/* Admin Role */}
          {u?.is_admin && (
            <button 
              onClick={() => handleSwitchRole('admin')}
              disabled={u?.activeRole === 'admin'}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
              style={{ color: u?.activeRole === 'admin' ? '#C9A84C' : '#A89F8F' }}
            >
              <div className="flex items-center gap-3">
                <Shield size={16} />
                <span>Admin Portal</span>
              </div>
              {u?.activeRole === 'admin' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
            </button>
          )}

          <div className="h-[1px] my-3" style={{ background: 'rgba(201,168,76,0.1)' }} />
          
          <p className="text-xs px-3 mb-2 truncate" style={{ color: '#A89F8F' }}>{user?.email}</p>
          <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 cursor-pointer" style={{ color: '#A89F8F' }}>
            <LogOut size={16} /> {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <Link href="/seller" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)' }}>
            <span className="font-bold text-xs" style={{ color: '#06040E' }}>A</span>
          </div>
          <span className="text-sm font-bold" style={{ color: '#C9A84C' }}>Merchant Center</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 z-50 p-4 shadow-xl" style={{ background: '#0D0B1F', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium" style={active ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: '#A89F8F' }}>
                <Icon size={16} /> {label}
              </Link>
            )
          })}
          
          <div className="h-[1px] my-3" style={{ background: 'rgba(201,168,76,0.1)' }} />
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#C9A84C' }}>Switch Role</p>
          
          {/* Buyer Role */}
          {u?.is_buyer !== false ? (
            <button 
              onClick={() => handleSwitchRole('buyer')}
              disabled={u?.activeRole === 'buyer'}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{ color: u?.activeRole === 'buyer' ? '#C9A84C' : '#A89F8F' }}
            >
              <div className="flex items-center gap-3">
                <ShopIcon size={16} className={u?.activeRole === 'buyer' ? 'text-[#C9A84C]' : 'text-amber-400'} />
                <span>View as Buyer</span>
              </div>
              {u?.activeRole === 'buyer' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
            </button>
          ) : (
            <button 
              onClick={handleBecomeBuyer}
              disabled={upgradingRole}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{ color: '#C9A84C' }}
            >
              <ShopIcon size={16} />
              <span>{upgradingRole ? 'Activating...' : '+ Become a Buyer'}</span>
            </button>
          )}

          {/* Admin Role */}
          {u?.is_admin && (
            <button 
              onClick={() => handleSwitchRole('admin')}
              disabled={u?.activeRole === 'admin'}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{ color: u?.activeRole === 'admin' ? '#C9A84C' : '#A89F8F' }}
            >
              <div className="flex items-center gap-3">
                <Shield size={16} />
                <span>Admin Portal</span>
              </div>
              {u?.activeRole === 'admin' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
            </button>
          )}

          <div className="h-[1px] my-3" style={{ background: 'rgba(201,168,76,0.1)' }} />
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium cursor-pointer" style={{ color: '#A89F8F' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
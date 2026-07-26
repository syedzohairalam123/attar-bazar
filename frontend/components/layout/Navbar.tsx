'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, ShoppingBag, Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Shield, Store, ShoppingBag as ShopIcon, ArrowRight } from 'lucide-react'
import { useCartStore, useAuthStore, resetAllClientState } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [siteName, setSiteName] = useState('Attar Bazaar')
  const [loggingOut, setLoggingOut] = useState(false)
  const [upgradingRole, setUpgradingRole] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { count, openCart } = useCartStore()
  const { user, setActiveRole, updateUserRoles } = useAuthStore()
  
  const u = user as any
  const cartCount = count()
  const supabase = createClient()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'site_name').maybeSingle()
      .then(({ data }) => { if (data?.value) setSiteName(data.value) }, () => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleMenuClick = (path: string) => {
    setUserMenuOpen(false)
    router.push(path)
  }

  const handleSwitchRole = (targetRole: 'buyer' | 'seller' | 'admin') => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    setActiveRole(targetRole)
    
    const targetPath = targetRole === 'seller' ? '/seller' : targetRole === 'admin' ? '/admin' : '/'
    window.location.href = targetPath
  }

  const handleBecomeBuyer = async () => {
    setUserMenuOpen(false)
    setMobileOpen(false)
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

  const handleBecomeSeller = () => {
    // Navigate to seller setup page — activation happens there
    setUserMenuOpen(false)
    setMobileOpen(false)
    window.location.href = '/seller/setup'
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    resetAllClientState()
    window.location.href = '/auth/login'
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Browse' },
    { href: '/sell', label: 'Sell' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={scrolled ? { background: 'rgba(13,11,31,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.1)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' } : {}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', boxShadow: '0 0 15px rgba(201,168,76,0.3)' }}>
                <span className="font-bold text-sm" style={{ color: '#06040E', fontFamily: 'Cinzel, serif' }}>A</span>
              </div>
              <span className="text-xl font-bold hidden sm:block" style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{siteName}</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-sm font-medium transition-colors duration-200 relative group" style={{ color: pathname === link.href ? '#C9A84C' : '#A89F8F' }}>
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px transition-all duration-300" style={{ width: pathname === link.href ? '100%' : '0', background: '#C9A84C' }} />
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setSearchOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}><Search size={16} /></button>
              <button onClick={openCart} className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>
                <ShoppingBag size={16} />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: '#C9A84C', color: '#06040E' }}>{cartCount > 9 ? '9+' : cartCount}</span>}
              </button>

              {user ? (
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer" style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.2)' }}><User size={12} style={{ color: '#C9A84C' }} /></div>
                    <span className="text-sm hidden sm:block max-w-[80px] truncate" style={{ color: '#F5F0E8' }}>{u?.full_name?.split(' ')[0] ?? u?.email?.split('@')[0]}</span>
                    <ChevronDown size={12} style={{ color: '#A89F8F' }} />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50 py-1" style={{ background: 'rgba(23,21,46,0.98)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <div className="p-1 space-y-0.5">
                          <button onClick={() => handleMenuClick('/account')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] cursor-pointer text-left" style={{ color: '#A89F8F' }}>
                            <LayoutDashboard size={14} /> My Account
                          </button>

                          <div className="h-[1px] my-1" style={{ background: 'rgba(201,168,76,0.1)' }} />

                          {/* ROLE SWITCHING SECTION */}
                          <div className="px-3 py-2">
                            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#C9A84C' }}>Switch Role</p>
                            
                            {/* Buyer Role */}
                            {u?.is_buyer !== false ? (
                              <button 
                                onClick={() => handleSwitchRole('buyer')}
                                disabled={u?.activeRole === 'buyer'}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] cursor-pointer text-left disabled:opacity-50"
                                style={{ color: u?.activeRole === 'buyer' ? '#C9A84C' : '#F5F0E8' }}
                              >
                                <div className="flex items-center gap-3">
                                  <ShopIcon size={14} className={u?.activeRole === 'buyer' ? 'text-[#C9A84C]' : 'text-amber-400'} /> 
                                  <span>View Buyer Storefront</span>
                                </div>
                                {u?.activeRole === 'buyer' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                              </button>
                            ) : (
                              <button 
                                onClick={handleBecomeBuyer}
                                disabled={upgradingRole}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] font-medium cursor-pointer text-left disabled:opacity-50"
                                style={{ color: '#C9A84C' }}
                              >
                                <ShopIcon size={14} /> {upgradingRole ? 'Activating...' : '+ Become a Buyer'}
                              </button>
                            )}

                            {/* Seller Role */}
                            {u?.is_seller ? (
                              <button 
                                onClick={() => handleSwitchRole('seller')}
                                disabled={u?.activeRole === 'seller'}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] cursor-pointer text-left disabled:opacity-50"
                                style={{ color: u?.activeRole === 'seller' ? '#C9A84C' : '#F5F0E8' }}
                              >
                                <div className="flex items-center gap-3">
                                  <Store size={14} /> 
                                  <span>View Seller Dashboard</span>
                                </div>
                                {u?.activeRole === 'seller' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                              </button>
                            ) : (
                              <button 
                                onClick={handleBecomeSeller}
                                disabled={upgradingRole}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] font-medium cursor-pointer text-left disabled:opacity-50"
                                style={{ color: '#C9A84C' }}
                              >
                                <Store size={14} /> {upgradingRole ? 'Activating...' : '+ Become a Seller'}
                              </button>
                            )}

                            {/* Admin Role */}
                            {u?.is_admin && (
                              <button 
                                onClick={() => handleSwitchRole('admin')}
                                disabled={u?.activeRole === 'admin'}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:bg-[rgba(201,168,76,0.1)] cursor-pointer text-left disabled:opacity-50"
                                style={{ color: u?.activeRole === 'admin' ? '#C9A84C' : '#F5F0E8' }}
                              >
                                <div className="flex items-center gap-3">
                                  <Shield size={14} /> 
                                  <span>Admin Portal</span>
                                </div>
                                {u?.activeRole === 'admin' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                              </button>
                            )}
                          </div>

                          <div className="h-[1px] my-1" style={{ background: 'rgba(201,168,76,0.1)' }} />

                          <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50 hover:bg-red-500/10 text-red-400 cursor-pointer text-left">
                            <LogOut size={14} /> {loggingOut ? 'Signing out...' : 'Sign Out'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link href="/auth/login" className="px-4 py-2 rounded-full text-sm font-semibold hidden sm:flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><User size={14} /> Sign In</Link>
              )}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center cursor-pointer" style={{ border: '1px solid rgba(201,168,76,0.2)', color: '#A89F8F' }}>{mobileOpen ? <X size={16} /> : <Menu size={16} />}</button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden px-4 py-4" style={{ background: 'rgba(13,11,31,0.98)', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
            <nav className="flex flex-col gap-1">
              {navLinks.map(link => (<Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-medium transition-all" style={pathname === link.href ? { background: 'rgba(201,168,76,0.1)', color: '#C9A84C' } : { color: '#A89F8F' }}>{link.label}</Link>))}
              {!user ? (<Link href="/auth/login" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-xl text-sm font-semibold text-center mt-2" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}>Sign In</Link>)
                : (
                  <>
                    <div className="h-[1px] my-2" style={{ background: 'rgba(201,168,76,0.1)' }} />
                    <p className="text-xs uppercase tracking-wider mb-2 px-4" style={{ color: '#C9A84C' }}>Switch Role</p>
                    
                    {/* Buyer Role */}
                    {u?.is_buyer !== false ? (
                      <button 
                        onClick={() => handleSwitchRole('buyer')}
                        disabled={u?.activeRole === 'buyer'}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer disabled:opacity-50"
                        style={{ color: u?.activeRole === 'buyer' ? '#C9A84C' : '#F5F0E8' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShopIcon size={14} className={u?.activeRole === 'buyer' ? 'text-[#C9A84C]' : 'text-amber-400'} />
                            <span>View as Buyer</span>
                          </div>
                          {u?.activeRole === 'buyer' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                        </div>
                      </button>
                    ) : (
                      <button 
                        onClick={handleBecomeBuyer}
                        disabled={upgradingRole}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer disabled:opacity-50"
                        style={{ color: '#C9A84C' }}
                      >
                        <div className="flex items-center gap-3">
                          <ShopIcon size={14} />
                          <span>{upgradingRole ? 'Activating...' : '+ Become a Buyer'}</span>
                        </div>
                      </button>
                    )}

                    {/* Seller Role */}
                    {u?.is_seller ? (
                      <button 
                        onClick={() => handleSwitchRole('seller')}
                        disabled={u?.activeRole === 'seller'}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer disabled:opacity-50"
                        style={{ color: u?.activeRole === 'seller' ? '#C9A84C' : '#F5F0E8' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Store size={14} />
                            <span>View Seller Dashboard</span>
                          </div>
                          {u?.activeRole === 'seller' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                        </div>
                      </button>
                    ) : (
                      <button 
                        onClick={handleBecomeSeller}
                        disabled={upgradingRole}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer disabled:opacity-50"
                        style={{ color: '#C9A84C' }}
                      >
                        <div className="flex items-center gap-3">
                          <Store size={14} />
                          <span>{upgradingRole ? 'Activating...' : '+ Become a Seller'}</span>
                        </div>
                      </button>
                    )}

                    {/* Admin Role */}
                    {u?.is_admin && (
                      <button 
                        onClick={() => handleSwitchRole('admin')}
                        disabled={u?.activeRole === 'admin'}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-left cursor-pointer disabled:opacity-50"
                        style={{ color: u?.activeRole === 'admin' ? '#C9A84C' : '#F5F0E8' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Shield size={14} />
                            <span>Admin Portal</span>
                          </div>
                          {u?.activeRole === 'admin' && <span className="text-xs" style={{ color: '#C9A84C' }}>Active</span>}
                        </div>
                      </button>
                    )}

                    <div className="h-[1px] my-2" style={{ background: 'rgba(201,168,76,0.1)' }} />
                    <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="px-4 py-3 rounded-xl text-sm font-medium text-left text-red-400 cursor-pointer">Sign Out</button>
                  </>
                )}
            </nav>
          </div>
        )}
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" style={{ background: 'rgba(6,4,14,0.92)', backdropFilter: 'blur(20px)' }} onClick={e => e.target === e.currentTarget && setSearchOpen(false)}>
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSearch} className="relative">
              <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)} placeholder="Search perfumes, brands, attars..." className="w-full px-6 py-5 pr-14 text-lg rounded-2xl focus:outline-none" style={{ background: '#17152E', border: '1px solid rgba(201,168,76,0.3)', color: '#F5F0E8' }} />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8CC7A)', color: '#06040E' }}><Search size={18} /></button>
            </form>
            <p className="text-center text-sm mt-4" style={{ color: '#A89F8F' }}>Press ESC to close</p>
          </div>
        </div>
      )}
    </>
  )
}
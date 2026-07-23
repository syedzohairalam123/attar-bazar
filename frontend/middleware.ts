import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Runs on every navigation. Two jobs:
// 1. Refresh the Supabase auth cookie so server and browser always agree
//    on who's logged in (this is what fixes "session lost during checkout").
// 2. Enforce role-based access: sellers are fully isolated from the
//    storefront, buyers/guests can't reach /seller or /admin, and nobody
//    reaches a protected page without being logged in first.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, don't crash routing — just let requests
  // through unauthenticated rather than taking the whole site down.
  if (!url || !anonKey) {
    console.error('[middleware] Missing Supabase env vars — skipping auth checks.')
    return response
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    role = profile?.role ?? 'buyer'
  }

  const isSellerPath = path.startsWith('/seller')
  const isAdminPath = path.startsWith('/admin')
  const isAccountPath = path.startsWith('/account')
  const isCheckoutPath = path.startsWith('/checkout')
  const isAuthPath = path.startsWith('/auth')
  const isForgotOrUnsub = path.startsWith('/auth/forgot') || path.startsWith('/auth/unsubscribe') || path.startsWith('/auth/reset')
  // Public info pages stay open to everyone, including sellers — only
  // the actual browse/buy flow is blocked for seller accounts.
  const isStorefrontBuyPath = path === '/' || path.startsWith('/products') || isCheckoutPath || path.startsWith('/cart')

  // 1. Protected areas require login
  if (!user && (isSellerPath || isAdminPath || isAccountPath || isCheckoutPath)) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && role) {
    // 2. Role-gated areas
    if (isSellerPath && role !== 'seller' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (isAdminPath && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // 3. Sellers cannot browse or buy on the storefront — full isolation
    if (role === 'seller' && isStorefrontBuyPath) {
      return NextResponse.redirect(new URL('/seller', request.url))
    }
    // 4. Already logged in + visiting login/register -> send to the right home
    if (isAuthPath && !isForgotOrUnsub && (path === '/auth/login' || path === '/auth/register')) {
      const target = role === 'admin' ? '/admin' : role === 'seller' ? '/seller' : '/'
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|samples/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

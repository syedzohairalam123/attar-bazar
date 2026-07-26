import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Runs on every navigation. Two jobs:
// 1. Refresh the Supabase auth cookie so server and browser always agree
//    on who's logged in (this is what fixes "session lost during checkout").
// 2. Enforce role-based access using the new multi-role (boolean) flags.
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

  // Fetch new boolean flags instead of a single string role
  let profile = { is_buyer: true, is_seller: false, is_admin: false }
  
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_buyer, is_seller, is_admin')
      .eq('id', user.id)
      .maybeSingle()
      
    if (data) {
      profile = {
        is_buyer: data.is_buyer ?? true, // Default to true for older users
        is_seller: data.is_seller ?? false,
        is_admin: data.is_admin ?? false
      }
    }
  }

  const isSellerPath = path.startsWith('/seller')
  const isSellerSetup = path === '/seller/setup'
  const isAdminPath = path.startsWith('/admin')
  const isAccountPath = path.startsWith('/account')
  const isCheckoutPath = path.startsWith('/checkout')
  const isAuthPath = path.startsWith('/auth')
  const isForgotOrUnsub = path.startsWith('/auth/forgot') || path.startsWith('/auth/unsubscribe') || path.startsWith('/auth/reset')
  const isStorefrontBuyPath = path === '/' || path.startsWith('/products') || isCheckoutPath || path.startsWith('/cart')

  // 1. Protected areas require login
  if (!user && (isSellerPath || isAdminPath || isAccountPath || isCheckoutPath)) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  if (user) {
    // 2. Role-gated areas based on flags
    // Admin can access everything
    if (isAdminPath && !profile.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Seller area requires seller flag OR admin — BUT /seller/setup is open to any logged-in user
    if (isSellerPath && !isSellerSetup && !profile.is_seller && !profile.is_admin) {
      return NextResponse.redirect(new URL('/seller/setup', request.url))
    }
    
    // 3. Storefront Isolation
    // ONLY block from storefront if they are explicitly NOT a buyer (e.g., they only chose to be a seller)
    // If they are both (is_buyer && is_seller), they can access this fine.
    // Admin can also access storefront
    if (!profile.is_buyer && !profile.is_admin && isStorefrontBuyPath) {
      // If user is seller-only, redirect to seller dashboard
      if (profile.is_seller) {
        return NextResponse.redirect(new URL('/seller', request.url))
      }
      // Otherwise, redirect to account to activate buyer role
      return NextResponse.redirect(new URL('/account', request.url))
    }

    // 4. Already logged in + visiting login/register -> send to their primary area
    if (isAuthPath && !isForgotOrUnsub && (path === '/auth/login' || path === '/auth/register')) {
      // Redirect to the most appropriate area based on their roles
      if (profile.is_admin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (profile.is_seller) {
        return NextResponse.redirect(new URL('/seller', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|samples/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
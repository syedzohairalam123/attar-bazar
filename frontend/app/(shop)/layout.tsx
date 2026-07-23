import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { AuthProvider } from '@/components/AuthProvider'

// This route group is transparent in the URL (no /(shop)/ segment shows
// up), so "/", "/products", "/cart" etc. resolve exactly as before —
// but they all share THIS layout with the buyer navbar/footer/cart,
// while /seller and /admin get their own separate, isolated layouts.
// This is what avoids the "two parallel pages resolve to the same path"
// collision: there is only ever ONE route producing each URL.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </AuthProvider>
  )
}

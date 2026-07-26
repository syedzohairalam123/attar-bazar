import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Perfume } from './types'

// ─── CART (buyers only — sellers are blocked from cart/checkout by middleware) ──
export type CartItem = { perfume: Perfume; quantity: number }

type CartStore = {
  items: CartItem[]
  isOpen: boolean
  addItem: (perfume: Perfume) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  count: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (perfume) => {
        const existing = get().items.find(i => i.perfume.id === perfume.id)
        if (existing) {
          set(state => ({ items: state.items.map(i => i.perfume.id === perfume.id ? { ...i, quantity: i.quantity + 1 } : i) }))
        } else {
          set(state => ({ items: [...state.items, { perfume, quantity: 1 }] }))
        }
        set({ isOpen: true })
      },
      removeItem: (id) => set(state => ({ items: state.items.filter(i => i.perfume.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return }
        set(state => ({ items: state.items.map(i => i.perfume.id === id ? { ...i, quantity: Math.min(quantity, i.perfume.quantity) } : i) }))
      },
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      total: () => get().items.reduce((sum, i) => sum + i.perfume.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'attar-cart' }
  )
)

// ─── AUTH (client-side mirror of the server session for instant UI reactivity) ──
export type AuthUser = { 
  id: string; 
  email: string; 
  role: string; // Legacy role field for backward compatibility
  full_name?: string | null;
  // Multi-role flags
  is_buyer?: boolean;
  is_seller?: boolean;
  is_admin?: boolean;
  // Active role: which interface the user is currently using
  activeRole?: 'buyer' | 'seller' | 'admin';
} | null

type AuthStore = {
  user: AuthUser
  hasHydrated: boolean
  setUser: (user: AuthUser) => void
  clearUser: () => void
  setHasHydrated: (v: boolean) => void
  setActiveRole: (role: 'buyer' | 'seller' | 'admin') => void
  updateUserRoles: (roles: { is_buyer?: boolean; is_seller?: boolean; is_admin?: boolean }) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setActiveRole: (role) => set((state) => ({ 
        user: state.user ? { ...state.user, activeRole: role } : null 
      })),
      updateUserRoles: (roles) => set((state) => ({
        user: state.user ? { ...state.user, ...roles } : null
      })),
    }),
    {
      name: 'attar-auth',
      onRehydrateStorage: () => (state) => { state?.setHasHydrated(true) },
    }
  )
)

// Wipes ALL client-side persisted state. Called on logout so a stale
// cached role/user can never "fall back" after sign-out.
export function resetAllClientState() {
  useAuthStore.getState().clearUser()
  useCartStore.getState().clearCart()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('attar-auth')
    window.localStorage.removeItem('attar-cart')
  }
}

export type Role = 'buyer' | 'seller' | 'admin'
export type Condition = 'new' | 'like-new' | 'used'
export type PerfumeStatus = 'active' | 'sold' | 'pending' | 'rejected'
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'cod' | 'bank'
// Matches the buyer-facing tracking labels exactly: Pending, Confirmed,
// Dispatched, Out for Delivery, Delivered, Cancelled.
export type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled'

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled']

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  dispatched: 'Dispatched',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: Role // Purana system break na ho is liye ise rehne diya hai
  city: string | null
  whatsapp: string | null
  is_verified: boolean
  created_at: string
  
  // Naye multi-role flags
  is_buyer: boolean
  is_seller: boolean
  is_admin: boolean
}

export type Category = {
  id: string
  name: string
  slug: string
  image_url: string | null
}

export type Perfume = {
  id: string
  title: string
  brand: string
  description: string | null
  price: number
  original_price: number | null
  condition: Condition
  quantity: number
  images: string[]
  category_id: string | null
  seller_id: string
  city: string | null
  status: PerfumeStatus
  featured: boolean
  views: number
  created_at: string
  updated_at: string
  profiles?: Profile
  categories?: Category
}

export type Order = {
  id: string
  buyer_id: string
  seller_id: string | null
  perfume_id: string | null
  quantity: number
  total_price: number
  payment_method: PaymentMethod
  status: OrderStatus
  buyer_name: string | null
  buyer_phone: string | null
  buyer_email: string | null
  delivery_address: string | null
  notes: string | null
  created_at: string
  perfumes?: Perfume
}
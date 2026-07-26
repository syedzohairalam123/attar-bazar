import type { SupabaseClient } from '@supabase/supabase-js'

// These take a Supabase client as the first argument so they work
// identically whether called from a Server Component (server client),
// a Client Component (browser client), or an API route (admin client).

export async function getPerfumes(supabase: SupabaseClient, filters?: {
  search?: string; condition?: string; city?: string
  minPrice?: number; maxPrice?: number; featured?: boolean; limit?: number
  sellerId?: string; anyStatus?: boolean
}) {
  let query = supabase
    .from('perfumes')
    .select('*, profiles(id, full_name, avatar_url, whatsapp, city), categories(name, slug)')
    .order('created_at', { ascending: false })

  if (!filters?.anyStatus) query = query.eq('status', 'active')
  if (filters?.sellerId) query = query.eq('seller_id', filters.sellerId)
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  if (filters?.condition) query = query.eq('condition', filters.condition)
  if (filters?.city) query = query.ilike('city', `%${filters.city}%`)
  if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice)
  if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)
  if (filters?.featured) query = query.eq('featured', true)
  if (filters?.limit) query = query.limit(filters.limit)

  return query
}

export async function getSetting(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

export async function getAllSettings(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.from('settings').select('key, value')
  const s: Record<string, string> = {}
  data?.forEach((r: any) => { s[r.key] = r.value })
  return s
}

// Root-cause fix for "insert or update on table orders violates foreign
// key constraint orders_buyer_id_fkey": guarantees a profiles row exists
// for the current authenticated user before anything else references it.
export async function ensureProfile(supabase: SupabaseClient, userId: string, email?: string | null, fullName?: string | null) {
  const { data: existing } = await supabase.from('profiles').select('id, is_buyer, is_seller, is_admin').eq('id', userId).maybeSingle()
  if (!existing) {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName || (email ? email.split('@')[0] : 'User'),
      role: 'buyer',
      is_buyer: true,
      is_seller: false,
      is_admin: false,
    })
    if (error) { console.error('[ensureProfile] failed:', error.message); return false }
  } else {
    // If profile exists but doesn't have multi-role flags, update it
    if (existing.is_buyer === null || existing.is_seller === null || existing.is_admin === null) {
      const { error } = await supabase.from('profiles').update({
        is_buyer: existing.is_buyer !== null ? existing.is_buyer : true,
        is_seller: existing.is_seller !== null ? existing.is_seller : false,
        is_admin: existing.is_admin !== null ? existing.is_admin : false,
      }).eq('id', userId)
      if (error) { console.error('[ensureProfile] update failed:', error.message); return false }
    }
  }
  return true
}

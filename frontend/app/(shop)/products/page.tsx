import { createClient } from '@/lib/supabase/server'
import { getPerfumes } from '@/lib/queries'
import { ProductCard } from '@/components/ProductCard'
import { ProductsFilters } from './ProductsFilters'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string; category?: string; condition?: string; city?: string
  minPrice?: string; maxPrice?: string; featured?: string
  [key: string]: string | undefined
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const [productsRes, citiesRes, categoriesRes] = await Promise.all([
    getPerfumes(supabase, {
      search: searchParams.search, condition: searchParams.condition, city: searchParams.city,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      featured: searchParams.featured === 'true',
    }),
    supabase.from('perfumes').select('city').eq('status', 'active').not('city', 'is', null),
    supabase.from('categories').select('*').order('name'),
  ])

  const products = productsRes.data ?? []
  const cities = [...new Set((citiesRes.data ?? []).map(d => d.city).filter(Boolean))] as string[]
  const categories = categoriesRes.data ?? []

  const title = searchParams.search ? `Results for "${searchParams.search}"` : searchParams.category ? `${searchParams.category} Perfumes` : 'Browse All Perfumes'

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-10"><h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>{title}</h1><p style={{ color: '#A89F8F' }}>{products.length} listing{products.length !== 1 ? 's' : ''} found</p></div>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 xl:w-72 flex-shrink-0"><ProductsFilters cities={cities} categories={categories} currentParams={searchParams} /></aside>
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (<div className="glass-card rounded-3xl p-16 text-center"><span className="text-6xl mb-4 block">🔍</span><h3 className="text-2xl font-bold mb-2" style={{ color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>No listings found</h3><p style={{ color: '#A89F8F' }}>Try adjusting your filters or search terms</p></div>)
            : (<div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">{products.map(pf => <ProductCard key={pf.id} perfume={pf} />)}</div>)}
        </div>
      </div>
    </div>
  )
}

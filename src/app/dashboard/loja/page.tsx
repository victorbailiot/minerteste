'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, ShoppingBag, Loader2, ShoppingCart } from 'lucide-react'
import ProductCard from '@/components/store/ProductCard'
import { StoreProduct, ProductFilters } from '@/model/store'
import { toast } from 'sonner'
import { useStoreCart } from '@/lib/hooks/useStoreCart'

export default function LojaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { addItem, isInCart, getTotalItems } = useStoreCart()

  const [filters, setFilters] = useState<ProductFilters>({
    search: searchParams.get('search') || '',
    sortBy: (searchParams.get('sortBy') as any) || 'popular',
    page: 1,
    pageSize: 20
  })

  useEffect(() => {
    loadProducts()
  }, [filters])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.search) params.set('search', filters.search)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.minPrice) params.set('minPrice', filters.minPrice.toString())
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString())
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      params.set('page', filters.page?.toString() || '1')
      params.set('pageSize', filters.pageSize?.toString() || '20')

      const response = await fetch(`/api/store/products?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.products)
        setTotal(data.total)
        setPage(data.page)
      } else {
        toast.error('Erro ao carregar produtos')
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({ ...filters, page: 1 })
  }

  const handleAddToCart = async (product: StoreProduct) => {
    try {
      await addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        imageUrl: product.mainImage || product.images[0],
        type: product.type,
        weight: product.weight,
        width: product.width,
        height: product.height,
        length: product.length
      }, 1)
      
      toast.success(`${product.name} adicionado ao carrinho!`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar produto ao carrinho')
    }
  }

  const handleAddToWishlist = (productId: string) => {
    // Implementar lógica de lista de desejos
    toast.success('Adicionado à lista de desejos!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Loja Virtual</h1>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>

          {/* Filters Row */}
          <div className="flex items-center gap-4 mt-4">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filtros
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="popular">Mais Populares</option>
              <option value="newest">Mais Recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="name_asc">Nome A-Z</option>
              <option value="name_desc">Nome Z-A</option>
            </select>

            <div className="ml-auto text-sm text-gray-600">
              {total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou fazer uma nova busca
            </p>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onAddToWishlist={handleAddToWishlist}
                  isInWishlist={false}
                />
              ))}
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="mt-8 flex justify-center gap-2">
                {page > 1 && (
                  <button
                    onClick={() => setFilters({ ...filters, page: page - 1 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                )}
                
                <div className="flex items-center gap-2">
                  {[...Array(Math.ceil(total / pageSize))].map((_, i) => {
                    const pageNum = i + 1
                    if (
                      pageNum === 1 ||
                      pageNum === Math.ceil(total / pageSize) ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <button
                          key={i}
                          onClick={() => setFilters({ ...filters, page: pageNum })}
                          className={`w-10 h-10 rounded-lg ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={i} className="px-2">...</span>
                    }
                    return null
                  })}
                </div>

                {page < Math.ceil(total / pageSize) && (
                  <button
                    onClick={() => setFilters({ ...filters, page: page + 1 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Próxima
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <Link
          href="/dashboard/loja/carrinho"
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 flex items-center gap-3 z-50 group"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {getTotalItems()}
            </span>
          </div>
          <span className="hidden group-hover:inline-block font-semibold">
            Ver Carrinho
          </span>
        </Link>
      )}
    </div>
  )
}

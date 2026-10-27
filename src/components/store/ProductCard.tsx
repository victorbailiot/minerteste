'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { StoreProduct } from '@/model/store'

interface ProductCardProps {
  product: StoreProduct
  onAddToWishlist?: (productId: string) => void
  onAddToCart?: (product: StoreProduct) => void
  isInWishlist?: boolean
}

export default function ProductCard({ 
  product, 
  onAddToWishlist, 
  onAddToCart,
  isInWishlist = false 
}: ProductCardProps) {
  const discount = product.comparePrice 
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAddToWishlist?.(product.id)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAddToCart?.(product)
  }

  return (
    <Link
      href={`/dashboard/loja/produto/${product.slug}`}
      className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.mainImage || product.images[0] ? (
          <Image
            src={product.mainImage || product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCart className="w-16 h-16" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discount}%
            </span>
          )}
          {product.featured && (
            <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
              Destaque
            </span>
          )}
          {product.generatesCoupon && (
            <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
              🎟️ +1 Cupom Sorteio
            </span>
          )}
          {product.type === 'DIGITAL' && !product.generatesCoupon && (
            <span className="bg-sky-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
              Digital
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">
              Esgotado
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
        >
          <Heart 
            className={`w-5 h-5 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category */}
        {product.category && (
          <div className="text-xs text-gray-500 mb-1">{product.category.name}</div>
        )}

        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 min-h-[40px]">
          {product.name}
        </h3>

        {/* Rating */}
        {product.averageRating && product.reviewsCount && product.reviewsCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(product.averageRating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">({product.reviewsCount})</span>
          </div>
        )}

        {/* Prices */}
        <div className="mt-auto">
          {product.comparePrice && (
            <div className="text-xs text-gray-500 line-through mb-1">
              R$ {product.comparePrice.toFixed(2)}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              R$ {product.price.toFixed(2)}
            </span>
          </div>

          {/* Stock Status */}
          <div className="mt-2 text-xs">
            {product.stock > 0 ? (
              product.stock <= product.lowStockAlert ? (
                <span className="text-orange-600 font-medium">
                  Últimas {product.stock} unidades!
                </span>
              ) : (
                <span className="text-green-600">Em estoque</span>
              )
            ) : (
              <span className="text-gray-500">Esgotado</span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        {product.stock > 0 && (
          <button
            onClick={handleAddToCart}
            className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar ao Carrinho
          </button>
        )}
      </div>
    </Link>
  )
}

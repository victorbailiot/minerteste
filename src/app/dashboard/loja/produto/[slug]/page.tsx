'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  Minus, 
  Plus, 
  Package, 
  Truck,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { StoreProduct } from '@/model/store'
import { toast } from 'sonner'
import { useStoreCart } from '@/lib/hooks/useStoreCart'

export default function ProdutoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  
  const { addItem, isInCart } = useStoreCart()

  useEffect(() => {
    loadProduct()
  }, [slug])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/store/products/${slug}`)
      const data = await response.json()

      if (data.success) {
        setProduct(data.product)
      } else {
        toast.error('Produto não encontrado')
        router.push('/dashboard/loja')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return

    try {
      const selectedVar = selectedVariant && product.variants 
        ? product.variants.find(v => v.id === selectedVariant)
        : null

      await addItem({
        id: `${product.id}${selectedVar ? `-${selectedVar.id}` : ''}`,
        productId: product.id,
        variantId: selectedVar?.id,
        name: `${product.name}${selectedVar ? ` - ${selectedVar.name}` : ''}`,
        sku: selectedVar?.sku || product.sku,
        price: selectedVar?.price || product.price,
        imageUrl: selectedVar?.imageUrl || product.mainImage || product.images[0],
        attributes: selectedVar?.attributes,
        type: product.type,
        weight: product.weight,
        width: product.width,
        height: product.height,
        length: product.length
      }, quantity)

      toast.success(`${product.name} adicionado ao carrinho!`, {
        description: `Quantidade: ${quantity}`,
        icon: <CheckCircle className="w-5 h-5" />
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar produto ao carrinho')
    }
  }

  const handleBuyNow = () => {
    handleAddToCart()
    router.push('/dashboard/loja/carrinho')
  }

  const discount = product && product.comparePrice 
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return null
  }

  const allImages = product.images.length > 0 ? product.images : [product.mainImage || '']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            {/* Imagem Principal */}
            <div className="relative aspect-square bg-white rounded-xl overflow-hidden border border-gray-200">
              {allImages[selectedImage] ? (
                <Image
                  src={allImages[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-32 h-32 text-gray-300" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {discount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded">
                    -{discount}%
                  </span>
                )}
                {product.featured && (
                  <span className="bg-yellow-500 text-white text-sm font-bold px-3 py-1 rounded">
                    Destaque
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            {/* Título e Avaliação */}
            <div>
              {product.category && (
                <p className="text-sm text-gray-500 mb-2">{product.category.name}</p>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
              
              {product.averageRating && product.reviewsCount && product.reviewsCount > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(product.averageRating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.averageRating?.toFixed(1)} ({product.reviewsCount} avaliações)
                  </span>
                </div>
              )}

              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>

            {/* Preços */}
            <div className="border-t border-b border-gray-200 py-6">
              {product.comparePrice && (
                <div className="text-lg text-gray-500 line-through mb-1">
                  R$ {product.comparePrice.toFixed(2)}
                </div>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-green-600">
                  R$ {product.price.toFixed(2)}
                </span>
                {discount > 0 && (
                  <span className="text-lg text-red-600 font-semibold">
                    {discount}% OFF
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ou 10x de R$ {(product.price / 10).toFixed(2)} sem juros
              </p>
            </div>

            {/* Estoque */}
            <div>
              {product.stock > 0 ? (
                product.stock <= product.lowStockAlert ? (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Package className="w-5 h-5" />
                    <span className="font-medium">
                      Últimas {product.stock} unidades em estoque!
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Em estoque</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Produto esgotado</span>
                </div>
              )}
            </div>

            {/* Quantidade */}
            {product.stock > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-6 py-2 text-center min-w-[60px] font-medium">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    ({product.stock} disponíveis)
                  </span>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            {product.stock > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleBuyNow}
                  className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
                >
                  Comprar Agora
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-4 px-6 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao Carrinho
                </button>
                <button
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                >
                  <Heart className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            )}

            {/* Benefícios 
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Frete Grátis</p>
                  <p className="text-sm text-gray-600">Para compras acima de R$ 200</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Compra Segura</p>
                  <p className="text-sm text-gray-600">Seus dados estão protegidos</p>
                </div>
              </div>
            </div>
            */}
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Descrição do Produto</h2>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {product.description}
          </div>
        </div>

        {/* Especificações */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Especificações Técnicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex border-b border-gray-200 pb-2">
                  <span className="font-medium text-gray-700 w-1/2">{key}:</span>
                  <span className="text-gray-600 w-1/2">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avaliações */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Avaliações ({product.reviewsCount})
            </h2>
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{review.user?.name}</span>
                      {review.isVerified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Compra verificada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="text-gray-700">{review.comment}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useStoreCart } from '@/lib/hooks/useStoreCart'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag,
  Tag,
  Truck,
  CreditCard,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function CarrinhoLojaPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const {
    items,
    isLoaded,
    removeItem,
    updateQuantity,
    getTotalItems,
    getTotalPrice,
    clearCart,
    hasPhysicalProducts,
  } = useStoreCart()

  const hasMixedProductTypes = items.length > 0 && hasPhysicalProducts() && items.some((i) => i.type === 'DIGITAL')

  const [cupomCode, setCupomCode] = useState('')
  const [cupomApplied, setCupomApplied] = useState(false)
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [isLoading, isAuthenticated, router])

  const handleQuantityChange = async (productId: string, variantId: string | undefined, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await removeItem(productId, variantId)
        toast.success('Item removido do carrinho')
      } else {
        await updateQuantity(productId, variantId, newQuantity)
        // Não mostrar toast para evitar spam ao clicar várias vezes
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar quantidade')
    }
  }

  const handleRemoveItem = async (productId: string, variantId?: string) => {
    try {
      await removeItem(productId, variantId)
      toast.success('Produto removido do carrinho')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover produto')
    }
  }

  const handleApplyCupom = () => {
    if (!cupomCode.trim()) {
      toast.error('Digite um código de cupom')
      return
    }

    // Simulação - em produção, validar no backend
    if (cupomCode.toUpperCase() === 'DESCONTO10') {
      setDiscount(getTotalPrice() * 0.1)
      setCupomApplied(true)
      toast.success('Cupom aplicado com sucesso!')
    } else {
      toast.error('Cupom inválido')
    }
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Carrinho vazio')
      return
    }
    if (hasMixedProductTypes) {
      toast.error('Não é possível misturar produtos físicos com digitais. Remova os itens do outro tipo para continuar.')
      return
    }
    router.push('/dashboard/loja/checkout')
  }

  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const totalItems = getTotalItems()
  const subtotal = getTotalPrice()
  const frete = 0 // Será calculado no checkout
  const total = subtotal - discount + frete

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/loja"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continuar comprando
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Carrinho de compras</h1>
        </div>

        {/* Carrinho Vazio */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione produtos à sua lista de compras
            </p>
            <Link
              href="/dashboard/loja"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para a loja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerta de mistura de tipos */}
            {hasMixedProductTypes && (
              <div className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    Não é possível misturar produtos físicos com digitais
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Remova os itens do outro tipo (físico ou digital) para poder finalizar a compra.
                  </p>
                </div>
              </div>
            )}

            {/* Coluna Esquerda - Lista de Produtos */}
            <div className="lg:col-span-2 space-y-4">
              {/* Card de Produtos */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Produtos ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
                  </h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.variantId || 'no-variant'}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        {/* Imagem */}
                        <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center" aria-hidden>
                              <ShoppingBag className="w-10 h-10 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 mb-1">
                            {item.name}
                          </h3>
                          {item.variantName && (
                            <p className="text-sm text-gray-600 mb-2">
                              Variação: {item.variantName}
                            </p>
                          )}

                          {/* Controles */}
                          <div className="flex items-center justify-between mt-3">
                            {/* Quantidade */}
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() =>
                                  handleQuantityChange(item.productId, item.variantId, item.quantity - 1)
                                }
                                className="p-2 hover:bg-gray-100 transition-colors rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 text-center min-w-[50px] font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(item.productId, item.variantId, item.quantity + 1)
                                }
                                className="p-2 hover:bg-gray-100 transition-colors rounded-r-lg"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Preço */}
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                              {item.quantity > 1 && (
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(item.price)} cada
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Remover */}
                          <button
                            onClick={() => handleRemoveItem(item.productId, item.variantId)}
                            className="inline-flex items-center text-sm text-red-600 hover:text-red-700 mt-2"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cupom de Desconto */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center space-x-3">
                  <Tag className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Cupom de desconto</h3>
                </div>
                <div className="mt-3 flex space-x-2">
                  <input
                    type="text"
                    placeholder="Digite seu cupom"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={cupomCode}
                    onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                    disabled={cupomApplied}
                  />
                  <button
                    onClick={handleApplyCupom}
                    disabled={cupomApplied}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cupomApplied ? 'Aplicado' : 'Aplicar'}
                  </button>
                </div>
                {cupomApplied && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Cupom aplicado com sucesso!
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita - Resumo */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm sticky top-4">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Resumo da compra
                  </h2>
                </div>

                <div className="p-4 space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between text-gray-700">
                    <span>Produtos ({totalItems})</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {/* Desconto */}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}

                  {/* Frete */}
                  <div className="flex justify-between text-gray-700">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 mr-1" />
                      <span>Frete</span>
                    </div>
                    <span className="text-green-600 font-medium">
                      Calcular no checkout
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 pt-3"></div>

                  {/* Total */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(total)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ou em até 12x sem juros
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Checkout */}
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleCheckout}
                    disabled={hasMixedProductTypes}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar para o pagamento
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </button>

                  <div className="mt-3 text-center">
                    <Link
                      href="/dashboard/loja"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Adicionar mais produtos
                    </Link>
                  </div>
                </div>

                {/* Segurança */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">
                        Compra 100% segura
                      </p>
                      <p className="text-xs">
                        Seus dados estão protegidos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCart } from '@/lib/hooks/useCart'
import { useStoreCart } from '@/lib/hooks/useStoreCart'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart,
  ArrowLeft,
  Package,
  Store
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import PixPaymentModal from '@/components/pagamento/PixPaymentModal'

export default function CarrinhoPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  // Carrinho de pacotes MLM
  const { 
    items: mlmItems, 
    isLoaded: mlmLoaded,
    removeItem: removeMlmItem, 
    updateQuantity: updateMlmQuantity, 
    clearCart: clearMlmCart, 
    getTotalItems: getTotalMlmItems, 
    getTotalPrice: getTotalMlmPrice 
  } = useCart()

  // Carrinho de produtos da loja
  const {
    items: storeItems,
    isLoaded: storeLoaded,
    removeItem: removeStoreItem,
    updateQuantity: updateStoreQuantity,
    clearCart: clearStoreCart,
    getTotalItems: getTotalStoreItems,
    getTotalPrice: getTotalStorePrice
  } = useStoreCart()

  console.log('🛒 CarrinhoPage - Pacotes MLM:', mlmItems, 'isLoaded:', mlmLoaded)
  console.log('🛒 CarrinhoPage - Produtos Loja:', storeItems, 'isLoaded:', storeLoaded)
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const router = useRouter()

  const totalItems = getTotalMlmItems() + getTotalStoreItems()
  const totalPrice = getTotalMlmPrice() + getTotalStorePrice()
  const isLoaded = mlmLoaded && storeLoaded

  const handleQuantityChange = (itemId: string, newQuantity: number, isStore: boolean = false, storeItem?: { productId: string; variantId?: string }) => {
    if (newQuantity <= 0) {
      if (isStore && storeItem) {
        removeStoreItem(storeItem.productId, storeItem.variantId)
      } else if (!isStore) {
        removeMlmItem(itemId)
      }
      toast.success('Item removido do carrinho', {
        description: 'O item foi removido com sucesso.',
        icon: <CheckCircle className="w-5 h-5" />
      })
    } else {
      if (isStore && storeItem) {
        updateStoreQuantity(storeItem.productId, storeItem.variantId, newQuantity)
      } else {
        // MLM packages não permitem alteração de quantidade
        return
      }
      toast.success('Quantidade atualizada', {
        description: 'A quantidade foi atualizada no carrinho.',
        icon: <CheckCircle className="w-5 h-5" />
      })
    }
  }

  const handleRemoveItem = (itemId: string, isStore: boolean = false, storeItem?: { productId: string; variantId?: string }) => {
    if (isStore && storeItem) {
      removeStoreItem(storeItem.productId, storeItem.variantId)
    } else if (!isStore) {
      removeMlmItem(itemId)
    }
    toast.success('Item removido do carrinho', {
      description: 'O item foi removido com sucesso.',
      icon: <CheckCircle className="w-5 h-5" />
    })
  }

  const handleClearCart = () => {
    clearMlmCart()
    clearStoreCart()
    toast.success('Carrinho limpo', {
      description: 'Todos os itens foram removidos do carrinho.',
      icon: <CheckCircle className="w-5 h-5" />
    })
  }

  const handleCheckout = () => {
    if (totalItems === 0) {
      toast.error('Carrinho vazio', {
        description: 'Adicione itens ao carrinho antes de finalizar a compra.',
        icon: <XCircle className="w-5 h-5" />
      })
      return
    }
    setShowCheckoutModal(true)
  }

  const handleCloseModal = () => {
    setShowCheckoutModal(false)
  }

  // Se ainda está carregando a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não está autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  // Se o carrinho ainda não foi carregado
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Carregando carrinho...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard"
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🛒 Carrinho de Compras</h1>
              <p className="text-gray-600">
                Revise seus itens e finalize sua compra
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Total de Itens</div>
            <div className="text-2xl font-bold text-blue-600">
              {totalItems}
            </div>
          </div>
        </div>
      </div>

      {/* Carrinho Vazio */}
      {totalItems === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h3>
          <p className="text-gray-600 mb-6">
            Adicione pacotes ou produtos ao seu carrinho para começar.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/dashboard/planos"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="w-5 h-5 mr-2" />
              Ver Pacotes
            </Link>
            <Link
              href="/dashboard/loja"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              <Store className="w-5 h-5 mr-2" />
              Ver Loja
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Pacotes MLM */}
          {mlmItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Pacotes de Cotas</h2>
                  </div>
                  <button
                    onClick={() => clearMlmCart()}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {mlmItems.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          <button
                            onClick={() => handleRemoveItem(item.id, false)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Preço:</span> R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            <span className="font-medium">Pontos:</span> {item.points}
                          </div>
                          <div>
                            <span className="font-medium">Bônus/Ciclo:</span> R$ {item.cycleBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            <span className="font-medium">Lucro Mensal:</span> {item.profitSharePercent}%
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                            <span className="px-4 py-2 bg-gray-100 rounded-lg font-medium">
                              {item.quantity}
                            </span>
                            <span className="text-xs text-gray-500">(pacotes não permitem alteração)</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-gray-500">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Subtotal Pacotes:</span>
                  <span className="text-xl font-bold text-blue-600">
                    R$ {getTotalMlmPrice().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Produtos da Loja */}
          {storeItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Store className="w-5 h-5 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Produtos da Loja</h2>
                  </div>
                  <button
                    onClick={() => clearStoreCart()}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {storeItems.map((item) => (
                  <div key={`${item.id}-${item.variantId || 'no-variant'}`} className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center" aria-hidden>
                            <Store className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                            {item.variantName && (
                              <p className="text-sm text-gray-500">Variação: {item.variantName}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id, true, item)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1, true, item)}
                                className="p-2 hover:bg-gray-100 transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 text-center min-w-[60px] font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1, true, item)}
                                className="p-2 hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-gray-500">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Subtotal Produtos:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {getTotalStorePrice().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resumo Total do Pedido */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Subtotal ({totalItems} itens)</span>
                  <span className="font-semibold">R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                {storeItems.length > 0 && (
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Frete</span>
                    <span className="text-sm text-blue-600">Calcular no checkout</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-xl font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Finalizar Compra
              </button>

              <button
                onClick={handleClearCart}
                className="w-full mt-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Todo o Carrinho
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Checkout */}
      <PixPaymentModal
        isOpen={showCheckoutModal}
        onClose={handleCloseModal}
        onSuccess={() => {
          clearMlmCart()
          clearStoreCart()
          router.push('/dashboard')
        }}
        title="Finalizar Compra"
        description={`${totalItems} item(s) no carrinho`}
        amount={totalPrice}
        items={[
          ...mlmItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          ...storeItems.map(item => ({
            id: `store-${item.id}-${item.variantId || 'no-variant'}`,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        ]}
        apiEndpoint="/api/pagarme/charge"
        requestBody={{
          valor: totalPrice,
          descricao: `Carrinho TectonMiner - ${totalItems} item(s) (${mlmItems.length} pacotes, ${storeItems.length} produtos)`,
          identificador: `cart-${Date.now()}`,
          cliente: {
            nome: user?.name,
            email: user?.email
          },
          expiracaoSegundos: 3600,
          informacoesAdicionais: [
            {
              chave: 'tipo_compra',
              valor: 'carrinho_integrado'
            },
            {
              chave: 'usuario_id',
              valor: user?.id
            },
            {
              chave: 'pacotes_mlm',
              valor: JSON.stringify(mlmItems.map(item => ({
                planId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
              })))
            },
            {
              chave: 'produtos_loja',
              valor: JSON.stringify(storeItems.map(item => ({
                productId: item.id,
                variantId: item.variantId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
              })))
            }
          ]
        }}
      />
    </div>
  )
} 
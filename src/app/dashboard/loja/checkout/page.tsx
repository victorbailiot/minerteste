'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useStoreCart } from '@/lib/hooks/useStoreCart'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Truck,
  Lock,
  Check,
  Loader2,
  Plus,
  QrCode,
  Wallet,
  Package
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import BonusPaymentModalLoja from '@/components/pagamento/loja/BonusPaymentModalLoja'
import PixPaymentModalLoja from '@/components/pagamento/loja/PixPaymentModalLoja'
import PagarMeCardPaymentModalLoja from '@/components/pagamento/loja/PagarMeCardPaymentModalLoja'

interface Address {
  id: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

interface ShippingOption {
  id: number | string
  name: string
  price: string
  currency: string
  delivery_time?: number
  delivery_range?: { min: number; max: number }
  company?: { id: number; name: string; picture: string }
}

export default function CheckoutLojaPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    items,
    isLoaded,
    getTotalItems,
    getTotalPrice,
    clearCart,
    hasPhysicalProducts,
  } = useStoreCart()

  const isDigitalOnly = items.length > 0 && !hasPhysicalProducts()

  const [loading, setLoading] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BALANCE'>('PIX')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [showPixModal, setShowPixModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const hasStartedCheckoutRef = useRef(false) // Rastrear se o usuário iniciou o checkout

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [authLoading, isAuthenticated, router])

  // Rastrear quando o usuário inicia o checkout (quando há itens)
  // IMPORTANTE: Setar imediatamente quando há itens, não esperar pelo useEffect
  useEffect(() => {
    if (isLoaded && items.length > 0) {
      hasStartedCheckoutRef.current = true
    }
  }, [isLoaded, items])
  
  // Setar imediatamente na montagem se já houver itens
  useEffect(() => {
    if (isLoaded && items.length > 0 && !hasStartedCheckoutRef.current) {
      hasStartedCheckoutRef.current = true
    }
  }, [isLoaded, items.length])

  useEffect(() => {
    // NUNCA redirecionar na página de checkout após o componente montar
    // O redirecionamento só deve acontecer se o usuário CHEGAR na página sem itens
    // Uma vez que o componente está montado, não redirecionar mais (mesmo se carrinho for limpo)
    const hasStartedCheckout = hasStartedCheckoutRef.current
    const hasActivePaymentFlow = createdOrder || loading || showPixModal || showCardModal || showBonusModal || showPaymentSuccessModal
    const isCheckoutPage = typeof window !== 'undefined' && window.location.pathname.includes('/checkout')
    // Se estamos na página de checkout E (já iniciou checkout OU há processo ativo OU está carregando), NUNCA redirecionar
    if (isCheckoutPage && (hasStartedCheckout || hasActivePaymentFlow || loading)) {
      return
    }

    // Não redirecionar se ainda não carregou
    if (!isLoaded) {
      return
    }

    // Redirecionar apenas se:
    // 1. Carrinho está vazio
    // 2. NÃO estamos na página de checkout (ou estamos mas nunca iniciou checkout e não há processo)
    // 3. Usuário nunca iniciou checkout
    if (items.length === 0 && !isCheckoutPage && !hasStartedCheckout) {
      router.push('/dashboard/loja')
      toast.error('Carrinho vazio')
    }
  }, [isLoaded, items, router, createdOrder, loading, showPixModal, showCardModal, showBonusModal, showPaymentSuccessModal])

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch('/api/user/address')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.addresses) {
          // Mapear os endereços para o formato esperado
          const mappedAddresses = data.addresses.map((addr: any) => ({
            id: String(addr.id),
            street: addr.street,
            number: addr.number,
            complement: addr.complement || null,
            neighborhood: addr.neighborhood,
            city: addr.city,
            state: addr.state,
            zipCode: addr.postalCode,
            isDefault: addr.isDefault
          }))
          setAddresses(mappedAddresses)
          // Selecionar o endereço padrão ou o primeiro
          const defaultAddress = mappedAddresses.find((a: any) => a.isDefault) || mappedAddresses[0]
          if (defaultAddress) {
            setSelectedAddress(defaultAddress.id)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !isDigitalOnly) {
      fetchAddresses()
    } else if (isDigitalOnly) {
      setLoadingAddresses(false)
    }
  }, [isAuthenticated, fetchAddresses, isDigitalOnly])

  // Calcular frete quando endereço e itens mudarem (apenas para produtos físicos)
  const fetchShippingOptions = useCallback(async () => {
    if (!selectedAddress || items.length === 0 || isDigitalOnly) {
      setShippingOptions([])
      setSelectedShipping(null)
      return
    }

    const address = addresses.find((a) => a.id === selectedAddress)
    if (!address?.zipCode) return

    const cep = address.zipCode.replace(/\D/g, '')
    if (cep.length !== 8) return

    setLoadingShipping(true)
    try {
      const response = await fetch('/api/store/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cepDestino: cep })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular frete')
      }

      if (data.success && data.options?.length > 0) {
        setShippingOptions(data.options)
        setSelectedShipping(data.options[0])
      } else {
        setShippingOptions([])
        setSelectedShipping(null)
      }
    } catch (error) {
      console.error('Erro ao buscar opções de frete:', error)
      setShippingOptions([])
      setSelectedShipping(null)
      toast.error(error instanceof Error ? error.message : 'Erro ao calcular frete')
    } finally {
      setLoadingShipping(false)
    }
  }, [selectedAddress, addresses, items.length, isDigitalOnly])

  useEffect(() => {
    fetchShippingOptions()
  }, [fetchShippingOptions])

  // Recarregar endereços quando voltar da página de adicionar endereço
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('addressAdded') === 'true') {
      fetchAddresses()
      // Remover o parâmetro da URL
      urlParams.delete('addressAdded')
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
      window.history.replaceState({}, '', newUrl)
    }
  }, [fetchAddresses])

  const handleSubmitOrder = async () => {
    if (!isDigitalOnly) {
      if (!selectedAddress) {
        toast.error('Selecione um endereço de entrega')
        return
      }

      if (!selectedShipping) {
        toast.error('Selecione uma opção de frete')
        return
      }
    }

    // Se já existe um pedido criado e está pendente, atualizar forma de pagamento e frete (caso tenha mudado) e abrir o modal
    if (createdOrder && createdOrder.id && createdOrder.paymentStatus === 'PENDING') {
      console.log('Pedido já existe, atualizando forma de pagamento e frete:', createdOrder.id)
      
      setLoading(true)
      try {
        const newShippingCost = isDigitalOnly ? 0 : (parseFloat(selectedShipping!.price) || 0)
        // Atualizar pedido existente com nova forma de pagamento e frete atual selecionado
        const response = await fetch(`/api/store/orders/${createdOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: paymentMethod,
            shippingCost: newShippingCost,
            shippingMethod: isDigitalOnly ? 'Entrega digital' : (selectedShipping?.company?.name || 'Melhor Envio'),
            shippingService: isDigitalOnly ? 'Entrega digital' : (selectedShipping?.name || '')
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao atualizar forma de pagamento')
        }

        const data = await response.json()
        const updatedOrder = data.order || createdOrder
        
        // Atualizar pedido local
        setCreatedOrder(updatedOrder)
        
        // Fechar todos os modais antes de abrir o novo
        setShowPixModal(false)
        setShowCardModal(false)
        setShowBonusModal(false)
        
        // Aguardar um pequeno delay e abrir o modal correspondente
        setTimeout(() => {
          console.log('Abrindo modal para método:', paymentMethod)
          if (paymentMethod === 'PIX') {
            console.log('Abrindo modal PIX')
            setShowPixModal(true)
          } else if (paymentMethod === 'CREDIT_CARD') {
            console.log('Abrindo modal Cartão')
            setShowCardModal(true)
          } else if (paymentMethod === 'BALANCE') {
            console.log('Abrindo modal Bônus')
            setShowBonusModal(true)
          }
          
          setLoading(false)
        }, 300)

        return
      } catch (error) {
        console.error('Erro ao atualizar forma de pagamento:', error)
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar forma de pagamento')
        setLoading(false)
        return
      }
    }

    // Garantir que o checkout foi marcado como iniciado ANTES de começar o processo
    if (!hasStartedCheckoutRef.current && items.length > 0) {
      hasStartedCheckoutRef.current = true
    }

    // Criar novo pedido apenas se não existir um pedido pendente
    setLoading(true)
    try {
      const checkoutBody = isDigitalOnly
        ? {
            items: items.map(item => ({
              productId: String(item.productId),
              variantId: item.variantId ? String(item.variantId) : undefined,
              quantity: item.quantity
            })),
            paymentMethod: paymentMethod,
            digitalOnly: true
          }
        : {
            items: items.map(item => ({
              productId: String(item.productId),
              variantId: item.variantId ? String(item.variantId) : undefined,
              quantity: item.quantity
            })),
            shippingAddressId: selectedAddress,
            shippingMethod: selectedShipping!.company?.name || 'Melhor Envio',
            shippingService: selectedShipping!.name,
            shippingCost: parseFloat(selectedShipping!.price) || 0,
            paymentMethod: paymentMethod
          }

      const response = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar pedido')
      }

      const data = await response.json()
      console.log('Resposta da API:', data)
      const order = data.order || data

      if (!order || !order.id) {
        console.error('Pedido inválido:', order)
        throw new Error('Pedido não foi criado corretamente')
      }

      console.log('Pedido criado:', order)
      console.log('Método de pagamento:', paymentMethod)

      // Garantir que checkout está marcado como iniciado ANTES de setar createdOrder
      hasStartedCheckoutRef.current = true

      // Salvar pedido criado para usar nos modais
      setCreatedOrder(order)

      // IMPORTANTE: Não setar loading como false ainda - manter true até o modal abrir
      // Isso previne que o useEffect redirecione antes do modal ser aberto
      
      // Aguardar um pequeno delay para garantir que o estado foi atualizado
      // e os modais foram renderizados antes de abrir
      setTimeout(() => {
        console.log('Abrindo modal para método:', paymentMethod)
        if (paymentMethod === 'PIX') {
          console.log('Abrindo modal PIX')
          setShowPixModal(true)
        } else if (paymentMethod === 'CREDIT_CARD') {
          console.log('Abrindo modal Cartão')
          setShowCardModal(true)
        } else if (paymentMethod === 'BALANCE') {
          console.log('Abrindo modal Bônus')
          setShowBonusModal(true)
        }
        
        // Agora sim, setar loading como false após abrir o modal
        setLoading(false)
      }, 300)

    } catch (error) {
      console.error('Erro ao finalizar pedido:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar pedido')
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentId?: string) => {
    // Limpar carrinho após pagamento bem-sucedido
    clearCart()

    setShowPixModal(false)
    setShowCardModal(false)
    setShowBonusModal(false)
    setShowPaymentSuccessModal(true)
  }

  const handlePaymentError = (error: string) => {
    toast.error(`Erro no pagamento: ${error}`)
  }

  if (authLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const subtotal = getTotalPrice()
  const shippingCost = isDigitalOnly ? 0 : (selectedShipping ? parseFloat(selectedShipping.price) || 0 : 0)
  const total = subtotal + shippingCost

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/loja/carrinho"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao carrinho
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Finalizar compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endereço de Entrega - apenas para produtos físicos */}
            {!isDigitalOnly && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Endereço de entrega
                  </h2>
                </div>
                <Link
                  href="/dashboard/loja/endereco?returnTo=/dashboard/loja/checkout"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar novo
                </Link>
              </div>

              <div className="p-4">
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-4">Nenhum endereço cadastrado</p>
                    <Link
                      href="/dashboard/loja/endereco?returnTo=/dashboard/loja/checkout"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar endereço
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedAddress === address.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddress === address.id}
                          onChange={(e) => setSelectedAddress(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {address.street}, {address.number}
                            </span>
                          </div>
                          {address.complement && (
                            <p className="text-sm text-gray-600">{address.complement}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            {address.neighborhood}, {address.city} - {address.state}
                          </p>
                          <p className="text-sm text-gray-600">CEP: {address.zipCode}</p>
                        </div>
                        {selectedAddress === address.id && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Método de Envio - apenas para produtos físicos */}
            {!isDigitalOnly && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Método de envio
                </h2>
              </div>

              <div className="p-4 space-y-3">
                {!selectedAddress ? (
                  <p className="text-sm text-gray-500 py-4">
                    Selecione um endereço de entrega para ver as opções de frete.
                  </p>
                ) : loadingShipping ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <p className="text-sm text-amber-600 py-4">
                    Nenhuma opção de frete disponível para este endereço.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shippingOptions.map((option) => (
                      <label
                        key={String(option.id)}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedShipping?.id === option.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={String(option.id)}
                            checked={selectedShipping?.id === option.id}
                            onChange={() => setSelectedShipping(option)}
                            className="mt-1"
                          />
                          <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {option.company?.name ? `${option.company.name} - ` : ''}{option.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {option.delivery_range
                                ? `Entrega em ${option.delivery_range.min} a ${option.delivery_range.max} dias úteis`
                                : option.delivery_time
                                  ? `Entrega em até ${option.delivery_time} dias úteis`
                                  : 'Consulte prazo'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(parseFloat(option.price) || 0)}
                          </p>
                        </div>
                        {selectedShipping?.id === option.id && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Forma de Pagamento */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">{isDigitalOnly ? '1' : '3'}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Forma de pagamento
                </h2>
              </div>

              <div className="p-4 space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'PIX' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="PIX"
                    checked={paymentMethod === 'PIX'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">PIX</p>
                    <p className="text-sm text-gray-600">Aprovação imediata</p>
                  </div>
                  {paymentMethod === 'PIX' && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'CREDIT_CARD' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="CREDIT_CARD"
                    checked={paymentMethod === 'CREDIT_CARD'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Cartão de Crédito</p>
                    <p className="text-sm text-gray-600">Em até 12x sem juros</p>
                  </div>
                  {paymentMethod === 'CREDIT_CARD' && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </label>

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'BALANCE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="BALANCE"
                    checked={paymentMethod === 'BALANCE'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Saldo na Conta</p>
                    <p className="text-sm text-gray-600">Desconto imediato</p>
                  </div>
                  {paymentMethod === 'BALANCE' && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Resumo */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Resumo do pedido
                </h2>
              </div>

              {/* Produtos */}
              <div className="p-4 max-h-64 overflow-y-auto border-b border-gray-200">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.variantId}`} className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded border border-gray-200">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qtd: {item.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Frete</span>
                  <span className="text-green-600 font-medium">
                    {isDigitalOnly ? 'Entrega digital' : (shippingCost === 0 ? 'Grátis' : formatCurrency(shippingCost))}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3"></div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(total)}
                    </div>
                    <div className="text-xs text-gray-500">
                      em até 12x sem juros
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão Finalizar */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleSubmitOrder}
                  disabled={
                    loading ||
                    (!isDigitalOnly && (!selectedAddress || !selectedShipping || loadingShipping))
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Finalizar pedido
                    </>
                  )}
                </button>

                <div className="mt-3 flex items-center justify-center text-xs text-gray-500">
                  <Lock className="w-3 h-3 mr-1" />
                  Pagamento 100% seguro
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modais de Pagamento */}
      <>
        {/* Modal PIX */}
        {createdOrder && (
          <PixPaymentModalLoja
            isOpen={showPixModal}
            onClose={() => setShowPixModal(false)}
            onSuccess={handlePaymentSuccess}
            orderId={createdOrder.id}
            orderNumber={createdOrder.orderNumber}
            total={createdOrder.total}
            shipping={createdOrder.shippingCost != null ? Number(createdOrder.shippingCost) : 0}
            items={createdOrder.items?.map((item: any) => ({
              id: String(item.productId || item.id),
              name: item.name || item.productName || 'Produto',
              price: Number(item.unitPrice || item.price),
              quantity: item.quantity
            })) || []}
            user={user}
          />
        )}
        
        {/* Modal Cartão de Crédito */}
        {createdOrder && (
          <PagarMeCardPaymentModalLoja
            isOpen={showCardModal}
            onClose={() => setShowCardModal(false)}
            onSuccess={handlePaymentSuccess}
            orderId={createdOrder.id}
            orderNumber={createdOrder.orderNumber}
            total={createdOrder.total}
            user={user}
          />
        )}

        {/* Modal Pagamento com Bônus */}
        {createdOrder && (
          <BonusPaymentModalLoja
            isOpen={showBonusModal}
            onClose={() => setShowBonusModal(false)}
            onSuccess={handlePaymentSuccess}
            orderId={createdOrder.id}
            orderNumber={createdOrder.orderNumber}
            total={createdOrder.total}
            items={createdOrder.items?.map((item: any) => ({
              id: String(item.productId || item.id),
              name: item.name || item.productName || 'Produto',
              price: Number(item.unitPrice || item.price),
              quantity: item.quantity
            })) || []}
          />
        )}

        {/* Modal de Confirmação de Pagamento */}
        {createdOrder && (
          <Dialog open={showPaymentSuccessModal} onOpenChange={setShowPaymentSuccessModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pagamento realizado com sucesso!</DialogTitle>
                <DialogDescription>
                  Seu pagamento foi processado com sucesso. O pedido #{createdOrder.orderNumber} será processado em breve.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setShowPaymentSuccessModal(false)
                    router.push('/dashboard/pedidos')
                  }}
                >
                  Ver Meus Pedidos
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    </div>
  )
}

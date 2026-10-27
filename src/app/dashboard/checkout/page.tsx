'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import {
  CreditCard,
  QrCode,
  Receipt,
  Shield,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Globe,
  TrendingUp,
  Clock,
  User,
  Package,
  Wallet,
  Gift,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import StripePaymentModal from '@/components/pagamento/StripePaymentModal'
import StripeCheckoutButton from '@/components/pagamento/StripeCheckoutButton'
import StripePixPaymentModal from '@/components/pagamento/StripePixPaymentModal'
import PagarMeCardPaymentModal from '@/components/pagamento/PagarMeCardPaymentModal'
import PixPaymentModal from '@/components/pagamento/PixPaymentModal'
import BoletoPaymentModal from '@/components/pagamento/BoletoPaymentModal'
import BonusPaymentModal from '@/components/pagamento/BonusPaymentModal'
import CurrencySelector from '@/components/CurrencySelector'
import GenerateVoucherModal from '@/components/vouchers/GenerateVoucherModal'
import BlockedAccessModal from '@/components/modals/BlockedAccessModal'

// ===== TIPOS =====

interface UnilevelPackage {
  id: string
  name: string
  price: number
  points: number
  directBonus: number
  profitSharePercent: number
  reactivationAmount: number
  reactivationBonus: number
  isActive: boolean
  maxQuantity: number
  visibleOnlyForActiveUsers: boolean
}

interface CheckoutData {
  packageId: string
  minerId: string
  packageName: string
  packagePrice: number
  currency: string
  convertedPrice: number
}

interface MinerOption {
  id: string
  name: string
  city: string
  state: string
}

// ===== COMPONENTE PRINCIPAL =====

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading } = useAuth()

  // Estados
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [packages, setPackages] = useState<UnilevelPackage[]>([])
  const [isLoadingPackages, setIsLoadingPackages] = useState(true)
  const [isLoadingCheckoutData, setIsLoadingCheckoutData] = useState(true)
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [showStripePixModal, setShowStripePixModal] = useState(false)
  const [showPagarMeCardModal, setShowPagarMeCardModal] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [showBoletoModal, setShowBoletoModal] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showPaymentApprovedModal, setShowPaymentApprovedModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [selectedCurrency, setSelectedCurrency] = useState('brl')
  const [packageQuantity, setPackageQuantity] = useState<number>(1)
  const [purchaseLimit, setPurchaseLimit] = useState<{
    currentTotal: number
    remainingAmount: number
    limit: number
  } | null>(null)
  const [isLoadingLimit, setIsLoadingLimit] = useState(false)
  const [userActivePackage, setUserActivePackage] = useState<any | null>(null)
  const [isLoadingActivePackage, setIsLoadingActivePackage] = useState(true)
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [selectedMinerId, setSelectedMinerId] = useState('')
  const [isLoadingMiners, setIsLoadingMiners] = useState(true)
  const [showBlacklistModal, setShowBlacklistModal] = useState(false)
  const [blacklistModalReason, setBlacklistModalReason] = useState('')

  // Carregar moeda do localStorage ao montar o componente
  // Se o país não for Brasil, definir USD como padrão (mas permitir mudança)
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency')
    
    if (savedCurrency) {
      // Se já tem moeda salva, usar ela (respeita escolha do usuário)
      setSelectedCurrency(savedCurrency)
    } else if (user?.country && user.country !== 'BR') {
      // Usuário internacional sem preferência salva: definir USD como padrão
      setSelectedCurrency('usd')
      localStorage.setItem('selectedCurrency', 'usd')
    } else {
      // Usuário brasileiro ou sem país: manter BRL como padrão
      setSelectedCurrency('brl')
      localStorage.setItem('selectedCurrency', 'brl')
    }
  }, [user?.country])

  // Atualiza dados do checkout quando os parâmetros ou a lista de pacotes mudarem
  useEffect(() => {
    const packageId = searchParams.get('packageId')
    const minerId = searchParams.get('minerId')

    if (!packageId || !minerId) {
      toast.error('Pacote ou mineradora não especificados')
      router.push('/dashboard/cotas')
      return
    }

    if (!selectedMinerId) {
      setSelectedMinerId(minerId)
    }

    // Se ainda está carregando pacotes, não processar
    if (isLoadingPackages) {
      return
    }

    const pkg = packages.find(p => p.id === packageId)
    if (pkg) {
      setIsLoadingCheckoutData(true)
      // Converter preço para a moeda selecionada
      const convertPrice = async () => {
        try {
          // Sempre tentar converter, mesmo para USD (para garantir consistência)
          const response = await fetch(
            `/api/currency/convert?packageId=${pkg.id}&to=${selectedCurrency}`
          )
          const result = await response.json()
          
          if (result.success) {
            setCheckoutData({
              packageId: pkg.id,
              minerId: selectedMinerId || minerId,
              packageName: pkg.name,
              packagePrice: pkg.price,
              currency: selectedCurrency,
              convertedPrice: result.data.convertedAmount
            })
          } else {
            // Fallback para preço original se conversão falhar
            setCheckoutData({
              packageId: pkg.id,
              minerId: selectedMinerId || minerId,
              packageName: pkg.name,
              packagePrice: pkg.price,
              currency: selectedCurrency,
              convertedPrice: pkg.price
            })
          }
        } catch (error) {
          // Fallback para preço original
          setCheckoutData({
            packageId: pkg.id,
            minerId: selectedMinerId || minerId,
            packageName: pkg.name,
            packagePrice: pkg.price,
            currency: selectedCurrency,
            convertedPrice: pkg.price
          })
        } finally {
          setIsLoadingCheckoutData(false)
        }
      }
      
      convertPrice()
    } else {
      // Pacote não encontrado
      setIsLoadingCheckoutData(false)
    }
  }, [searchParams, packages, selectedCurrency, isLoadingPackages, router, selectedMinerId])

  // Buscar pacotes unilevel
  const fetchPackages = useCallback(async () => {
    try {
      if (!selectedMinerId) {
        setPackages([])
        return
      }

      const response = await fetch(`/api/unilevel/packages?isActive=true&minerId=${selectedMinerId}`)
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json?.error || 'Falha ao carregar pacotes')
      }

      // A API retorna { success, data: UnilevelPackage[] }
      const list = Array.isArray(json?.data) ? json.data : []
      const normalized: UnilevelPackage[] = list.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        price: Number(p.price),
        points: Number(p.points),
        directBonus: Number(p.directBonus),
        profitSharePercent: Number(p.profitSharePercent),
        reactivationAmount: Number(p.reactivationAmount),
        reactivationBonus: Number(p.reactivationBonus),
        isActive: Boolean(p.isActive),
        maxQuantity: Number(p.maxQuantity || 50),
        visibleOnlyForActiveUsers: Boolean(p.visibleOnlyForActiveUsers),
      }))

      setPackages(normalized)
    } catch (error) {
      console.error('Erro ao buscar pacotes unilevel:', error)
      toast.error('Erro ao carregar pacotes')
    } finally {
      setIsLoadingPackages(false)
    }
  }, [selectedMinerId])

  const fetchMiners = useCallback(async () => {
    try {
      setIsLoadingMiners(true)
      const response = await fetch('/api/miners')
      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Erro ao carregar mineradoras')
      }

      setMiners(json.data || [])
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setIsLoadingMiners(false)
    }
  }, [])

  // Buscar limite de compra do usuário
  const fetchPurchaseLimit = async () => {
    try {
      setIsLoadingLimit(true)
      const response = await fetch('/api/user/purchase-limit')
      const json = await response.json()

      if (response.ok && json.success) {
        setPurchaseLimit(json.data)
      } else {
        console.error('Erro ao buscar limite de compra:', json.error)
      }
    } catch (error) {
      console.error('Erro ao buscar limite de compra:', error)
    } finally {
      setIsLoadingLimit(false)
    }
  }

  // Buscar pacote ativo do usuário
  const fetchUserActivePackage = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingActivePackage(false)
      return
    }

    try {
      setIsLoadingActivePackage(true)
      const response = await fetch(`/api/unilevel/active-package?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.hasActivePackage && data.data && data.data.length > 0) {
          setUserActivePackage(data.data[0])
        } else {
          setUserActivePackage(null)
        }
      } else {
        console.error('❌ Erro ao buscar pacote ativo:', response.status)
        setUserActivePackage(null)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar pacote ativo:', error)
      setUserActivePackage(null)
    } finally {
      setIsLoadingActivePackage(false)
    }
  }, [user?.id])

  // Busca os pacotes e limite apenas uma vez ao montar a página
  useEffect(() => {
    fetchPurchaseLimit()
    fetchMiners()
  }, [fetchMiners])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  // Buscar pacote ativo quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id) {
      fetchUserActivePackage()
    }
  }, [user?.id, fetchUserActivePackage])

  // Verificar autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  // Exibir loading enquanto busca pacotes, dados do checkout ou pacote ativo
  if (isLoadingPackages || isLoadingCheckoutData || isLoadingActivePackage || isLoadingMiners) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isLoadingPackages ? 'Carregando pacotes...' : isLoadingCheckoutData ? 'Carregando dados do checkout...' : 'Carregando informações...'}
          </p>
        </div>
      </div>
    )
  }

  // Bloquear acesso ao checkout se o pacote exige usuário com pacote ativo e o usuário não tem
  const packageId = searchParams.get('packageId')
  const minerIdFromQuery = searchParams.get('minerId')
  const requestedPkg = packages.find(p => p.id === packageId)
  const selectedMiner = miners.find((miner) => miner.id === selectedMinerId)

  if (!minerIdFromQuery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Mineradora não selecionada</h2>
          <p className="text-gray-600 mb-4">Selecione uma mineradora antes de prosseguir com a compra.</p>
          <Button onClick={() => router.push('/dashboard/cotas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Pacotes
          </Button>
        </div>
      </div>
    )
  }
  if (requestedPkg?.visibleOnlyForActiveUsers && userActivePackage === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pacote não disponível</h2>
          <p className="text-gray-600 mb-2">
            O pacote <span className="font-semibold text-gray-900">{requestedPkg.name}</span> está disponível somente para usuários que já possuem um pacote ativo.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Adquira outro pacote primeiro para ter acesso a este.
          </p>
          <Button onClick={() => router.push('/dashboard/cotas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Pacotes
          </Button>
        </div>
      </div>
    )
  }

  // Verificar se o pacote foi encontrado após o carregamento
  if (!checkoutData) {
    const pkg = packages.find(p => p.id === packageId)
    
    if (!pkg) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pacote não encontrado</h2>
            <p className="text-gray-600 mb-4">O pacote selecionado não foi encontrado ou não está disponível.</p>
            <Button onClick={() => router.push('/dashboard/cotas')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Pacotes
            </Button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 mb-4">Não foi possível carregar os dados do checkout. Tente novamente.</p>
          <Button onClick={() => router.push('/dashboard/cotas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Pacotes
          </Button>
        </div>
      </div>
    )
  }

  // Formatar moeda
  const formatCurrency = (amount: number, currencyCode: string) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    })
    const formatted = formatter.format(amount)
    return formatted
  }

  // Calcular preço total baseado na quantidade
  const calculateTotalPrice = (): number => {
    if (!checkoutData) return 0
    return checkoutData.convertedPrice * packageQuantity
  }

  // Verificar se a compra excede o limite
  const isPurchaseWithinLimit = (): boolean => {
    if (!purchaseLimit) return true // Se ainda está carregando, permite
    const totalPrice = calculateTotalPrice()
    return totalPrice <= purchaseLimit.remainingAmount
  }

  // Obter mensagem de erro de limite
  const getLimitErrorMessage = (): string => {
    if (!purchaseLimit) return ''
    const totalPrice = calculateTotalPrice()
    if (totalPrice > purchaseLimit.remainingAmount) {
      return `Esta compra excede seu limite disponível de R$ ${purchaseLimit.remainingAmount.toFixed(2)}. Você já possui R$ ${purchaseLimit.currentTotal.toFixed(2)} em pacotes.`
    }
    return ''
  }

  // Gerar opções de quantidade baseado no maxQuantity do pacote
  const generateQuantityOptions = (): number[] => {
    const packageId = searchParams.get('packageId')
    const pkg = packages.find(p => p.id === packageId)
    const maxQty = pkg?.maxQuantity || 50
    
    const options: number[] = []
    for (let i = 1; i <= maxQty; i++) {
      options.push(i)
    }
    return options
  }

  // Obter métodos de pagamento disponíveis
  const getAvailablePaymentMethods = () => {
    const methods: Array<{
      id: string
      name: string
      description: string
      icon: any
      color: string
      available: boolean
    }> = []

    // Saldo de Bônus - disponível para todas as moedas (primeira opção)
    methods.push({
      id: 'bonus',
      name: 'Saldo de Bônus',
      description: 'Use seu saldo disponível',
      icon: Wallet,
      color: 'bg-purple-500',
      available: true
    })

    // Crédito Minerador - disponível para todas as moedas
    methods.push({
      id: 'credito_minerador',
      name: 'Crédito Minerador',
      description: 'Peça para outro minerador pagar por você',
      icon: Users,
      color: 'bg-orange-500',
      available: true
    })

    // Stripe (cartão e checkout) - disponível para todas as moedas
    methods.push({
      id: 'stripe_card',
      name: 'Cartão de Crédito/Débito',
      description: 'Pagamento seguro',
      icon: CreditCard,
      color: 'bg-blue-500',
      available: true
    })

    /*
    methods.push({
      id: 'stripe_checkout',
      name: 'Checkout Stripe',
      description: 'Página de pagamento externa',
      icon: Shield,
      color: 'bg-green-500',
      available: true
    })
    */
   
    // PIX - apenas para BRL
    if (checkoutData.currency.toLowerCase() === 'brl') {
      methods.push({
        id: 'pix',
        name: 'PIX',
        description: 'Pagamento instantâneo',
        icon: QrCode,
        color: 'bg-green-600',
        available: true
      })
    }

    // Boleto - apenas para BRL
    if (checkoutData.currency.toLowerCase() === 'brl') {
      /*
      methods.push({
        id: 'boleto',
        name: 'Boleto Bancário',
        description: 'Pagamento em até 3 dias úteis',
        icon: Receipt,
        color: 'bg-yellow-500',
        available: true
      })
      */
    }

    return methods
  }

  // Verificar se o usuário está na blacklist para um recurso (usado no checkout)
  const checkBlacklistForPayment = async (
    resource: string,
    action: string
  ): Promise<{ blocked: boolean; reason?: string }> => {
    try {
      const res = await fetch(
        `/api/auth/me/blacklist/check?resource=${encodeURIComponent(resource)}&action=${encodeURIComponent(action)}`
      )
      const json = await res.json()
      if (!res.ok || !json.success) return { blocked: false }
      return { blocked: json.data.blocked, reason: json.data.reason ?? undefined }
    } catch {
      return { blocked: false }
    }
  }

  // Handlers de pagamento
  const handlePaymentSuccess = (paymentId?: string) => {
    // Payment ID pode ser usado para logs ou tracking futuro
    if (showPagarMeCardModal === true) {
      setShowPagarMeCardModal(false)
      setShowPaymentApprovedModal(true)
    } else {
      toast.success('Pagamento aprovado com sucesso!')
      router.push('/dashboard')
    }
  }

  const handlePaymentError = (error: string) => {
    toast.error(`Erro no pagamento: ${error}`)
  }

  const handlePaymentMethodSelect = async (methodId: string) => {
    // Validar limite antes de selecionar método
    if (!isPurchaseWithinLimit()) {
      toast.error(getLimitErrorMessage())
      return
    }
    // Verificar blacklist para pagamento com saldo bônus
    if (methodId === 'bonus') {
      const check = await checkBlacklistForPayment('pay_package_bonus', 'pay')
      if (check.blocked) {
        setBlacklistModalReason(check.reason || 'Você não está autorizado a pagar pacotes com saldo de bônus.')
        setShowBlacklistModal(true)
        return
      }
    }
    // Verificar blacklist para pagamento com crédito minerador
    if (methodId === 'credito_minerador') {
      const check = await checkBlacklistForPayment('pay_package_miner_credit', 'pay')
      if (check.blocked) {
        setBlacklistModalReason(check.reason || 'Você não está autorizado a usar crédito minerador para pacotes.')
        setShowBlacklistModal(true)
        return
      }
    }
    setSelectedPaymentMethod(methodId)
  }

  const handleOpenPaymentModal = async (
    modalType: 'stripe' | 'stripe_pix' | 'pagarme_card' | 'pix' | 'boleto' | 'bonus'
  ) => {
    // Validar limite antes de abrir modal
    if (!isPurchaseWithinLimit()) {
      toast.error(getLimitErrorMessage())
      return
    }
    // Verificar blacklist antes de abrir modal de bônus
    if (modalType === 'bonus') {
      const check = await checkBlacklistForPayment('pay_package_bonus', 'pay')
      if (check.blocked) {
        setBlacklistModalReason(check.reason || 'Você não está autorizado a pagar pacotes com saldo de bônus.')
        setShowBlacklistModal(true)
        return
      }
    }
    switch (modalType) {
      case 'stripe':
        setShowStripeModal(true)
        break
      case 'stripe_pix':
        setShowStripePixModal(true)
        break
      case 'pagarme_card':
        setShowPagarMeCardModal(true)
        break
      case 'pix':
        setShowPixModal(true)
        break
      case 'boleto':
        setShowBoletoModal(true)
        break
      case 'bonus':
        setShowBonusModal(true)
        break
    }
  }

  const handleOpenVoucherModal = async () => {
    if (!isPurchaseWithinLimit()) {
      toast.error(getLimitErrorMessage())
      return
    }
    const check = await checkBlacklistForPayment('pay_package_miner_credit', 'pay')
    if (check.blocked) {
      setBlacklistModalReason(check.reason || 'Você não está autorizado a usar crédito minerador para pacotes.')
      setShowBlacklistModal(true)
      return
    }
    setShowVoucherModal(true)
  }

  const paymentMethods = getAvailablePaymentMethods()
  const isSelectedMethodAvailable = paymentMethods.some(m => m.id === selectedPaymentMethod)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/cotas')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Pacotes
            </Button>

            {/* Seletor de moeda disponível para todos os usuários */}
            <CurrencySelector
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete seu pagamento de forma segura</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Coluna Principal - Métodos de Pagamento */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Métodos de Pagamento
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Escolha a forma de pagamento que preferir
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedPaymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodSelect(method.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${method.color}`}>
                        <method.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{method.name}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                      {selectedPaymentMethod === method.id && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}

              </CardContent>
            </Card>

            {/* Informações de Segurança 
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Pagamento Seguro</p>
                      <p className="text-gray-600">Seus dados são protegidos com criptografia SSL</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Ativação Imediata</p>
                      <p className="text-gray-600">Seu plano é ativado automaticamente após o pagamento</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Suporte 24/7</p>
                      <p className="text-gray-600">Nossa equipe está sempre disponível para ajudar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Garantia</p>
                      <p className="text-gray-600">100% de satisfação garantida</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>*/}
          </div>

          {/* Sidebar - Resumo do Pedido */}
          <div className="xl:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações do Pacote */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pacote:</span>
                    <span className="font-semibold">{checkoutData.packageName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Mineradora:</span>
                    <Select value={selectedMinerId} onValueChange={setSelectedMinerId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecione a mineradora" />
                      </SelectTrigger>
                      <SelectContent>
                        {miners.map((miner) => (
                          <SelectItem key={miner.id} value={miner.id}>
                            {miner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMiner && (
                    <p className="text-xs text-gray-500 text-right">
                      {selectedMiner.city}/{selectedMiner.state}
                    </p>
                  )}

                  {/* Dropdown de Quantidade */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Quantidade:</span>
                    <Select value={packageQuantity.toString()} onValueChange={(value) => setPackageQuantity(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generateQuantityOptions().map((quantity) => (
                          <SelectItem key={quantity} value={quantity.toString()}>
                            {quantity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor Unitário:</span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(checkoutData.convertedPrice, checkoutData.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Moeda:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {checkoutData.currency.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Informações do Usuário 
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Comprador:</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                  </div>
                </div>*/}

                <div className="border-t border-gray-200 my-4"></div>

                {/* Total */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotalPrice(), checkoutData.currency)}</span>
                  </div>
                </div>

                {/* Alerta de Limite de Compra - Apenas quando excedido */}
                {purchaseLimit && !isPurchaseWithinLimit() && (
                  <div className="pt-4 pb-2">
                    <Alert className="border-red-200 bg-red-50">
                      <AlertDescription className="text-sm">
                        <div className="space-y-1">
                          <p className="font-medium text-red-900">
                            ⚠️ Limite excedido!
                          </p>
                          <p className="text-red-700 text-xs">
                            {getLimitErrorMessage()}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Botão de Pagamento */}
                {selectedPaymentMethod && isSelectedMethodAvailable && (
                  <div className="pt-4">
                    {selectedPaymentMethod === 'bonus' && (
                      <Button
                        onClick={() => handleOpenPaymentModal('bonus')}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        size="lg"
                        disabled={!isPurchaseWithinLimit()}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Pagar com Bônus
                      </Button>
                    )}

                    {selectedPaymentMethod === 'credito_minerador' && (
                      <Button
                        onClick={() => handleOpenVoucherModal()}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        size="lg"
                        disabled={!isPurchaseWithinLimit()}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Gerar Código
                      </Button>
                    )}

                    {selectedPaymentMethod === 'stripe_checkout' && isPurchaseWithinLimit() && (
                      <StripeCheckoutButton
                        packageId={checkoutData.packageId}
                        packageName={checkoutData.packageName}
                        packagePrice={calculateTotalPrice()}
                        quantity={packageQuantity}
                        currency={checkoutData.currency}
                        className="w-full"
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                      />
                    )}

                    {selectedPaymentMethod === 'stripe_card' && (
                      <Button
                        onClick={() => {
                          // Se for BRL, usar Pagar.me; senão, usar Stripe
                          if (checkoutData.currency.toLowerCase() === 'brl') {
                            handleOpenPaymentModal('pagarme_card')
                          } else {
                            handleOpenPaymentModal('stripe')
                          }

                          //handleOpenPaymentModal('stripe')
                        }}
                        className="w-full"
                        size="lg"
                        disabled={!isPurchaseWithinLimit()}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar com Cartão
                      </Button>
                    )}

                    {selectedPaymentMethod === 'pix' && (
                      <Button
                        onClick={() => handleOpenPaymentModal('pix')}
                        className="w-full"
                        size="lg"
                        disabled={!isPurchaseWithinLimit()}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar PIX
                      </Button>
                    )}

                    {selectedPaymentMethod === 'boleto' && (
                      <Button
                        onClick={() => handleOpenPaymentModal('boleto')}
                        className="w-full"
                        size="lg"
                        disabled={!isPurchaseWithinLimit()}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Gerar Boleto
                      </Button>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modais de Pagamento */}
      {checkoutData && (
        <>
          {/* Modal informativo de blacklist */}
          <BlockedAccessModal
            isOpen={showBlacklistModal}
            onClose={() => setShowBlacklistModal(false)}
            reason={blacklistModalReason}
          />

          {/* Modal Bônus */}
          <BonusPaymentModal
            isOpen={showBonusModal}
            onClose={() => setShowBonusModal(false)}
            onSuccess={handlePaymentSuccess}
            packageId={checkoutData.packageId}
            packageName={checkoutData.packageName}
            packagePrice={checkoutData.packagePrice}
            quantity={packageQuantity}
            currency={'brl'}
            minerId={selectedMinerId}
          />

          {/* Modal Stripe Cartão */}
          <StripePaymentModal
            isOpen={showStripeModal}
            onClose={() => setShowStripeModal(false)}
            packageId={checkoutData.packageId}
            packageName={checkoutData.packageName}
            packagePrice={calculateTotalPrice()}
            quantity={packageQuantity}
            currency={checkoutData.currency}
            minerId={selectedMinerId}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          {/* Modal Stripe PIX */}
          <StripePixPaymentModal
            isOpen={showStripePixModal}
            onClose={() => setShowStripePixModal(false)}
            packageId={checkoutData.packageId}
            packageName={checkoutData.packageName}
            packagePrice={checkoutData.convertedPrice}
            quantity={packageQuantity}
            currency="brl"
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          {/* Modal Pagar.me Cartão */}
          <PagarMeCardPaymentModal
            isOpen={showPagarMeCardModal}
            onClose={() => setShowPagarMeCardModal(false)}
            packageId={checkoutData.packageId}
            packageName={checkoutData.packageName}
            packagePrice={checkoutData.convertedPrice}
            quantity={packageQuantity}
            currency={checkoutData.currency}
            minerId={selectedMinerId}
            onSuccess={handlePaymentSuccess}
          />

          {/* Modal PIX */}
          <PixPaymentModal
            isOpen={showPixModal}
            onClose={() => setShowPixModal(false)}
            onSuccess={handlePaymentSuccess}
            title={`Pagamento PIX - ${checkoutData.packageName}`}
            description={`Valor: ${formatCurrency(calculateTotalPrice(), checkoutData.currency)}`}
            amount={calculateTotalPrice()}
            items={[{
              id: checkoutData.packageId,
              name: checkoutData.packageName,
              price: checkoutData.convertedPrice,
              quantity: packageQuantity
            }]}
            apiEndpoint="/api/pagarme/charge"
            requestBody={{
              valor: calculateTotalPrice(),
              descricao: `Compra do pacote ${checkoutData.packageName}`,
              packageId: checkoutData.packageId,
              minerId: selectedMinerId,
              quantity: packageQuantity,
              expiracaoSegundos: 3600,
              informacoesAdicionais: [
                {
                  chave: 'usuario_id',
                  valor: user?.id || ''
                },
                {
                  chave: 'plan_id',
                  valor: checkoutData.packageId
                },
                {
                  chave: 'miner_id',
                  valor: selectedMinerId
                },
                {
                  chave: 'tipo_compra',
                  valor: 'pacote_individual'
                }
              ]
            }}
          />

          {/* Modal Boleto */}
          <BoletoPaymentModal
            isOpen={showBoletoModal}
            onClose={() => setShowBoletoModal(false)}
            onSuccess={() => setShowBoletoModal(false)}
            title={`Pagamento Boleto - ${checkoutData.packageName}`}
            description={`Valor: ${formatCurrency(calculateTotalPrice(), checkoutData.currency)}`}
            amount={calculateTotalPrice()}
            currency={checkoutData.currency}
            packageId={checkoutData.packageId}
            packageName={checkoutData.packageName}
            customerData={{
              email: user?.email || '',
              name: user?.name || '',
              phone: user?.phone || ''
            }}
          />

          {/* Modal Gerar Voucher */}
          <GenerateVoucherModal
            isOpen={showVoucherModal}
            onClose={() => setShowVoucherModal(false)}
            packageId={parseInt(checkoutData.packageId)}
            packageName={checkoutData.packageName}
            packagePrice={checkoutData.convertedPrice}
            quantity={packageQuantity}
            minerId={Number(selectedMinerId)}
          />

          {/* Modal de Confirmação de Pagamento Aprovado (Pagar.me) */}
          <Dialog open={showPaymentApprovedModal} onOpenChange={setShowPaymentApprovedModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pagamento aprovado</DialogTitle>
                <DialogDescription>
                  Seu pagamento foi aprovado com sucesso. Em breve o pacote {checkoutData.packageName} estará disponível.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setShowPaymentApprovedModal(false)
                    router.push('/dashboard/minhas-cotas')
                  }}
                >
                  Ir para Minhas Cotas
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

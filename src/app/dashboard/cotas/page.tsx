'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCurrencyConversion } from '@/lib/hooks/useCurrencyConversion'
import { formatCurrencyValue, getCurrencySymbol } from '@/lib/currency-utils'
import { toast } from 'sonner'
import { CheckCircle, XCircle, CreditCard, Globe, AlertTriangle, RefreshCw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import CurrencySelector from '@/components/CurrencySelector'

interface UnilevelPlan {
  id: string
  name: string
  slug: string | null
  price: number
  points: number
  directBonus: number
  profitSharePercent: number
  percentExtra: number
  reactivationAmount: number
  reactivationBonus: number
  isActive: boolean
  visibleOnlyForActiveUsers: boolean
  features: string[]
  isPopular?: boolean
  isCurrentPackage?: boolean
}

interface UserActivePackage {
  id: number
  name: string
  price: number
  isActive: boolean
  activatedAt: string
  expiresAt: string | null
  package: {
    id: number
    name: string
    price: number
    points: number
    directBonus: number
    profitSharePercent: number
    reactivationAmount: number
    reactivationBonus: number
  }
}

interface MinerOption {
  id: string
  name: string
  city: string
  state: string
}

export default function PacotesPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [plans, setPlans] = useState<UnilevelPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [minersLoading, setMinersLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState('brl')
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({})
  const [userActivePackage, setUserActivePackage] = useState<UserActivePackage | null>(null)
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [selectedMinerId, setSelectedMinerId] = useState('')
  const { convertCurrency, convertedPrice, isLoading: conversionLoading } = useCurrencyConversion()

  const router = useRouter()

  // Retorna true se o plano deve ser exibido para o usuário atual
  const shouldShowPlan = useCallback((plan: UnilevelPlan): boolean => {
    if (!plan.visibleOnlyForActiveUsers) return true
    return userActivePackage !== null
  }, [userActivePackage])

  const loadPlans = useCallback(async () => {
    if (!selectedMinerId) {
      setPlans([])
      setPlansLoading(false)
      return
    }

    try {
      setPlansLoading(true)

      const response = await fetch(`/api/unilevel/packages?isActive=true&minerId=${selectedMinerId}`)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar planos')
      }

      if (data.success && data.data) {
        // Mapear os dados do banco para o formato esperado
        const formattedPlans: UnilevelPlan[] = data.data.map((pkg: any, index: number) => {
          const percentExtraValue = pkg.percentExtra !== null && pkg.percentExtra !== undefined 
            ? Number(pkg.percentExtra) 
            : 0
          
          return {
            id: pkg.id.toString(),
            name: pkg.name,
            slug: pkg.slug ?? null,
            price: Number(pkg.price),
            points: Number(pkg.points),
            directBonus: Number(pkg.directBonus),
            profitSharePercent: Number(pkg.profitSharePercent),
            percentExtra: percentExtraValue,
            reactivationAmount: Number(pkg.reactivationAmount),
            reactivationBonus: Number(pkg.reactivationBonus),
            isActive: pkg.isActive,
            visibleOnlyForActiveUsers: pkg.visibleOnlyForActiveUsers ?? false,
          // Gerar features baseadas nos dados do pacote unilevel
          features: [
            `Investimento de R$${Number(pkg.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `${Number(pkg.points)} pontos na rede`,
            `Bônus de indicação direta: R$ ${Number(pkg.directBonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `Participação nos lucros: ${Number(pkg.profitSharePercent)}% ao mês`,
            `Reativação: R$ ${Number(pkg.reactivationAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `Bônus de reativação: R$ ${Number(pkg.reactivationBonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          ],
          // Marcar o segundo plano como popular (se existir)
          isPopular: index === 1
          }
        })

        setPlans(formattedPlans)
      } else {
        throw new Error('Dados inválidos retornados pela API')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar planos unilevel:', error)
      toast.error('Erro ao carregar planos', {
        description: 'Tente novamente ou entre em contato com o suporte.',
        icon: <XCircle className="w-5 h-5" />
      })
    } finally {
      setPlansLoading(false)
    }
  }, [selectedMinerId])

  const loadMiners = useCallback(async () => {
    try {
      setMinersLoading(true)
      const response = await fetch('/api/miners')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar mineradoras')
      }

      if (data.success && data.data) {
        setMiners(data.data)
      } else {
        throw new Error('Dados inválidos retornados pela API de mineradoras')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setMinersLoading(false)
    }
  }, [])

  const loadUserActivePackage = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/unilevel/active-package?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.hasActivePackage && data.data && data.data.length > 0) {
          const activePackage = data.data[0]
          setUserActivePackage(activePackage)

          // Adicionar propriedade isCurrentPackage em cada plano
          setPlans(prevPlans => prevPlans.map(plan => ({
            ...plan,
            isCurrentPackage: plan.id === activePackage.package.id.toString()
          })))
        } else {
          setUserActivePackage(null)
          // Remover propriedade isCurrentPackage de todos os planos
          setPlans(prevPlans => prevPlans.map(plan => ({
            ...plan,
            isCurrentPackage: false
          })))
        }
      } else {
        console.error('❌ Erro ao buscar pacote ativo:', response.status)
        setUserActivePackage(null)
        setPlans(prevPlans => prevPlans.map(plan => ({
          ...plan,
          isCurrentPackage: false
        })))
      }
    } catch (error) {
      console.error('❌ Erro ao buscar pacote ativo:', error)
      setUserActivePackage(null)
      setPlans(prevPlans => prevPlans.map(plan => ({
        ...plan,
        isCurrentPackage: false
      })))
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserActivePackage()
      loadMiners()
    }
  }, [isAuthenticated, user, loadMiners, loadUserActivePackage])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPlans()
    }
  }, [isAuthenticated, user, loadPlans])

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

  // Converter preços quando a moeda mudar
  useEffect(() => {
    const convertAllPrices = async () => {
      if (plans.length > 0) {
        const newConvertedPrices: Record<string, number> = {}

        for (const plan of plans) {
          if (selectedCurrency === 'brl') {
            newConvertedPrices[plan.id] = plan.price
          } else {
            try {
              const response = await fetch(
                `/api/currency/convert?packageId=${plan.id}&to=${selectedCurrency}`
              )
              const result = await response.json()

              if (result.success) {
                newConvertedPrices[plan.id] = result.data.convertedAmount
              } else {
                newConvertedPrices[plan.id] = plan.price
              }
            } catch (error) {
              console.error('Erro ao converter preço:', error)
              newConvertedPrices[plan.id] = plan.price
            }
          }
        }

        setConvertedPrices(newConvertedPrices)
      }
    }

    convertAllPrices()
  }, [selectedCurrency, plans])



  // Função para verificar se um plano deve ser desabilitado
  const isPlanDisabled = (plan: UnilevelPlan): boolean => {
    if (!userActivePackage) return false

    // Se é o plano atual, não deve ser desabilitado
    if (plan.isCurrentPackage) return false

    const planConvertedPrice = convertedPrices[plan.id] || plan.price
    const userPackageConvertedPrice = selectedCurrency === 'brl'
      ? userActivePackage.price
      : convertedPrices[userActivePackage.package.id.toString()] || userActivePackage.price

    return planConvertedPrice <= userPackageConvertedPrice
  }

  // Função para obter a classe do botão baseado no status do plano
  const getButtonClass = (plan: UnilevelPlan): string => {
    /*
    if (!userActivePackage) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base'
    }

    if (plan.isCurrentPackage) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-green-600 text-white cursor-default text-sm sm:text-base'
    }

    if (isPlanDisabled(plan)) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-gray-400 text-gray-600 cursor-not-allowed text-sm sm:text-base'
    }*/

    //return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base'
    return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base'
  }

  // Função para obter o texto do botão baseado no status do usuário e plano
  const getButtonText = (plan: UnilevelPlan): string => {
    /*
    if (!userActivePackage) {
      return 'Comprar Agora'
    }

    if (plan.isCurrentPackage) {
      return 'Seu Plano Atual'
    }

    if (isPlanDisabled(plan)) {
      return 'Plano Antigo'
    }*/

    return 'Comprar'
  }

  // Função para obter o ícone do botão
  const getButtonIcon = (plan: UnilevelPlan) => {
    /*
    if (!userActivePackage) {
      return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
    }

    if (plan.isCurrentPackage) {
      return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
    }

    if (isPlanDisabled(plan)) {
      return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
    }*/

    return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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

  // Se está carregando cotas
  if (plansLoading || minersLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Carregando cotas e mineradoras...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">💎 Cotas</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Selecione a cota que melhor se adequa aos seus objetivos
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <CurrencySelector
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            />
            <a
              href="/dashboard/minhas-cotas"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              📦 Minhas Cotas
            </a>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Selecione a mineradora</p>
        <Select value={selectedMinerId} onValueChange={setSelectedMinerId}>
          <SelectTrigger className="max-w-md">
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

      {/* Plans Grid */}
      {!selectedMinerId ? (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 border border-gray-200 text-center">
          <div className="text-4xl sm:text-6xl mb-4">🏭</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Escolha uma mineradora</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Selecione a mineradora para visualizar os pacotes disponíveis.
          </p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 border border-gray-200 text-center">
          <div className="text-4xl sm:text-6xl mb-4">📦</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Nenhuma cota disponível</h3>
          <p className="text-sm sm:text-base text-gray-600">
            No momento não há cotas ativas disponíveis. Tente novamente mais tarde.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {plans.filter(plan => shouldShowPlan(plan)).map((plan) => {
            return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-sm p-4 sm:p-6 border transition-all duration-300 hover:scale-105 hover:shadow-lg ${plan.isPopular
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                  {formatCurrencyValue(convertedPrices[plan.id] || plan.price, selectedCurrency)}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm mb-2">
                  {plan.points} pontos • Sistema Unilevel
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-2 sm:p-3 border border-purple-200 mb-2">
                  <div className="text-xs sm:text-sm text-gray-700 mb-1">Participação nos Lucros</div>
                  <div className="text-lg sm:text-xl font-bold text-purple-600">
                    {plan.profitSharePercent}% ao mês
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2 sm:p-3 border border-green-200">
                  <div className="text-xs sm:text-sm text-gray-700 mb-1">Bônus Direto</div>
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    R$ {plan.directBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600">
                    Por indicação direta
                  </div>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <h4 className="font-semibold mb-2 sm:mb-3 text-gray-800 text-sm sm:text-base">Características:</h4>
                <ul className="space-y-1 sm:space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2 text-xs sm:text-sm">
                      <span className="text-green-600 mt-0.5 sm:mt-1 flex-shrink-0">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <div className="space-y-2">
                  {/* Tarja de percentExtra */}
                  {plan.percentExtra > 0 && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-3 sm:p-4 mb-3 shadow-md">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg sm:text-x font-bold">
                          +{plan.percentExtra}% extra para a primeira divisão de lucro
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      router.push(`/dashboard/checkout?packageId=${plan.id}&minerId=${selectedMinerId}`)
                    }}
                    //disabled={isPlanDisabled(plan) || plan.isCurrentPackage}
                    disabled={false}
                    className={getButtonClass(plan)}
                  >
                    {getButtonIcon(plan)}
                    <span className="hidden sm:inline">{getButtonText(plan)}</span>
                    <span className="sm:hidden">
                      {getButtonText(plan).length > 10 ? getButtonText(plan).substring(0, 10) + '...' : getButtonText(plan)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )
          })}
        </div>
      )}


      {/* Seção explicativa sobre manutenção mensal */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-4 sm:p-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row items-center justify-center mb-4 space-y-2 sm:space-y-0 sm:space-x-3">
          <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h3 className="text-lg sm:text-xl font-bold text-blue-900 text-center sm:text-left">🔄 Manutenção Mensal</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">📅 Quando acontece?</h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              A manutenção mensal é cobrada automaticamente somente após você receber divisões de lucro que somem o dobro do valor da manutenção. Isso garante que você tenha tempo para se familiarizar com o sistema e receber benefícios antes de qualquer cobrança.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">💰 Por que é necessária?</h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              A manutenção mensal mantém seu plano ativo, garantindo que você continue recebendo divisões de lucros, bônus de indicação e todos os benefícios do sistema.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">🎁 Bônus na manutenção</h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Quando você paga a manutenção, todos os membros da sua linha ascendente (até a 7ª geração) recebem bônus, criando um sistema de recompensas para toda a rede.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">✅ Benefícios mantidos</h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Com a manutenção em dia, você mantém acesso a todos os benefícios: divisões de lucro, bônus de indicação, suporte especializado e dashboard completo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
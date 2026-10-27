'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCurrencyConversion } from '@/lib/hooks/useCurrencyConversion'
import { formatCurrencyValue, getCurrencySymbol } from '@/lib/currency-utils'
import { toast } from 'sonner'
import { CheckCircle, XCircle, CreditCard, Globe, AlertTriangle, Users, RefreshCw, Gift } from 'lucide-react'

import CurrencySelector from '@/components/CurrencySelector'

interface Plan {
  id: string
  name: string
  price: number
  description?: string
  points: number
  cycleBonus: number
  dailyCycles: number
  totalCycles: number
  profitSharePercent: number
  binaryBonusPercent: number
  binaryBonusDailyLimit: number
  isActive: boolean
  features: string[]
  isPopular?: boolean
  isCurrentPackage?: boolean
  // Novos campos para sistema unilevel
  isUnilevel?: boolean
  directBonus?: number
  reactivationAmount?: number
  reactivationBonus?: number
}

interface UserActivePackage {
  id: number
  name: string
  price: number
  isActive: boolean
  activatedAt: string
  expiresAt: string | null
  completedCycles: number
  package: {
    id: number
    name: string
    description: string | null
    price: number
    points: number
    cycleBonus: number
    dailyCycles: number
    totalCycles: number
    profitSharePercent: number
    binaryBonusPercent: number
    binaryBonusDailyLimit: number
    isUnilevel?: boolean
    directBonus?: number
    reactivationAmount?: number
    reactivationBonus?: number
  }
}

export default function PlanosPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState('brl')
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({})
  const [userActivePackage, setUserActivePackage] = useState<UserActivePackage | null>(null)
  const { convertCurrency, convertedPrice, isLoading: conversionLoading } = useCurrencyConversion()

  const router = useRouter()

  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true)
      const response = await fetch('/api/unilevel/packages?isActive=true')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar planos')
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        const formattedPlans: Plan[] = data.data.map((pkg: any, index: number) => {
          const isUnilevel = pkg.isUnilevel || false

          // Gerar features baseadas no tipo de plano
          const features: string[] = [
            `Investimento de R$${Number(pkg.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `${Number(pkg.points)} pontos na rede`,
            `Participação nos lucros: ${Number(pkg.profitSharePercent)}% ao mês`,
            `Bônus de indicação direta: R$${Number(pkg.directBonus || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `Bônus indireto: Até a 7ª geração`,
            `Manutenção mensal: R$${Number(pkg.reactivationAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `Bônus na manutenção: R$${Number(pkg.reactivationBonus || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} até a 7ª geração`,
            'Acesso ao dashboard completo',
            'Suporte especializado',
            ...(pkg.description ? [pkg.description] : [])
          ]

          return {
            id: pkg.id.toString(),
            name: pkg.name,
            price: Number(pkg.price),
            description: pkg.description,
            points: Number(pkg.points),
            cycleBonus: Number(pkg.cycleBonus),
            dailyCycles: Number(pkg.dailyCycles),
            totalCycles: Number(pkg.totalCycles),
            profitSharePercent: Number(pkg.profitSharePercent),
            binaryBonusPercent: Number(pkg.binaryBonusPercent),
            binaryBonusDailyLimit: Number(pkg.binaryBonusDailyLimit),
            isActive: pkg.isActive,
            isUnilevel: isUnilevel,
            directBonus: Number(pkg.directBonus || 0),
            reactivationAmount: Number(pkg.reactivationAmount || 0),
            reactivationBonus: Number(pkg.reactivationBonus || 0),
            features,
            // Marcar o segundo plano como popular (se existir)
            isPopular: index === 1
          }
        })

        setPlans(formattedPlans)
      } else {
        throw new Error('Dados inválidos retornados pela API')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos', {
        description: 'Tente novamente ou entre em contato com o suporte.',
        icon: <XCircle className="w-5 h-5" />
      })
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const loadUserActivePackage = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/business/active-package?userId=${user.id}`)

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
      loadPlans().then(() => {
        loadUserActivePackage()
      })
    }
  }, [isAuthenticated, user, loadPlans, loadUserActivePackage])

  // Carregar moeda do localStorage ao montar o componente
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency')
    if (savedCurrency) {
      setSelectedCurrency(savedCurrency)
    }
  }, [])

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
  const isPlanDisabled = (plan: Plan): boolean => {
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
  const getButtonClass = (plan: Plan): string => {
    if (!userActivePackage) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white'
    }

    if (plan.isCurrentPackage) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-green-600 text-white cursor-default'
    }

    if (isPlanDisabled(plan)) {
      return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-gray-400 text-gray-600 cursor-not-allowed'
    }

    return 'w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white'
  }

  // Função para obter o texto do botão baseado no status do usuário e plano
  const getButtonText = (plan: Plan): string => {
    if (!userActivePackage) {
      return 'Comprar Agora'
    }

    if (plan.isCurrentPackage) {
      return 'Seu Plano Atual'
    }

    if (isPlanDisabled(plan)) {
      return 'Plano Antigo'
    }

    return 'Fazer Upgrade'
  }

  // Função para obter o ícone do botão
  const getButtonIcon = (plan: Plan) => {
    if (!userActivePackage) {
      return <CreditCard className="w-5 h-5 mr-2" />
    }

    if (plan.isCurrentPackage) {
      return <CheckCircle className="w-5 h-5 mr-2" />
    }

    if (isPlanDisabled(plan)) {
      return <XCircle className="w-5 h-5 mr-2" />
    }

    return <CreditCard className="w-5 h-5 mr-2" />
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

  // Se está carregando planos
  if (plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💎 Planos de Mineração</h1>
            <p className="text-gray-600">
              Selecione o plano que melhor se adequa aos seus objetivos de investimento
            </p>
          </div>
          <div className="text-right space-x-3 flex items-center gap-4">
            <CurrencySelector
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            />
            <a
              href="/dashboard/meus-planos"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              📦 Meus Planos
            </a>
          </div>
        </div>

        {/* Informação do pacote atual do usuário */}
        {userActivePackage && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="text-sm text-blue-700 font-medium">Seu Plano Atual</div>
                  <div className="text-lg font-bold text-blue-900">
                    {userActivePackage.name} - {formatCurrencyValue(userActivePackage.price, selectedCurrency)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-600">Ativado em</div>
                <div className="text-sm font-medium text-blue-800">
                  {new Date(userActivePackage.activatedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum plano disponível</h3>
          <p className="text-gray-600">
            No momento não há planos ativos disponíveis. Tente novamente mais tarde.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl shadow-sm p-6 border transition-all duration-300 hover:scale-105 hover:shadow-lg ${plan.isPopular
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatCurrencyValue(convertedPrices[plan.id] || plan.price, selectedCurrency)}
                </div>
                <div className="text-gray-600 text-sm mb-2">
                  {plan.points} pontos
                </div>

                {/* Sistema Unilevel */}
                {plan.isUnilevel ? (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-sm text-gray-700 mb-1">Participação nos Lucros</div>
                      <div className="text-xl font-bold text-purple-600">
                        {plan.profitSharePercent}%
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                      <div className="text-sm text-gray-700 mb-1">Bônus de Indicação Direta</div>
                      <div className="text-xl font-bold text-green-600">
                        R$ {plan.directBonus?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Sistema Binário */
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-sm text-gray-700 mb-1">Participação nos Lucros</div>
                      <div className="text-xl font-bold text-purple-600">
                        {plan.profitSharePercent}% ao mês
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                      <div className="text-sm text-gray-700 mb-1">Bônus Binário</div>
                      <div className="text-xl font-bold text-green-600">
                        {plan.binaryBonusPercent}% diário
                      </div>
                      <div className="text-xs text-gray-600">
                        Limite: R$ {(plan.binaryBonusDailyLimit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <div className="space-y-2">



                  <button
                    onClick={() => {
                      if (!isPlanDisabled(plan) && !plan.isCurrentPackage) {
                        router.push(`/dashboard/checkout?packageId=${plan.id}`)
                      }
                    }}
                    disabled={isPlanDisabled(plan) || plan.isCurrentPackage}
                    className={getButtonClass(plan)}
                  >
                    {getButtonIcon(plan)}
                    {getButtonText(plan)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Seção explicativa sobre manutenção mensal */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-200">
        <div className="flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-blue-600 mr-3" />
          <h3 className="text-xl font-bold text-blue-900">🔄 Manutenção Mensal</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">📅 Quando acontece?</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              A manutenção mensal é cobrada automaticamente somente após você receber divisões de lucro que somem o dobro do valor da manutenção. Isso garante que você tenha tempo para se familiarizar com o sistema e receber benefícios antes de qualquer cobrança.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">💰 Por que é necessária?</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              A manutenção mensal mantém seu plano ativo, garantindo que você continue recebendo divisões de lucros, bônus de indicação e todos os benefícios do sistema.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">🎁 Bônus na manutenção</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Quando você paga a manutenção, todos os membros da sua linha ascendente (até a 7ª geração) recebem bônus, criando um sistema de recompensas para toda a rede.
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">✅ Benefícios mantidos</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Com a manutenção em dia, você mantém acesso a todos os benefícios: divisões de lucro, bônus de indicação, suporte especializado e dashboard completo.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
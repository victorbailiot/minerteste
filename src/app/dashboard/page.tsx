'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import InactiveUserAlert from '@/components/InactiveUserAlert'
import Clube300Card from '@/components/Clube300Card'
import ScheduledProfitShare from '@/components/ScheduledProfitShare'
import { useRouter } from 'next/navigation'
import { Ticket, Calendar } from 'lucide-react'

// Função para obter o código de indicação do usuário
const getReferralCode = (user: any): string => {
  return user.referralCode || String(user.id).padStart(6, '0')
}

interface ActivePackage {
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
  }
}

interface CurrentCareer {
  id: number
  name: string
  indirectBonusLevels: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: number
  graduatedAt: string
  pinImageUrl?: string | null
}

interface UserCoupon {
  id: string
  promotionId: string
  luckyNumber: number
  createdAt: string
  promotion: {
    id: string
    title: string
    description: string | null
    image: string | null
    startDate: string
    endDate: string
    isActive: boolean
  }
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [activePackages, setActivePackages] = useState<ActivePackage[]>([])
  const [hasActivePackage, setHasActivePackage] = useState(false)
  const [referralCode, setReferralCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [preferredSide, setPreferredSide] = useState<string | null>(null)
  const [updatingSide, setUpdatingSide] = useState(false)
  const [isUserActiveStatus, setIsUserActiveStatus] = useState<boolean>(true)
  const [checkingUserStatus, setCheckingUserStatus] = useState(true)
  const [showInactiveAlert, setShowInactiveAlert] = useState(false)
  const [currentCareer, setCurrentCareer] = useState<CurrentCareer | null>(null)
  const [userCoupon, setUserCoupon] = useState<UserCoupon | null>(null)

  // Verificar status ativo do usuário
  const checkUserActiveStatus = useCallback(async () => {
    if (!user) return

    try {
      setCheckingUserStatus(true)
      const response = await fetch(`/api/auth/user-status?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsUserActiveStatus(data.data.isActive)
          setShowInactiveAlert(!data.data.isActive)
        }
      } else {
        console.error('❌ Erro ao verificar status do usuário:', response.status)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status do usuário:', error)
    } finally {
      setCheckingUserStatus(false)
    }
  }, [user])

  // Buscar pacotes ativos do usuário
  const fetchActivePackage = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/business/active-package?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.hasActivePackage && data.data) {
          setActivePackages(data.data)
          setHasActivePackage(true)
        } else {
          setActivePackages([])
          setHasActivePackage(false)
        }
      } else {
        console.error('❌ Erro ao buscar pacotes ativos:', response.status)
        toast.error('Erro ao carregar pacotes ativos')
        setActivePackages([])
        setHasActivePackage(false)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar pacotes ativos:', error)
      toast.error('Erro ao carregar pacotes ativos')
      setActivePackages([])
      setHasActivePackage(false)
    }
  }, [user])

  // Buscar código de indicação do usuário
  const fetchReferralCode = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/auth/referral-code?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.referralCode) {
          setReferralCode(data.referralCode)
        } else {
          // Fallback para o código gerado localmente
          setReferralCode(getReferralCode(user))
        }
      } else {
        console.error('❌ Erro ao buscar código de indicação:', response.status)
        // Fallback para o código gerado localmente
        setReferralCode(getReferralCode(user))
      }
    } catch (error) {
      console.error('❌ Erro ao buscar código de indicação:', error)
      // Fallback para o código gerado localmente
      setReferralCode(getReferralCode(user))
    }
  }, [user])

  // Buscar último patamar (nível de carreira) alcançado
  const fetchCurrentCareer = useCallback(async () => {
    try {
      const response = await fetch('/api/career/progression', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.currentCareer) {
          setCurrentCareer(result.data.currentCareer as CurrentCareer)
        } else {
          setCurrentCareer(null)
        }
      } else {
        setCurrentCareer(null)
      }
    } catch (error) {
      setCurrentCareer(null)
    }
  }, [])

  // Buscar cupons do usuário
  const fetchUserCoupons = useCallback(async () => {
    try {
      const response = await fetch('/api/user/coupons')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          // Pegar o cupom mais recente
          const latestCoupon = result.data[0] as UserCoupon
          setUserCoupon(latestCoupon)
        } else {
          setUserCoupon(null)
        }
      } else {
        setUserCoupon(null)
      }
    } catch (error) {
      console.error('Erro ao buscar cupons:', error)
      setUserCoupon(null)
    }
  }, [])

  useEffect(() => {
    if (user && isAuthenticated) {
      Promise.all([
        checkUserActiveStatus(),
        fetchActivePackage(),
        fetchReferralCode(),
        fetchCurrentCareer(),
        fetchUserCoupons(),
      ]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, isAuthenticated, checkUserActiveStatus, fetchActivePackage, fetchReferralCode, fetchCurrentCareer, fetchUserCoupons])

  // Função para copiar o código de indicação
  const copyReferralCode = async () => {
    const textToCopy = `${window.location.origin}/?invite=${referralCode}`
    
    try {
      // Verificar se a API do clipboard está disponível
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        toast.success('Código copiado para a área de transferência!')
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback para navegadores que não suportam a API moderna
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          setCopied(true)
          toast.success('Código copiado para a área de transferência!')
          setTimeout(() => setCopied(false), 2000)
        } catch (fallbackError) {
          console.error('Erro no fallback de cópia:', fallbackError)
          toast.error('Erro ao copiar código. Tente selecionar e copiar manualmente.')
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Erro ao copiar código:', error)
      toast.error('Erro ao copiar código')
    }
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        {/* Alerta de usuário inativo */}
        {!checkingUserStatus && showInactiveAlert && activePackages.length > 0 && (
          <InactiveUserAlert
            onClose={() => setShowInactiveAlert(false)}
          />
        )}

        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Bem-vindo, {user.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Aqui está um resumo da sua conta e atividades recentes.
          </p>
          {checkingUserStatus && (
            <div className="mt-3 flex items-center text-xs sm:text-sm text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Verificando status da conta...
            </div>
          )}
          {!checkingUserStatus && !isUserActiveStatus && activePackages.length > 0 && (
            <div className="mt-3 flex items-center text-xs sm:text-sm text-red-600">
              <span className="mr-2">⚠️</span>
              <span className="break-words">Conta inativa - Reative para continuar recebendo bônus</span>
            </div>
          )}
          {!checkingUserStatus && isUserActiveStatus && (
            <div className="mt-3 flex items-center text-xs sm:text-sm text-green-600">
              <span className="mr-2">✅</span>
              Conta ativa
            </div>
          )}
        </div>

        {/* Agendamento de Divisão de Lucro */}
        <ScheduledProfitShare />

        {/* Cupom Card */}
        {userCoupon && (
          <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl shadow-lg p-4 sm:p-6 border-2 border-green-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Ticket className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                    {userCoupon.promotion.title}
                  </h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                      <span className="text-white text-xs sm:text-sm font-medium">Número da Sorte:</span>
                      <span className="text-white text-lg sm:text-xl font-bold ml-2">
                        {userCoupon.luckyNumber.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-white/90 text-xs sm:text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Promoção até {new Date(userCoupon.promotion.endDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/cupons?id=${userCoupon.promotionId}`)}
                className="px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm sm:text-base shadow-lg w-full sm:w-auto"
              >
                Acessar Campanha
              </button>
            </div>
          </div>
        )}

        {/* Último Patamar de Carreira */}
        {currentCareer && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex items-center justify-center ${currentCareer.pinImageUrl ? '' : 'bg-gradient-to-br from-yellow-500 to-amber-600'}`}>
                  {currentCareer.pinImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentCareer.pinImageUrl} alt={currentCareer.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg sm:text-xl text-white">🏆</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Último Patamar Alcançado</h3>
                  <p className="text-sm sm:text-base font-bold text-gray-900">{currentCareer.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Graduado em {new Date(currentCareer.graduatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <a
                href="/dashboard/carreira"
                className="mt-3 sm:mt-0 inline-flex items-center justify-center px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors w-full sm:w-auto"
              >
                Ver carreira
              </a>
            </div>
          </div>
        )}

        {/* Clube dos 300 Card */}
        <Clube300Card />

        {/* Plano Atual Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Sua última cota adquirida</h3>
            <a
              href="/dashboard/minhas-cotas"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              📦 Minhas Cotas
            </a>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3"></div>
              <span className="text-gray-600 text-sm sm:text-base">Carregando plano...</span>
            </div>
          ) : hasActivePackage ? (
            <div className="space-y-4">
              {activePackages.map((pkg, index) => (
                <div key={pkg.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base sm:text-lg">💎</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg sm:text-xl font-bold text-blue-900 truncate">{pkg.name}</h4>
                      <p className="text-xs sm:text-sm text-blue-600">
                        Plano ativo desde {new Date(pkg.activatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-medium text-sm">Ativo</span>
                    </div>
                    {pkg.expiresAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expira em {new Date(pkg.expiresAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-600 text-lg sm:text-xl">⚠️</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base sm:text-lg font-semibold text-yellow-800">Nenhum plano ativo</h4>
                <p className="text-sm sm:text-base text-yellow-700">
                  Você ainda não possui um plano ativo. Adquira um plano para começar a ganhar!
                </p>
              </div>
              <a 
                href="/dashboard/cotas" 
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium w-full sm:w-auto text-center"
              >
                Ver Cotas
              </a>
            </div>
          )}
        </div>

        {/* Referral Code Section */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3"></div>
              <span className="text-gray-600 text-sm sm:text-base">Verificando pacotes...</span>
            </div>
          </div>
        ) : hasActivePackage ? (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Seu link de Indicação</h3>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200 min-w-0">
                <code className="text-sm sm:text-lg font-mono text-gray-900 break-all">
                  {`${window.location.origin}/?invite=${referralCode}`}
                </code>
              </div>
              <button
                onClick={copyReferralCode}
                className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm w-full sm:w-auto ${
                  copied 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar'}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Compartilhe este código com seus amigos para ganhar bônus de indicação!
            </p>
          </div>
        ) : (
          <></>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Conta criada com sucesso</p>
                  <p className="text-xs sm:text-sm text-gray-500">Bem-vindo ao MinerStone!</p>
                </div>
              </div>
              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">Hoje</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
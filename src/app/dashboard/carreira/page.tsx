'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useState, useCallback } from 'react'
import { Trophy, Target, Users, TrendingUp, Star, Award, Crown, Gem, Diamond, Zap, RefreshCw, DollarSign, Gift } from 'lucide-react'
import CareerPrizes from '@/components/CareerPrizes'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface DirectsRequirement {
  requiredDirects: number
  currentDirectsWithPackage: number
  isSatisfied: boolean
}

interface CareerLevel {
  id: number
  name: string
  requiredPoints: number
  requiredDirects?: number
  maxTeamVolumePercent: number
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: number
  travelBonus?: string
  travelValue?: number
  careerBonusAmount?: number
  careerPrizeDescription?: string
  careerPrizeValue?: number
  hasPrizeChoice?: boolean
  pinImageUrl?: string | null
  isCurrentLevel: boolean
  isNextLevel: boolean
  directsRequirement?: DirectsRequirement
  legRequirements?: Array<{
    legSlot: number
    requiredCareerId: number
    requiredCareerName: string
    includeIndirects: boolean
    minOccurrences: number
    isSatisfied?: boolean
    satisfiedCount?: number
  }>
}

interface CurrentCareer {
  id: number
  name: string
  indirectBonusLevels: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: number
  graduatedAt: string
  hasPrizeChoice?: boolean
  careerPrizeValue?: number
  careerPrizeDescription?: string
  prizeChoice?: 'PHYSICAL' | 'CASH' | null
}

interface ProgressToNext {
  currentValidPoints: number
  requiredPoints: number
  additionalPointsNeeded: number
  progressPercent: number
  maxTeamVolumePercent: number
}

interface DirectReferral {
  id: number
  userId: number
  name: string
  email: string
  referralCode?: string
  totalPoints: number
  validPointsForNextLevel: number
}

interface CareerPrize {
  id: string
  type: 'CAREER_BONUS' | 'CAREER_PRIZE'
  amount: number
  description: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  createdAt: string
}

interface CareerData {
  currentCareer: CurrentCareer | null
  careerHistory: any[]
  allCareerLevels: CareerLevel[]
  nextLevel: CareerLevel | null
  progressToNext: ProgressToNext | null
  userStats: {
    totalPoints: number
    networkPoints: number
    ownPoints: number
    teamVolume: number
    directReferralsCount: number
    pointsNeedsRecalc?: boolean
    pointsLastUpdated?: string
  }
  directReferrals: DirectReferral[]
}

// Ícones para cada nível de carreira (fallback quando não houver imagem)
const getCareerIcon = (levelName: string) => {
  const icons = {
    'Quartzo': <Gem className="w-6 h-6" />,
    'Cobre': <Target className="w-6 h-6" />,
    'Ferro': <TrendingUp className="w-6 h-6" />,
    'Prata': <Star className="w-6 h-6" />,
    'Ouro': <Award className="w-6 h-6" />,
    'Diamante': <Diamond className="w-6 h-6" />,
    'Esmeralda': <Crown className="w-6 h-6" />
  }
  return icons[levelName as keyof typeof icons] || <Trophy className="w-6 h-6" />
}

// Cores para cada nível
const getCareerColors = (levelName: string) => {
  const colors = {
    'Quartzo': {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      accent: 'bg-gray-500',
      progress: 'bg-gray-400'
    },
    'Cobre': {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      accent: 'bg-orange-500',
      progress: 'bg-orange-400'
    },
    'Ferro': {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      accent: 'bg-slate-500',
      progress: 'bg-slate-400'
    },
    'Prata': {
      bg: 'bg-silver-50',
      border: 'border-silver-200',
      text: 'text-silver-700',
      accent: 'bg-silver-500',
      progress: 'bg-silver-400'
    },
    'Ouro': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      accent: 'bg-yellow-500',
      progress: 'bg-yellow-400'
    },
    'Diamante': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      accent: 'bg-blue-500',
      progress: 'bg-blue-400'
    },
    'Esmeralda': {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'bg-green-500',
      progress: 'bg-green-400'
    }
  }
  return colors[levelName as keyof typeof colors] || colors['Quartzo']
}

export default function CarreiraPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [careerData, setCareerData] = useState<CareerData | null>(null)
  const [careerPrizes, setCareerPrizes] = useState<CareerPrize[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [checkingLegRequirements, setCheckingLegRequirements] = useState(false)
  const [legRequirementsChecked, setLegRequirementsChecked] = useState<number | null>(null)
  const [redeemPrizeModalOpen, setRedeemPrizeModalOpen] = useState(false)
  const [redeemPrizeChoice, setRedeemPrizeChoice] = useState<'PHYSICAL' | 'CASH' | null>(null)
  const [redeemingPrize, setRedeemingPrize] = useState(false)

  const checkLegRequirements = useCallback(async (careerLevelId: number) => {
    // Evitar verificação duplicada
    if (legRequirementsChecked === careerLevelId) {
      console.log(`⚠️ Requisitos de pernas para nível ${careerLevelId} já foram verificados`)
      return
    }

    try {
      setCheckingLegRequirements(true)
      console.log(`🔍 Verificando requisitos de pernas para nível ${careerLevelId}`)

      const response = await fetch('/api/career/leg-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ careerLevelId })
      })

      const result = await response.json()

      if (result.success) {
        // Atualizar os requisitos de pernas e diretos no estado
        setCareerData(prevData => {
          if (!prevData) return prevData

          // Atualizar nextLevel se for o próximo nível
          const updatedNextLevel = prevData.nextLevel?.id === careerLevelId ? {
            ...prevData.nextLevel,
            directsRequirement: result.directsRequirement,
            legRequirements: result.legRequirements
          } : prevData.nextLevel

          // Atualizar allCareerLevels se for um nível específico
          const updatedAllCareerLevels = prevData.allCareerLevels.map(level => {
            if (level.id === careerLevelId) {
              return {
                ...level,
                directsRequirement: result.directsRequirement,
                legRequirements: result.legRequirements
              }
            }
            return level
          })

          return {
            ...prevData,
            nextLevel: updatedNextLevel,
            allCareerLevels: updatedAllCareerLevels
          }
        })

        // Marcar como verificado
        setLegRequirementsChecked(careerLevelId)
        console.log(`✅ Requisitos de pernas e diretos atualizados para nível ${careerLevelId}`)
      } else {
        console.error('Erro ao verificar requisitos de pernas:', result.error)
      }
    } catch (err) {
      console.error('Erro ao verificar requisitos de pernas:', err)
    } finally {
      setCheckingLegRequirements(false)
    }
  }, [legRequirementsChecked])

  const fetchCareerData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/career/progression', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const result = await response.json()

      if (result.success) {
        setCareerData(result.data)
        // Resetar flag de verificação quando novos dados são carregados
        setLegRequirementsChecked(null)
      } else {
        setError(result.error || 'Erro ao carregar dados de carreira')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }, []) // Removida dependência circular

  const fetchCareerPrizes = async () => {
    try {
      const response = await fetch('/api/career/prizes', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const result = await response.json()

      if (result.success) {
        setCareerPrizes(result.prizes)
      }
    } catch (err) {
      console.error('Erro ao carregar prêmios de carreira:', err)
    }
  }

  const handleUpdateCareer = async () => {
    try {
      setUpdating(true)
      setError(null)

      // Salvar nível atual antes de atualizar
      const currentLevelId = currentCareer?.id

      const response = await fetch('/api/career/update-progression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        // Recarregar os dados após atualização
        await fetchCareerData()
        
        // Verificar se houve mudança de nível após recarregar
        const newData = await fetch('/api/career/progression', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        const newResult = await newData.json()
        
        if (newResult.success && newResult.data.currentCareer) {
          const newLevelId = newResult.data.currentCareer.id
          
          // Se o nível mudou, recarregar a página
          if (currentLevelId !== newLevelId) {
            // Mostrar mensagem de sucesso            alert(`🎉 Parabéns! Você evoluiu para o nível ${newResult.data.currentCareer.name}!`)
            toast.success(`🎉 Parabéns! Você evoluiu para o nível ${newResult.data.currentCareer.name}!`)
            // Recarregar a página
            window.location.reload()
          }
        }
      } else {
        setError(result.error || 'Erro ao atualizar progressão de carreira')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setUpdating(false)
    }
  }

  const handleRedeemPrize = async () => {
    if (!redeemPrizeChoice) {
      toast.error('Selecione uma opção')
      return
    }
    try {
      setRedeemingPrize(true)
      const response = await fetch('/api/career/redeem-career-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: redeemPrizeChoice })
      })
      const result = await response.json()

      if (result.success) {
        setRedeemPrizeModalOpen(false)
        setRedeemPrizeChoice(null)
        toast.success(result.message)
        await fetchCareerData()
      } else {
        toast.error(result.error || 'Erro ao resgatar prêmio')
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setRedeemingPrize(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCareerData()
      fetchCareerPrizes()
    }
  }, [isAuthenticated, user, fetchCareerData])

  // Verificar requisitos de pernas quando careerData mudar
  useEffect(() => {
    if (careerData?.nextLevel?.id && legRequirementsChecked !== careerData.nextLevel.id && !checkingLegRequirements) {
      console.log(`🔍 Iniciando verificação de requisitos para nível ${careerData.nextLevel.id}`)
      checkLegRequirements(careerData.nextLevel.id)
    }
  }, [careerData?.nextLevel?.id, legRequirementsChecked, checkingLegRequirements, checkLegRequirements])

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

  // Se está carregando dados
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sua progressão de carreira...</p>
        </div>
      </div>
    )
  }

  // Se houve erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">Erro</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!careerData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Nenhum dado de carreira encontrado</div>
      </div>
    )
  }

  const { currentCareer, allCareerLevels, nextLevel, progressToNext, userStats, directReferrals } = careerData

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              🏆 Progressão de Carreira
            </h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Acompanhe sua evolução e conquiste novos níveis
            </p>
            {userStats.pointsNeedsRecalc && (
              <div className="mt-2 flex items-center space-x-2 text-xs sm:text-sm text-yellow-200">
                <RefreshCw className="w-3 h-3 animate-pulse" />
                <span>Seus pontos estão sendo atualizados em background...</span>
              </div>
            )}
            {userStats.pointsLastUpdated && !userStats.pointsNeedsRecalc && (
              <div className="mt-2 text-xs text-blue-200">
                Última atualização: {new Date(userStats.pointsLastUpdated).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Botão de verificar progressão de carreira 
            <button
              onClick={handleUpdateCareer}
              disabled={updating || loading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-white border border-white/30 w-full sm:w-auto"
              tabIndex={0}
              aria-label="Verificar progressão de carreira"
              title="Verifica se você evoluiu para um novo nível"
            >
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              <span className="text-sm sm:text-base">{updating ? 'Verificando...' : 'Verificar Progressão'}</span>
            </button>
            */}
            <div className="text-center sm:text-right">
              <div className="text-xl sm:text-2xl font-bold">{currentCareer?.name || 'Iniciante'}</div>
              <div className="text-blue-100 text-xs sm:text-sm">Nível Atual</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Pontos Totais</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{userStats.networkPoints.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Diretos</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{userStats.directReferralsCount}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Níveis de Bônus</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{currentCareer?.indirectBonusLevels || 0}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Current Level & Progress */}
      {currentCareer ? (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Seu Nível Atual</h2>

          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto sm:mx-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {/* Quando houver imagem do pin, usa a URL vinda do backend; senão, usa o ícone padrão */}
              {(() => {
                const level = careerData.allCareerLevels.find(l => l.id === currentCareer.id)
                if (level?.pinImageUrl) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={level.pinImageUrl} alt={currentCareer.name} className="w-full h-full object-cover" />
                  )
                }
                return (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    {getCareerIcon(currentCareer.name)}
                  </div>
                )
              })()}
            </div>
            <div className="text-center sm:text-left pl-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{currentCareer.name}</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Graduado em {new Date(currentCareer.graduatedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Pontos da Rede</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{currentCareer.totalNetworkPoints.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Pontos Válidos</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{currentCareer.validPoints.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">VME Aplicado</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{currentCareer.maxTeamVolumePercent}%</p>
            </div>
          </div>

          {currentCareer.hasPrizeChoice && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Prêmio de Carreira</span>
              </div>
              {currentCareer.prizeChoice ? (
                <p className="text-sm text-gray-700">
                  Prêmio escolhido: {currentCareer.prizeChoice === 'CASH'
                    ? `R$ ${(currentCareer.careerPrizeValue ?? 0).toLocaleString('pt-BR')}`
                    : (currentCareer.careerPrizeDescription || 'Prêmio físico')}
                </p>
              ) : (
                <button
                  onClick={() => {
                    setRedeemPrizeChoice(null)
                    setRedeemPrizeModalOpen(true)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  tabIndex={0}
                  aria-label="Resgatar prêmio"
                >
                  <Gift className="w-4 h-4" />
                  <span>Resgatar Prêmio</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Seu Status Atual</h2>

          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white mx-auto sm:mx-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="text-center sm:text-left pl-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Iniciante</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Ainda não graduado em nenhum nível de carreira
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Pontos da Rede</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{userStats.networkPoints.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Pontos Válidos</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {progressToNext ? progressToNext.currentValidPoints.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">VME Aplicado</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {progressToNext ? progressToNext.maxTeamVolumePercent : '60'}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress to Next Level */}
      {nextLevel && progressToNext && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Progresso para o Próximo Nível</h2>
            
            <button
              onClick={handleUpdateCareer}
              disabled={updating || loading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-white shadow-sm text-sm font-medium"
              tabIndex={0}
              aria-label="Atualizar progressão de carreira"
              title="Verifica se você evoluiu para um novo nível"
            >
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              <span>{updating ? 'Verificando...' : 'Atualizar'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto sm:mx-0 bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              {nextLevel.pinImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nextLevel.pinImageUrl} alt={nextLevel.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  {getCareerIcon(nextLevel.name)}
                </div>
              )}
            </div>
            <div className="text-center sm:text-left pl-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{nextLevel.name}</h3>
              <p className="text-sm sm:text-base text-gray-600">
                {progressToNext.requiredPoints.toLocaleString()} pontos necessários
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{progressToNext.progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressToNext.progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs sm:text-sm text-green-600">Pontos Válidos</p>
              <p className="text-lg sm:text-xl font-bold text-green-900">{progressToNext.currentValidPoints.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs sm:text-sm text-orange-600">Faltam</p>
              <p className="text-lg sm:text-xl font-bold text-orange-900">{progressToNext.additionalPointsNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-600">VME do Próximo</p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">{progressToNext.maxTeamVolumePercent}%</p>
            </div>
          </div>

          {/* Requisito de diretos com pacote ativo */}
          {nextLevel.directsRequirement && nextLevel.directsRequirement.requiredDirects > 0 && (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                  nextLevel.directsRequirement.isSatisfied ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {nextLevel.directsRequirement.isSatisfied ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-800">Linhas Ativas (Diretos com Pacote)</span>
                  </div>
                  <span className={`text-xs sm:text-sm ${nextLevel.directsRequirement.isSatisfied ? 'text-green-800' : 'text-red-800'}`}>
                    Mínimo de {nextLevel.directsRequirement.requiredDirects} direto(s) com pacote ativo
                  </span>
                  <div className={`mt-1 text-xs ${nextLevel.directsRequirement.isSatisfied ? 'text-green-700' : 'text-red-700'}`}>
                    {nextLevel.directsRequirement.isSatisfied ? '✓' : '✗'} Você tem {nextLevel.directsRequirement.currentDirectsWithPackage} de {nextLevel.directsRequirement.requiredDirects} necessários
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Requisitos de pernas do próximo nível */}
          {nextLevel.legRequirements && nextLevel.legRequirements.length > 0 && (
            <div className="mt-4 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-yellow-600" />
                <span className="text-xs sm:text-sm font-medium text-yellow-800">Exigências por Linhas</span>
                {checkingLegRequirements && (
                  <div className="flex items-center space-x-1 text-xs text-yellow-600">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Verificando...</span>
                  </div>
                )}
              </div>
              <ul className="list-none pl-0 space-y-2">
                {nextLevel.legRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      req.isSatisfied ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {req.isSatisfied ? (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className={`text-xs sm:text-sm ${req.isSatisfied ? 'text-green-800' : 'text-red-800'}`}>
                        Linha {req.legSlot}: ao menos {req.minOccurrences} membro(s) com nível ≥ {req.requiredCareerName} {req.includeIndirects ? '(diretos ou indiretos)' : '(apenas direto)'}
                      </span>
                      {req.isSatisfied && req.satisfiedCount !== undefined && (
                        <div className="mt-1 text-xs text-green-700">
                          ✓ Atendido: {req.satisfiedCount} membro(s) qualificado(s)
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* All Career Levels */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Todos os Níveis de Carreira</h2>

        <div className="space-y-3 sm:space-y-4">
          {allCareerLevels.map((level, index) => {
            const colors = getCareerColors(level.name)
            const isCompleted = currentCareer && index <= allCareerLevels.findIndex(l => l.id === currentCareer.id)

            return (
              <div
                key={level.id}
                className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-200 ${level.isCurrentLevel
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : level.isNextLevel
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : isCompleted
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-gray-200 bg-white'
                  }`}
              >
                {/* Level Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center ${level.isCurrentLevel
                        ? 'bg-blue-500'
                        : level.isNextLevel
                          ? 'bg-green-500'
                          : isCompleted
                            ? 'bg-gray-500'
                            : 'bg-gray-200'
                      }`}>
                      {level.pinImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={level.pinImageUrl} alt={level.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${level.isCurrentLevel || level.isNextLevel || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                          {getCareerIcon(level.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg sm:text-xl font-bold ${level.isCurrentLevel
                          ? 'text-blue-900'
                          : level.isNextLevel
                            ? 'text-green-900'
                            : isCompleted
                              ? 'text-gray-900'
                              : 'text-gray-700'
                        }`}>
                        {level.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {level.requiredPoints.toLocaleString()} pontos necessários
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center sm:justify-end">
                    {level.isCurrentLevel && (
                      <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nível Atual
                      </span>
                    )}
                    {level.isNextLevel && (
                      <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Próximo
                      </span>
                    )}
                    {isCompleted && !level.isCurrentLevel && (
                      <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Conquistado
                      </span>
                    )}
                  </div>
                </div>

                {/* Level Details */}
                <div className={`grid gap-3 sm:gap-4 text-xs sm:text-sm ${level.requiredDirects && level.requiredDirects > 0 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  <div className="text-center sm:text-left">
                    <p className="text-gray-600 mb-1">VME</p>
                    <p className="font-semibold">{level.maxTeamVolumePercent}%</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-gray-600 mb-1">Bônus Indireto</p>
                    <p className="font-semibold">{level.indirectBonusLevels} níveis</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-gray-600 mb-1">Reativações</p>
                    <p className="font-semibold">{level.reactivationLevels} níveis</p>
                  </div>
                  {level.requiredDirects && level.requiredDirects > 0 && (
                    <div className="text-center sm:text-left">
                      <p className="text-gray-600 mb-1">Linhas Ativas</p>
                      <p className="font-semibold">{level.requiredDirects} linhas</p>
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <p className="text-gray-600 mb-1">Lucro Extra</p>
                    <p className="font-semibold">{level.extraProfitPercent}%</p>
                  </div>
                </div>

                {/* Requisito de diretos com pacote ativo */}
                {level.directsRequirement && level.directsRequirement.requiredDirects > 0 && (
                  <div className="mt-3 sm:mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      {level.isNextLevel ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                          level.directsRequirement.isSatisfied ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {level.directsRequirement.isSatisfied ? (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs sm:text-sm font-medium text-blue-800">Linhas Ativas (Diretos com Pacote)</span>
                        </div>
                        <span className={`text-xs sm:text-sm ${
                          level.isNextLevel 
                            ? (level.directsRequirement.isSatisfied ? 'text-green-800' : 'text-red-800')
                            : 'text-gray-700'
                        }`}>
                          Mínimo de {level.directsRequirement.requiredDirects} direto(s) com pacote ativo
                        </span>
                        {level.isNextLevel && (
                          <div className={`mt-1 text-xs ${level.directsRequirement.isSatisfied ? 'text-green-700' : 'text-red-700'}`}>
                            {level.directsRequirement.isSatisfied ? '✓' : '✗'} Você tem {level.directsRequirement.currentDirectsWithPackage} de {level.directsRequirement.requiredDirects} necessários
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leg Requirements for this level */}
                {level.legRequirements && level.legRequirements.length > 0 && (
                  <div className="mt-3 sm:mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-amber-600" />
                      <span className="text-xs sm:text-sm font-medium text-amber-800">Exigências por Linhas</span>
                    </div>
                    <ul className="list-none pl-0 space-y-2">
                      {level.legRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          {/* Mostrar ícones de status apenas para o próximo nível */}
                          {level.isNextLevel ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                              req.isSatisfied ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {req.isSatisfied ? (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          ) : (
                            // Para outros níveis, mostrar apenas um bullet point neutro
                            <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                          )}
                          <div className="flex-1">
                            <span className={`text-xs sm:text-sm ${
                              level.isNextLevel 
                                ? (req.isSatisfied ? 'text-green-800' : 'text-red-800')
                                : 'text-gray-700'
                            }`}>
                              Linha {req.legSlot}: ao menos {req.minOccurrences} membro(s) com nível ≥ {req.requiredCareerName} {req.includeIndirects ? '(diretos ou indiretos)' : '(apenas direto)'}
                            </span>
                            {level.isNextLevel && req.isSatisfied && req.satisfiedCount !== undefined && (
                              <div className="mt-1 text-xs text-green-700">
                                ✓ Atendido: {req.satisfiedCount} membro(s) qualificado(s)
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Career Prizes */}
                {((level.careerBonusAmount && Number(level.careerBonusAmount) > 0) || level.careerPrizeDescription) && (
                  <div className="mt-3 sm:mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Trophy className="w-4 h-4 text-green-600" />
                      <span className="text-xs sm:text-sm font-medium text-green-800">
                        Prêmios de Carreira
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Number(level.careerBonusAmount) > 0 && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <span className="text-xs sm:text-sm text-green-700">
                            Bônus: R$ {Number(level.careerBonusAmount)}
                          </span>
                        </div>
                      )}
                      {level.careerPrizeDescription && (
                        <div className="flex items-center space-x-2">
                          <Gift className="w-3 h-3 text-blue-600" />
                          <span className="text-xs sm:text-sm text-blue-700">
                            {level.careerPrizeDescription}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Travel Bonus */}
                {level.travelBonus && (
                  <div className="mt-3 sm:mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <span className="text-xs sm:text-sm font-medium text-purple-800">
                        {level.travelBonus}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Direct Referrals Analysis */}
      {directReferrals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Análise dos Seus Diretos</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">Código</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">Nome</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">Pontos Totais</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">Pontos Válidos</th>
                </tr>
              </thead>
              <tbody>
                {directReferrals.map((direct) => (
                  <tr key={direct.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">{direct.referralCode}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900 text-xs sm:text-sm">{direct.name.toUpperCase()}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-gray-900 text-xs sm:text-sm">
                      {direct.totalPoints.toLocaleString()}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-blue-600 text-xs sm:text-sm">
                      {direct.validPointsForNextLevel.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-900 text-xs sm:text-sm"></td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-900 text-xs sm:text-sm">TOTAL</td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right text-gray-900 text-xs sm:text-sm">
                    {directReferrals.reduce((sum, direct) => sum + direct.totalPoints, 0).toLocaleString()}
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-right text-blue-600 text-xs sm:text-sm">
                    {directReferrals.reduce((sum, direct) => sum + direct.validPointsForNextLevel, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seção de Prêmios de Carreira */}
      <div className="mt-8">
        <CareerPrizes prizes={careerPrizes} />
      </div>

      {/* Modal Resgatar Prêmio */}
      <Dialog open={redeemPrizeModalOpen} onOpenChange={setRedeemPrizeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resgatar Prêmio</DialogTitle>
            <DialogDescription>
              Escolha como deseja receber seu prêmio de carreira. A escolha é única e irreversível.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              type="button"
              onClick={() => setRedeemPrizeChoice('PHYSICAL')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors flex items-center space-x-3 ${
                redeemPrizeChoice === 'PHYSICAL'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              tabIndex={0}
              aria-label="Escolher prêmio físico"
            >
              <Gift className="w-6 h-6 text-green-600" />
              <span className="font-medium">
                {currentCareer?.careerPrizeDescription || 'Prêmio físico'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRedeemPrizeChoice('CASH')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors flex items-center space-x-3 ${
                redeemPrizeChoice === 'CASH'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              tabIndex={0}
              aria-label="Escolher valor em dinheiro"
            >
              <DollarSign className="w-6 h-6 text-green-600" />
              <span className="font-medium">
                R$ {(currentCareer?.careerPrizeValue ?? 0).toLocaleString('pt-BR')}
              </span>
            </button>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRedeemPrizeModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRedeemPrize}
              disabled={!redeemPrizeChoice || redeemingPrize}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              {redeemingPrize ? 'Processando...' : 'Confirmar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

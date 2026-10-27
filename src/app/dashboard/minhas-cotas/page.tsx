'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'sonner'
import Link from 'next/link'
import { XCircle, Calendar, ShoppingCart, Building2, ChevronRight, RefreshCw, X } from 'lucide-react'
import ConfirmationModal from '@/components/modals/ConfirmationModal'

interface MinerInfo {
  id: number
  name: string
  city: string
  state: string
}

interface UserPackage {
  id: number
  name: string
  price: number
  priceSnapshot: number
  paidAmount: number
  isActive: boolean
  activatedAt: string
  createdAt: string
  expiresAt: string | null
  renewedDays: number | null
  canRenew: boolean
  miner: MinerInfo | null
  package: {
    id: number
    name: string
    description: string | null
    price: number
    points: number
    profitSharePercent: number
    isUnilevel: boolean
    directBonus: number
    reactivationAmount: number
    reactivationBonus: number
    boosted: number
  }
}

interface ApiResponse {
  success: boolean
  hasActivePackages: boolean
  data: {
    activePackages: UserPackage[]
    totalPackages: number
  }
  error?: string
}

interface MinerSelectionTarget {
  userPackageId: number
  packageId: number
  packageName: string
}

interface SelectMinerModalProps {
  isOpen: boolean
  onClose: () => void
  packageInfo: MinerSelectionTarget | null
  onConfirm: (userPackageId: number, minerId: number) => Promise<void>
  isLoading?: boolean
}

const SelectMinerModal = ({ isOpen, onClose, packageInfo, onConfirm, isLoading = false }: SelectMinerModalProps) => {
  const [miners, setMiners] = useState<MinerInfo[]>([])
  const [loadingMiners, setLoadingMiners] = useState(false)
  const [selectedMinerId, setSelectedMinerId] = useState('')

  const loadMiners = useCallback(async (packageId: number) => {
    try {
      setLoadingMiners(true)
      const response = await fetch(`/api/miners?packageId=${packageId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao carregar mineradoras')
      }

      setMiners(
        (data.data || []).map((miner: { id: string; name: string; city: string; state: string }) => ({
          id: Number(miner.id),
          name: miner.name,
          city: miner.city,
          state: miner.state
        }))
      )
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
      setMiners([])
    } finally {
      setLoadingMiners(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !packageInfo) {
      setSelectedMinerId('')
      setMiners([])
      return
    }
    loadMiners(packageInfo.packageId)
  }, [isOpen, packageInfo, loadMiners])

  const handleSave = async () => {
    if (!packageInfo) return
    if (!selectedMinerId) {
      toast.error('Selecione uma mineradora para continuar')
      return
    }
    await onConfirm(packageInfo.userPackageId, Number(selectedMinerId))
  }

  if (!isOpen || !packageInfo) return null

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Selecionar Mineradora</h2>
              <p className="text-sm text-gray-500">Escolha onde sua cota será vinculada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Cota</p>
            <p className="font-semibold text-gray-900">{packageInfo.packageName}</p>
          </div>

          <div>
            <label htmlFor="select-package-miner" className="block text-sm font-medium text-gray-700 mb-2">
              Mineradora
            </label>
            <select
              id="select-package-miner"
              value={selectedMinerId}
              onChange={(e) => setSelectedMinerId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && !loadingMiners) handleSave()
              }}
              disabled={loadingMiners || isLoading || miners.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:opacity-50"
              aria-label="Selecionar mineradora"
              tabIndex={0}
            >
              <option value="">
                {loadingMiners
                  ? 'Carregando mineradoras...'
                  : miners.length === 0
                    ? 'Nenhuma mineradora disponível'
                    : 'Selecione uma mineradora'}
              </option>
              {miners.map((miner) => (
                <option key={miner.id} value={miner.id}>
                  {miner.name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500">
            Após salvar, a mineradora ficará vinculada permanentemente a esta cota.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || loadingMiners || !selectedMinerId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MeusPlanosPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [userPackages, setUserPackages] = useState<UserPackage[]>([])
  const [totalPackages, setTotalPackages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [minerSelection, setMinerSelection] = useState<MinerSelectionTarget | null>(null)
  const [savingMiner, setSavingMiner] = useState(false)
  const [renewingPackageId, setRenewingPackageId] = useState<number | null>(null)
  const [packageToRenew, setPackageToRenew] = useState<UserPackage | null>(null)

  const loadUserPackages = useCallback(async () => {
    try {
      setLoading(true)

      if (!user?.id) {
        throw new Error('ID do usuário não encontrado')
      }

      const response = await fetch(`/api/business/all-active-packages?userId=${user.id}`)

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar suas cotas')
      }

      if (data.success && data.data) {
        // A API retorna os pacotes em data.activePackages
        setUserPackages(
          (data.data.activePackages || []).map((pkg) => ({
            ...pkg,
            createdAt: pkg.createdAt ?? pkg.activatedAt,
            renewedDays: pkg.renewedDays ?? null,
            canRenew: !!pkg.canRenew
          }))
        )
        setTotalPackages(data.data.totalPackages || 0)
      } else {
        setUserPackages([])
        setTotalPackages(0)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar planos do usuário:', error)
      toast.error('Erro ao carregar suas cotas', {
        description: 'Tente novamente ou entre em contato com o suporte.',
        icon: <XCircle className="w-5 h-5" />
      })
      setUserPackages([])
      setTotalPackages(0)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserPackages()
    }
  }, [isAuthenticated, user, loadUserPackages])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleOpenRenew = (userPackage: UserPackage) => {
    if (renewingPackageId !== null) return
    setPackageToRenew(userPackage)
  }

  const handleConfirmRenew = async () => {
    if (!packageToRenew || renewingPackageId !== null) return

    setRenewingPackageId(packageToRenew.id)
    try {
      const response = await fetch(`/api/user/packages/${packageToRenew.id}/renew`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok || !data.success || !data.data?.expiresAt) {
        throw new Error(data.error || 'Não foi possível renovar a cota')
      }

      setUserPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === packageToRenew.id
            ? {
                ...pkg,
                expiresAt: data.data.expiresAt,
                renewedDays: data.data.renewedDays ?? data.data.daysAdded ?? null,
                canRenew: false
              }
            : pkg
        )
      )
      toast.success('Cota renovada com sucesso', {
        description: data.message || `${data.data.daysAdded} dias adicionados à validade.`
      })
      setPackageToRenew(null)
    } catch (error) {
      console.error('Erro ao renovar cota:', error)
      toast.error('Erro ao renovar cota', {
        description: error instanceof Error ? error.message : 'Tente novamente ou entre em contato com o suporte.'
      })
    } finally {
      setRenewingPackageId(null)
    }
  }

  const handleOpenMinerSelection = (userPackage: UserPackage) => {
    setMinerSelection({
      userPackageId: userPackage.id,
      packageId: userPackage.package.id,
      packageName: userPackage.package.name
    })
  }

  const handleLinkMiner = async (userPackageId: number, minerId: number) => {
    setSavingMiner(true)
    try {
      const response = await fetch(`/api/user/packages/${userPackageId}/miner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minerId })
      })
      const data = await response.json()

      if (!response.ok || !data.success || !data.data?.miner) {
        throw new Error(data.error || 'Não foi possível vincular a mineradora')
      }

      setUserPackages((prev) =>
        prev.map((pkg) => (pkg.id === userPackageId ? { ...pkg, miner: data.data.miner } : pkg))
      )
      toast.success('Mineradora vinculada com sucesso', { description: data.message })
      setMinerSelection(null)
    } catch (error) {
      console.error('Erro ao vincular mineradora:', error)
      toast.error('Erro ao vincular mineradora', {
        description: error instanceof Error ? error.message : 'Tente novamente ou entre em contato com o suporte.'
      })
    } finally {
      setSavingMiner(false)
    }
  }

  const renderMinerBadge = (userPackage: UserPackage) => {
    if (!userPackage.miner) {
      return (
        <button
          type="button"
          onClick={() => handleOpenMinerSelection(userPackage)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Selecionar mineradora para esta cota"
          tabIndex={0}
        >
          <Building2 className="w-3 h-3" />
          Mineradora não informada
          <ChevronRight className="w-3 h-3" />
        </button>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <Building2 className="w-3 h-3" />
        {userPackage.miner.name}
      </span>
    )
  }

  const getPackageInvestedValue = (userPackage: UserPackage) =>
    userPackage.priceSnapshot > 0 ? userPackage.priceSnapshot : userPackage.package.price

  const getStatusBadge = (userPackage: UserPackage) => {
    const { isActive, expiresAt } = userPackage

    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Inativo
        </span>
      )
    }

    const isExpired = !!expiresAt && new Date(expiresAt) < new Date()

    if (isExpired && userPackage.canRenew) {
      return (
        <button
          type="button"
          onClick={() => handleOpenRenew(userPackage)}
          disabled={renewingPackageId !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={`Renovar cota ${userPackage.package.name}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Renovar
        </button>
      )
    }

    if (isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expirado
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Ativo
      </span>
    )
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
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Carregando suas cotas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">📦 Minhas Cotas</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Visualize todas as suas cotas ativas e suas características
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="text-center sm:text-right bg-gray-50 rounded-lg p-3 sm:p-0 sm:bg-transparent">
              <div className="text-xs sm:text-sm text-gray-500 mb-1">Total de Cotas</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {totalPackages}
              </div>
            </div>
            <Link
              href="/dashboard/cotas"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base whitespace-nowrap"
              tabIndex={0}
              aria-label="Comprar cotas"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Comprar Cotas</span>
              <span className="sm:hidden">Comprar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {userPackages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 border border-gray-200 text-center">
          <div className="text-4xl sm:text-6xl mb-4">📦</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Nenhuma cota encontrada</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Você ainda não possui cotas ativas. Adquira sua primeira cota para começar!
          </p>
          <a
            href="/dashboard/cotas"
            className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Ver Cotas Disponíveis
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Lista de Cotas</h3>
            <p className="text-xs sm:text-sm text-gray-600">Suas cotas ativas e informações de validade</p>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {userPackages.map((userPackage, index) => {
                const isExpired = userPackage.expiresAt
                  ? new Date(userPackage.expiresAt) < new Date()
                  : false
                const isExpiringSoon = userPackage.expiresAt
                  ? !isExpired && new Date(userPackage.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  : false

                return (
                  <div
                    key={`${userPackage.id}-${index}`}
                    className="rounded-xl border border-gray-200 bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
                      {/* Identificação */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 sm:block">
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">
                              {userPackage.package.name}
                            </h4>
                            {userPackage.package.description && (
                              <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 mt-0.5">
                                {userPackage.package.description}
                              </p>
                            )}
                          </div>
                          <div className="sm:hidden flex-shrink-0">
                            {getStatusBadge(userPackage)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          {renderMinerBadge(userPackage)}
                          <span className="text-xs text-gray-400 hidden sm:inline">·</span>
                        </div>
                      </div>

                      {/* Metadados */}
                      <div className="flex items-center gap-4 sm:gap-6 sm:flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-6">
                        <div className="flex flex-1 sm:flex-none items-center gap-4 sm:gap-6">
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex-shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Ativado em</div>
                              <div className="text-sm font-semibold text-gray-800">
                                {formatDate(userPackage.activatedAt)}
                              </div>
                            </div>
                          </div>

                          {userPackage.expiresAt && (
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                                isExpired
                                  ? 'bg-red-50 text-red-500'
                                  : isExpiringSoon
                                  ? 'bg-yellow-50 text-yellow-500'
                                  : 'bg-green-50 text-green-500'
                              }`}>
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Expira em</div>
                                <div className={`text-sm font-semibold ${
                                  isExpired
                                    ? 'text-red-600'
                                    : isExpiringSoon
                                    ? 'text-yellow-600'
                                    : 'text-gray-800'
                                }`}>
                                  {formatDate(userPackage.expiresAt)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="hidden sm:block flex-shrink-0">
                          {getStatusBadge(userPackage)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      {userPackages.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">📊 Resumo dos Investimentos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
            <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-0 sm:bg-transparent">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                R$ {userPackages.reduce((sum, pkg) => sum + getPackageInvestedValue(pkg), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Investido</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-0 sm:bg-transparent">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {userPackages.reduce((sum, pkg) => sum + pkg.package.points, 0).toLocaleString('pt-BR')}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total de Pontos</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-0 sm:bg-transparent">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {userPackages.filter(pkg => pkg.isActive && (!pkg.expiresAt || new Date(pkg.expiresAt) >= new Date())).length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Cotas Ativas</div>
            </div>
          </div>
        </div>
      )}

      <SelectMinerModal
        isOpen={minerSelection !== null}
        onClose={() => {
          if (!savingMiner) setMinerSelection(null)
        }}
        packageInfo={minerSelection}
        onConfirm={handleLinkMiner}
        isLoading={savingMiner}
      />

      <ConfirmationModal
        isOpen={packageToRenew !== null}
        onClose={() => {
          if (renewingPackageId === null) setPackageToRenew(null)
        }}
        onConfirm={handleConfirmRenew}
        title="Confirmar renovação"
        message={
          packageToRenew
            ? `Deseja renovar a cota "${packageToRenew.package.name}"? Esta ação só pode ser feita uma vez.`
            : 'Deseja renovar esta cota? Esta ação só pode ser feita uma vez.'
        }
        confirmText="Renovar"
        cancelText="Cancelar"
        type="warning"
        isLoading={renewingPackageId !== null}
      />
    </div>
  )
}
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { TrendingUp, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface NetworkPackageHistory {
  id: number
  userId: number
  userName: string
  userEmail: string
  userReferralCode: string
  packageId: number
  packageName: string
  packagePrice: number
  packagePoints: number
  isActive: boolean
  activatedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface NetworkStatistics {
  totalUsers: number
  totalPackages: number
  activePackages: number
  totalValue: number
  totalPoints: number
}

interface PaginationInfo {
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface NetworkPointsHistoryProps {
  userId: string
  className?: string,
  autoFetch?: boolean,
  title?: string
}

const NetworkPointsHistory: React.FC<NetworkPointsHistoryProps> = ({ 
  userId, 
  className = '',
  autoFetch = false,
  title = ''
}) => {
  const [networkPackageHistory, setNetworkPackageHistory] = useState<NetworkPackageHistory[]>([])
  const [userOwnPackages, setUserOwnPackages] = useState<NetworkPackageHistory[]>([])
  const [networkOnlyPackages, setNetworkOnlyPackages] = useState<NetworkPackageHistory[]>([])
  const [networkStatistics, setNetworkStatistics] = useState<NetworkStatistics | null>(null)
  const [userStatistics, setUserStatistics] = useState<NetworkStatistics | null>(null)
  const [networkHistoryLoading, setNetworkHistoryLoading] = useState(false)
  const [networkHistoryLoaded, setNetworkHistoryLoaded] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  })
  const [currentPage, setCurrentPage] = useState(1)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchNetworkHistory = useCallback(async (page: number = 1) => {
    try {
      setNetworkHistoryLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/network-history?page=${page}&limit=50&includeSelf=false`)
      const data = await response.json()

      if (data.success) {
        const allPackages = data.data.packages
        
        // Separar pacotes do próprio usuário dos pacotes da rede
        const ownPackages = allPackages.filter((pkg: NetworkPackageHistory) => 
          pkg.userId.toString() === userId
        )
        const networkPackages = allPackages.filter((pkg: NetworkPackageHistory) => 
          pkg.userId.toString() !== userId
        )
        
        // Usar estatísticas do backend (otimizadas)
        const backendStats = data.data.statistics
        
        // Calcular estatísticas do próprio usuário baseado nos pacotes atuais
        const userStats: NetworkStatistics = {
          totalUsers: 1,
          totalPackages: ownPackages.length,
          activePackages: ownPackages.filter((pkg: NetworkPackageHistory) => pkg.isActive).length,
          totalValue: ownPackages.reduce((sum: number, pkg: NetworkPackageHistory) => sum + pkg.packagePrice, 0),
          totalPoints: ownPackages.reduce((sum: number, pkg: NetworkPackageHistory) => sum + pkg.packagePoints, 0)
        }
        
        // Usar estatísticas gerais do backend (mais eficiente)
        const networkStats: NetworkStatistics = {
          totalUsers: backendStats.totalUsers - (ownPackages.length > 0 ? 1 : 0),
          totalPackages: backendStats.totalPackages - ownPackages.length,
          activePackages: backendStats.activePackages - ownPackages.filter((pkg: NetworkPackageHistory) => pkg.isActive).length,
          totalValue: backendStats.totalValue - ownPackages.reduce((sum: number, pkg: NetworkPackageHistory) => sum + pkg.packagePrice, 0),
          totalPoints: backendStats.totalPoints - ownPackages.reduce((sum: number, pkg: NetworkPackageHistory) => sum + pkg.packagePoints, 0)
        }
        
        setNetworkPackageHistory(allPackages)
        setUserOwnPackages(ownPackages)
        setNetworkOnlyPackages(networkPackages)
        setUserStatistics(userStats)
        setNetworkStatistics(networkStats)
        setPagination(data.data.pagination)
        setCurrentPage(page)
        setNetworkHistoryLoaded(true)
      } else {
        console.error('Erro ao buscar histórico da rede:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico da rede:', error)
    } finally {
      setNetworkHistoryLoading(false)
    }
  }, [userId])

  const handleNextPage = useCallback(() => {
    if (pagination.hasNext) {
      fetchNetworkHistory(currentPage + 1)
    }
  }, [currentPage, pagination.hasNext, fetchNetworkHistory])

  const handlePrevPage = useCallback(() => {
    if (pagination.hasPrev) {
      fetchNetworkHistory(currentPage - 1)
    }
  }, [currentPage, pagination.hasPrev, fetchNetworkHistory])

  const handleGoToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchNetworkHistory(page)
    }
  }, [pagination.totalPages, fetchNetworkHistory])

  useEffect(() => {
    if (autoFetch) {
      fetchNetworkHistory()
    }
  }, [autoFetch, fetchNetworkHistory])

  // Componente reutilizável para renderizar tabela de pacotes
  const renderPackagesTable = (packages: NetworkPackageHistory[], emptyMessage: string) => {
    if (packages.length === 0) {
      return (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pacote
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pontos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data de Criação
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ativado em
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {packages.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {record.userName.toUpperCase()}
                    </div>
                    <div className="text-xs text-blue-600">
                      #{record.userReferralCode}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">
                    {record.packageName}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatCurrency(record.packagePrice)}
                </td>
                <td className="px-4 py-3 font-medium text-blue-600">
                  {record.packagePoints.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    record.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(record.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {record.activatedAt ? formatDate(record.activatedAt) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Componente reutilizável para renderizar estatísticas
  const renderStatistics = (stats: NetworkStatistics | null, showUserCount: boolean = true) => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {showUserCount && (
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalUsers}
            </div>
            <div className="text-sm text-blue-600">Usuários</div>
          </div>
        )}
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.totalPackages}
          </div>
          <div className="text-sm text-green-600">Total de Pacotes</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.activePackages}
          </div>
          <div className="text-sm text-purple-600">Pacotes Ativos</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats.totalValue)}
          </div>
          <div className="text-sm text-orange-600">Valor Total</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {stats.totalPoints.toLocaleString()}
          </div>
          <div className="text-sm text-indigo-600">Pontos Totais</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {networkHistoryLoading && (
            <div className="flex items-center space-x-2 text-indigo-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Carregando dados...</span>
            </div>
          )}
        </div>
        {!autoFetch && (
        <button
          onClick={() => fetchNetworkHistory()}
          disabled={networkHistoryLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {networkHistoryLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}
          <span>
            {networkHistoryLoading 
              ? 'Carregando...' 
              : networkHistoryLoaded 
                ? 'Recarregar Histórico' 
                : 'Carregar Histórico'
            }
            </span>
          </button>
        )}
      </div>

      {/* Loading State para Estatísticas */}
      {networkHistoryLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção de Pacotes do Próprio Usuário */}
      {networkHistoryLoaded && !networkHistoryLoading && userOwnPackages.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-lg px-6 py-4">
            <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>📦</span>
              <span>Meus Pacotes</span>
            </h4>
          </div>
          <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6">
            {renderStatistics(userStatistics, false)}
            {renderPackagesTable(userOwnPackages, 'Nenhum pacote encontrado')}
          </div>
        </div>
      )}

      {/* Seção de Pacotes da Rede */}
      {networkHistoryLoaded && !networkHistoryLoading && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-lg px-6 py-4">
            <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>🌐</span>
              <span>Pacotes da Rede</span>
            </h4>
          </div>
          <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6">
            {renderStatistics(networkStatistics, true)}
            {renderPackagesTable(networkOnlyPackages, 'Nenhum pacote da rede encontrado')}
            
            {/* Controles de Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Botão Anterior */}
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrev || networkHistoryLoading}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  
                  {/* Páginas numeradas (mostrar até 5 páginas) */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      const isCurrentPage = pageNum === currentPage
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handleGoToPage(pageNum)}
                          disabled={networkHistoryLoading}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            isCurrentPage
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Botão Próxima */}
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNext || networkHistoryLoading}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Estado Inicial */}
      {!networkHistoryLoaded && !networkHistoryLoading && (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {autoFetch 
              ? 'Carregando histórico de pontos da rede...' 
              : 'Clique em "Carregar Histórico" para ver os dados da rede completa'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default NetworkPointsHistory

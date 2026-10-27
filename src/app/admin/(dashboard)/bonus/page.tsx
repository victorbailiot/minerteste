'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface BonusData {
  transactions: any[]
  profitDistributions: any[]
  pointsHistory: any[]
  unilevelBonuses: any[]
  stats: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Filters {
  type: string
  userId: string
  sourceUserId: string
  startDate: string
  endDate: string
  page: number
}

const BONUS_TYPES = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'DIRECT_BONUS', label: 'Bônus de Indicação Direta' },
  { value: 'INDIRECT_BONUS', label: 'Indicação Indireta' },
  { value: 'CASHBACK', label: 'Cashback' },
  { value: 'PROFIT_SHARE', label: 'Divisão de Lucros' },
  { value: 'ACTIVATION_BONUS', label: 'Bônus de Ativação' },
  { value: 'BONUS', label: 'Bônus Geral' }
]

export default function BonusPage() {
  const [data, setData] = useState<BonusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('transactions')
  
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    userId: '',
    sourceUserId: '',
    startDate: '',
    endDate: '',
    page: 1
  })

  const fetchBonusData = useCallback(async () => {
    setLoading(true)
    setError('') // Limpar erro anterior
    try {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/admin/bonus?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Erro ao buscar dados de bônus:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de bônus')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchBonusData()
  }, [fetchBonusData])

  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }) // Reset page quando outros filtros mudam
    }))
  }



  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return '-'
    }
  }

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error)
      return '-'
    }
  }

  const getBonusTypeLabel = (type: string) => {
    const bonusType = BONUS_TYPES.find(bt => bt.value === type)
    return bonusType?.label || type
  }

  const getBonusTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'DIRECT_BONUS': 'bg-green-100 text-green-800',
      'INDIRECT_BONUS': 'bg-blue-100 text-blue-800',
      'CASHBACK': 'bg-emerald-100 text-emerald-800',
      'PROFIT_SHARE': 'bg-yellow-100 text-yellow-800',
      'ACTIVATION_BONUS': 'bg-cyan-100 text-cyan-800',
      'BONUS': 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando dados de bônus...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchBonusData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Monitoramento de Bônus - Sistema Unilevel
        </h1>
        <p className="text-gray-600">
          Acompanhe todos os bônus do sistema unilevel: indicações diretas, indiretas, cashback, reativações, divisão de lucros e bônus de carreira
        </p>
      </div>

      {/* Estatísticas Resumo */}
      {data?.stats && data.stats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo por Tipo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.stats.map((stat) => (
              <div key={stat.type} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBonusTypeColor(stat.type)}`}>
                    {getBonusTypeLabel(stat.type)}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stat._sum.amount || 0)}
                </p>
                <p className="text-sm text-gray-600">
                  {stat._count.id} transações
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo de Bônus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Bônus
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {BONUS_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* ID do Usuário que Recebeu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID do Usuário (Recebeu)
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Ex: 123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ID do Usuário Origem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID do Usuário (Origem)
            </label>
            <input
              type="text"
              value={filters.sourceUserId}
              onChange={(e) => handleFilterChange('sourceUserId', e.target.value)}
              placeholder="Ex: 456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Botão Limpar Filtros */}
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                type: 'all',
                userId: '',
                sourceUserId: '',
                startDate: '',
                endDate: '',
                page: 1
              })}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de Conteúdo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'transactions', label: 'Transações de Bônus', count: data?.transactions?.length || 0 },
              { id: 'unilevel', label: 'Bônus Unilevel', count: data?.unilevelBonuses?.length || 0 },
              { id: 'profits', label: 'Divisão de Lucros', count: data?.profitDistributions?.length || 0 },
              { id: 'points', label: 'Histórico de Pontos', count: data?.pointsHistory?.length || 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Transações de Bônus */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Transações de Bônus ({data?.transactions?.length || 0})
              </h3>
              
              {data?.transactions && data.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quem Recebeu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patrocinador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{transaction.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBonusTypeColor(transaction.type)}`}>
                              {getBonusTypeLabel(transaction.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{transaction.user?.name}</div>
                            <div className="text-sm text-gray-500">{transaction.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.user?.sponsor ? (
                              <div>
                                <div className="text-sm text-gray-900">{transaction.user.sponsor.name}</div>
                                <div className="text-sm text-gray-500">{transaction.user.sponsor.email}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs whitespace-normal break-words">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma transação de bônus encontrada
                </div>
              )}
            </div>
          )}

          {/* Divisão de Lucros */}
          {activeTab === 'profits' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Distribuições de Lucro ({data?.profitDistributions?.length || 0})
              </h3>
              
              {data?.profitDistributions && data.profitDistributions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pacote
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Lucro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Recebido
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.profitDistributions.map((profit) => (
                        <tr key={profit.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{profit.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profit.user?.name}</div>
                            <div className="text-sm text-gray-500">{profit.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profit.package?.name}</div>
                            <div className="text-sm text-gray-500">{formatCurrency(profit.package?.price || 0)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {profit.profitPercent}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(profit.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateOnly(profit.periodStart)} - {formatDateOnly(profit.periodEnd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              profit.status === 'PROCESSED' 
                                ? 'bg-green-100 text-green-800'
                                : profit.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {profit.status === 'PROCESSED' ? 'Processado' : 
                               profit.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma distribuição de lucro encontrada
                </div>
              )}
            </div>
          )}

          {/* Bônus Unilevel */}
          {activeTab === 'unilevel' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Bônus Unilevel ({data?.unilevelBonuses?.length || 0})
              </h3>
              
              {data?.unilevelBonuses && data.unilevelBonuses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário (Recebeu)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origem (Quem Gerou)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nível
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pacote Origem
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.unilevelBonuses.map((bonus) => (
                        <tr key={bonus.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{bonus.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBonusTypeColor(bonus.type)}`}>
                              {getBonusTypeLabel(bonus.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(bonus.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{bonus.user?.name}</div>
                            <div className="text-sm text-gray-500">{bonus.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bonus.sourceUser ? (
                              <div>
                                <div className="text-sm text-gray-900">{bonus.sourceUser.name}</div>
                                <div className="text-sm text-gray-500">{bonus.sourceUser.email}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bonus.level ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Nível {bonus.level}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bonus.sourcePackage ? (
                              <div>
                                <div className="text-sm text-gray-900">{bonus.sourcePackage.name}</div>
                                <div className="text-sm text-gray-500">{formatCurrency(bonus.sourcePackage.price)}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs whitespace-normal break-words">
                            {bonus.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(bonus.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum bônus unilevel encontrado
                </div>
              )}
            </div>
          )}


          {/* Divisão de Lucros */}
          {activeTab === 'profits' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Distribuições de Lucro ({data?.profitDistributions?.length || 0})
              </h3>
              
              {data?.profitDistributions && data.profitDistributions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pacote
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Lucro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Recebido
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.profitDistributions.map((profit) => (
                        <tr key={profit.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{profit.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profit.user?.name}</div>
                            <div className="text-sm text-gray-500">{profit.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profit.package?.name}</div>
                            <div className="text-sm text-gray-500">{formatCurrency(profit.package?.price || 0)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {profit.profitPercent}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(profit.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateOnly(profit.periodStart)} - {formatDateOnly(profit.periodEnd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              profit.status === 'PROCESSED' 
                                ? 'bg-green-100 text-green-800'
                                : profit.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {profit.status === 'PROCESSED' ? 'Processado' : 
                               profit.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma distribuição de lucro encontrada
                </div>
              )}
            </div>
          )}

          {/* Histórico de Pontos */}
          {activeTab === 'points' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Histórico de Pontos ({data?.pointsHistory?.length || 0})
              </h3>
              
              {data?.pointsHistory && data.pointsHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário (Recebeu Pontos)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origem (Quem Comprou)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pacote Origem
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pontos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descrição
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.pointsHistory.map((point) => (
                        <tr key={point.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{point.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{point.user?.name}</div>
                            <div className="text-sm text-gray-500">{point.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {point.sourceUser ? (
                              <div>
                                <div className="text-sm text-gray-900">{point.sourceUser.name}</div>
                                <div className="text-sm text-gray-500">{point.sourceUser.email}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {point.sourcePackage ? (
                              <div>
                                <div className="text-sm text-gray-900">{point.sourcePackage.name}</div>
                                <div className="text-sm text-gray-500">{formatCurrency(point.sourcePackage.price)}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              point.points > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {point.points > 0 ? '+' : ''}{point.points}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              point.side === 'LEFT' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {point.side === 'LEFT' ? 'Esquerdo' : 'Direito'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs whitespace-normal break-words">
                            {point.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(point.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum histórico de pontos encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paginação */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando página {data.pagination.page} de {data.pagination.totalPages}
              ({data.pagination.total} registros no total)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                disabled={filters.page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handleFilterChange('page', Math.min(data.pagination.totalPages, filters.page + 1))}
                disabled={filters.page >= data.pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
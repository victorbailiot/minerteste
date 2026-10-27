'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import TeamMemberAvatar from '@/components/TeamMemberAvatar'

interface Downline {
  id: number
  referralCode: string
  name: string
  level: number
  photoUrl?: string | null
  sponsor: {
    referralCode: string
    name: string
  } | null
  package: {
    name: string
    price: number
    points: number
  } | null
  graduation: string
  status: string
  points: number
  registeredAt: string
}

interface FilterOptions {
  levels: number[]
  graduations: string[]
  packages: string[]
  statuses: string[]
}

interface DownlinesResponse {
  success: boolean
  data: {
    downlines: Downline[]
    total: number
    page: number
    limit: number
    totalPages: number
    filterOptions?: FilterOptions
  }
}

interface Filters {
  name: string
  level: string
  status: string
  graduation: string
  package: string
}

const LIMIT_OPTIONS = [10, 20, 50]

export default function MinhaEquipePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [downlines, setDownlines] = useState<Downline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadTime, setLoadTime] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    name: '',
    level: '',
    status: '',
    graduation: '',
    package: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  })
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    levels: [],
    graduations: [],
    packages: [],
    statuses: ['Ativo', 'Inativo']
  })

  const fetchDownlines = useCallback(async (
    page = 1,
    appliedFilters?: Filters,
    limit?: number
  ) => {
    if (!isAuthenticated || !user) return

    const f = appliedFilters ?? filters
    const currentLimit = limit ?? pagination.limit
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(currentLimit))
    if (f.name) params.set('name', f.name)
    if (f.level) params.set('level', f.level)
    if (f.status) params.set('status', f.status)
    if (f.graduation) params.set('graduation', f.graduation)
    if (f.package) params.set('package', f.package)

    try {
      setLoading(true)
      const startTime = performance.now()
      const response = await fetch(`/api/user/downlines?${params.toString()}`)

      if (!response.ok) throw new Error('Erro ao carregar equipe')

      const data: DownlinesResponse = await response.json()
      const endTime = performance.now()
      setLoadTime(parseFloat(((endTime - startTime) / 1000).toFixed(2)))

      if (data.success) {
        setDownlines(data.data.downlines)
        setPagination(prev => ({
          ...prev,
          page: data.data.page,
          limit: data.data.limit,
          total: data.data.total,
          totalPages: data.data.totalPages
        }))
        if (data.data.filterOptions) {
          setFilterOptions(data.data.filterOptions)
        }
      } else {
        throw new Error('Erro na resposta da API')
      }
    } catch (err) {
      console.error('Erro ao buscar downlines:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, filters, pagination.limit])

  useEffect(() => {
    fetchDownlines(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/user/downlines/options')
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setFilterOptions(json.data)
        }
      }
    } catch {
      // fallback: manter opções atuais
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFilterOptions()
    }
  }, [isAuthenticated, user, fetchFilterOptions])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applySearchFilters = () => {
    fetchDownlines(1, filters)
  }

  const clearFilters = () => {
    setFilters({
      name: '',
      level: '',
      status: '',
      graduation: '',
      package: ''
    })
    fetchDownlines(1, {
      name: '',
      level: '',
      status: '',
      graduation: '',
      package: ''
    })
  }

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true)
      await fetch('/api/user/downlines', { method: 'DELETE' })
      await fetchDownlines(pagination.page)
    } catch (err) {
      console.error('Erro ao atualizar downlines:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDownlines(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }))
    fetchDownlines(1, filters, newLimit)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      case 4: return 'bg-purple-100 text-purple-800'
      case 5: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'Ativo' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }

  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length <= 1) return fullName.toUpperCase()
    return `${parts[0]} ${parts[parts.length - 1]}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Minha Equipe 🏢
              </h1>
              {!loading && (
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Atualizar dados da equipe"
                >
                  <svg 
                    className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                </button>
              )}
            </div>
            <p className="text-gray-600">
              Gerencie toda a sua equipe e acompanhe o desempenho dos seus downlines
            </p>
          </div>
          <Link
            href="/dashboard/meu-negocio"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Stats Cards 
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total da Equipe</p>
              <p className="text-3xl font-bold text-blue-600">{downlines.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-1.7 2.26V15h-1.5v6H20z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Diretos</p>
              <p className="text-3xl font-bold text-green-600">
                {downlines.filter(d => d.level === 1).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Ativos</p>
              <p className="text-3xl font-bold text-purple-600">
                {downlines.filter(d => d.status === 'Ativo').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Pontos</p>
              <p className="text-3xl font-bold text-orange-600">
                {downlines.reduce((sum, d) => sum + d.points, 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      */}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Carregando sua equipe...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downlines List */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Lista da Equipe ({downlines.length} de {pagination.total})
                </h2>
                {hasActiveFilters && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Filtros ativos
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Filtros</h3>
              <div className="space-y-4">
                {/* Primeira linha de filtros */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  {/* Filtro por Nome */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applySearchFilters()}
                      placeholder="Digite o nome..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      aria-label="Filtrar por nome"
                    />
                  </div>

                  {/* Filtro por Graduação */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graduação
                    </label>
                    <select
                      value={filters.graduation}
                      onChange={(e) => handleFilterChange('graduation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      aria-label="Filtrar por graduação"
                    >
                      <option value="">Todas as graduações</option>
                      {filterOptions.graduations.map(graduation => (
                        <option key={graduation} value={graduation}>
                          {graduation}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nível */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nível
                    </label>
                    <select
                      value={filters.level}
                      onChange={(e) => handleFilterChange('level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      aria-label="Filtrar por nível"
                    >
                      <option value="">Todos</option>
                      {filterOptions.levels.map(level => (
                        <option key={level} value={level.toString()}>
                          Nível {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botão Buscar */}
                  <div className="flex items-end">
                    <button
                      onClick={applySearchFilters}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium w-full"
                      title="Buscar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar
                    </button>
                  </div>
                </div>

                {/* Segunda linha de filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Filtro por Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      aria-label="Filtrar por status"
                    >
                      <option value="">Todos os status</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Pacote */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pacote
                    </label>
                    <select
                      value={filters.package}
                      onChange={(e) => handleFilterChange('package', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      aria-label="Filtrar por pacote"
                    >
                      <option value="">Todos os pacotes</option>
                      {filterOptions.packages.map(pkg => (
                        <option key={pkg} value={pkg}>
                          {pkg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {downlines.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-1.7 2.26V15h-1.5v6H20z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pagination.total === 0 ? 'Nenhum membro encontrado' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {pagination.total === 0
                  ? 'Você ainda não possui membros na sua equipe. Compartilhe seu código de indicação para começar a construir sua equipe!'
                  : 'Nenhum membro da equipe corresponde aos filtros aplicados. Tente ajustar os filtros ou limpar todos os filtros.'
                }
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-blue-800 font-medium">Seu código de indicação:</p>
                <p className="text-lg font-bold text-blue-900">{user.referralCode}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nível
                    </th>
                    <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patrocinador
                    </th>
                    <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pacote
                    </th>
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graduação
                    </th>
                    <th className="w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos
                    </th>
                    <th className="w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {downlines.map((downline) => (
                    <tr key={downline.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <TeamMemberAvatar 
                            name={downline.name}
                            photoUrl={downline.photoUrl}
                            size="sm"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words leading-tight" title={formatShortName(downline.name)}>
                              {formatShortName(downline.name)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {downline.referralCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(downline.level)}`}>
                          Nível {downline.level}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {downline.sponsor ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 break-words leading-tight" title={formatShortName(downline.sponsor.name)}>
                              {formatShortName(downline.sponsor.name)}
                            </div>
                            <div className="text-xs text-gray-500">{downline.sponsor.referralCode}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {downline.package ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate" title={downline.package.name}>
                              {downline.package.name}
                            </div>
                            <div className="text-xs text-gray-500">{formatCurrency(downline.package.price)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sem pacote</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900 truncate" title={downline.graduation}>
                          {downline.graduation}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(downline.status)}`}>
                          {downline.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-purple-600">
                          {downline.points.toLocaleString('pt-BR')} pts
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(downline.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {!loading && !error && pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Exibindo {(pagination.page - 1) * pagination.limit + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                </span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Itens por página"
                >
                  {LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  aria-label="Página anterior"
                >
                  Anterior
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  aria-label="Próxima página"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

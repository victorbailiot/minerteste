'use client'

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import Link from 'next/link'
import { BarChart3, Search, Users, TrendingUp, Filter, X } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { PermissionGate } from '@/components/PermissionGate'
import TeamMemberAvatar from '@/components/TeamMemberAvatar'
import PhotoViewModal from '@/components/PhotoViewModal'

interface PointsRankItem {
  rank: number
  userId: string
  userName: string
  referralCode: string
  photoUrl: string | null
  careerLevelName: string | null
  pinImageUrl: string | null
  totalPoints: number
  personalPoints?: number
  networkPoints?: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CareerLevelOption {
  id: string
  name: string
}

export default function PontosPage() {
  const [items, setItems] = useState<PointsRankItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCareerId, setSelectedCareerId] = useState('')
  const [careerLevels, setCareerLevels] = useState<CareerLevelOption[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string | null; name: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { isSuperAdmin } = usePermissions()

  const loadCareerLevels = async () => {
    try {
      const res = await fetch('/api/career/progression', { cache: 'no-store' })
      if (!res.ok) return
      const result = await res.json()
      const levels = result?.data?.allCareerLevels ?? []
      const options: CareerLevelOption[] = Array.isArray(levels)
        ? levels.map((l: { id: number; name: string }) => ({ id: String(l.id), name: l.name }))
        : []
      setCareerLevels(options)
    } catch {
      setCareerLevels([])
    }
  }

  const fetchRanking = async (page = 1, searchTerm?: string, careerId?: string) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      const activeSearch = searchTerm !== undefined ? searchTerm : search
      const activeCareerId = careerId !== undefined ? careerId : selectedCareerId
      if (activeSearch) params.append('search', activeSearch)
      if (activeCareerId) params.append('careerLevelId', activeCareerId)

      const response = await fetch(`/api/admin/points-rank?${params}`)
      if (!response.ok) throw new Error('Erro ao buscar ranking')

      const data = await response.json()
      if (data.success) {
        setItems(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Erro ao buscar ranking de pontos:', error)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCareerLevels()
    fetchRanking(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    const term = (searchRef.current?.value || '').trim()
    setSearch(term)
    fetchRanking(1, term, selectedCareerId)
  }

  const handleCareerFilterChange = (careerId: string) => {
    setSelectedCareerId(careerId)
    const term = (searchRef.current?.value || '').trim()
    fetchRanking(1, term, careerId)
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedCareerId('')
    if (searchRef.current) searchRef.current.value = ''
    fetchRanking(1, '', '')
  }

  const formatNumber = (num: number) => num.toLocaleString('pt-BR')

  const handlePhotoClick = (photoUrl: string | null, userName: string) => {
    setSelectedPhoto({ url: photoUrl, name: userName })
  }

  const handleClosePhotoModal = () => {
    setSelectedPhoto(null)
  }

  return (
    <PermissionGate
      permission="points.read"
      fallback={
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 font-medium">Você não tem permissão para acessar o ranking de pontos.</p>
        </div>
      }
    >
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                Ranking de Pontuação
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 hidden sm:block">
                Usuários ordenados por pontuação em ordem decrescente
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm sm:text-base">{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome ou Código de Indicação
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    defaultValue={search}
                    placeholder="Digite o nome ou código..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Graduação
                </label>
                <select
                  value={selectedCareerId}
                  onChange={(e) => handleCareerFilterChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  aria-label="Filtrar por graduação"
                >
                  <option value="">Todas</option>
                  {careerLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total de Usuários</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1 truncate">
                  {formatNumber(pagination.total)}
                </p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-green-600 font-medium">Página Atual</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1 truncate">
                  {pagination.page} / {pagination.totalPages}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 sm:p-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-8 sm:p-12">
            <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium">Nenhum usuário encontrado</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graduação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Pessoais
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Rede
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Totais
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{item.rank}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-gray-100">
                            {item.pinImageUrl ? (
                              <NextImage
                                src={item.pinImageUrl}
                                alt={item.careerLevelName || 'Sem graduação'}
                                width={48}
                                height={48}
                                className="object-contain w-full h-full"
                                unoptimized
                              />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {item.careerLevelName || 'Sem graduação'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handlePhotoClick(item.photoUrl, item.userName)}
                            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                            aria-label={`Ver foto de ${item.userName}`}
                          >
                            <TeamMemberAvatar
                              name={item.userName}
                              photoUrl={item.photoUrl}
                              size="md"
                            />
                          </button>
                          <div>
                            {isSuperAdmin() ? (
                              <Link
                                href={`/admin/usuarios/${item.userId}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors block"
                              >
                                {item.userName}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium text-gray-900 block">{item.userName}</span>
                            )}
                            <div className="text-sm text-gray-500">{item.referralCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {typeof item.personalPoints === 'number' ? formatNumber(item.personalPoints) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {typeof item.networkPoints === 'number' ? formatNumber(item.networkPoints) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatNumber(item.totalPoints)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.userId} className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-gray-900 w-8 flex-shrink-0">{item.rank}</span>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                        {item.pinImageUrl ? (
                          <NextImage
                            src={item.pinImageUrl}
                            alt={item.careerLevelName || 'Sem graduação'}
                            width={40}
                            height={40}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center max-w-[60px] truncate">
                        {item.careerLevelName || 'Sem graduação'}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePhotoClick(item.photoUrl, item.userName)}
                      className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full flex-shrink-0"
                      aria-label={`Ver foto de ${item.userName}`}
                    >
                      <TeamMemberAvatar
                        name={item.userName}
                        photoUrl={item.photoUrl}
                        size="md"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      {isSuperAdmin() ? (
                        <Link
                          href={`/admin/usuarios/${item.userId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate block"
                        >
                          {item.userName}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-900 truncate block">{item.userName}</span>
                      )}
                      <p className="text-xs text-gray-500 truncate">{item.referralCode}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Pontos Pessoais</span>
                      <span className="font-semibold text-gray-900">
                        {typeof item.personalPoints === 'number' ? formatNumber(item.personalPoints) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Pontos Rede</span>
                      <span className="font-semibold text-gray-900">
                        {typeof item.networkPoints === 'number' ? formatNumber(item.networkPoints) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span>Total</span>
                      <span className="font-semibold text-gray-900">
                        {formatNumber(item.totalPoints)} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!isLoading && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              <span className="hidden sm:inline">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
              <span className="sm:hidden">
                {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => fetchRanking(pagination.page - 1, search, selectedCareerId)}
                disabled={pagination.page === 1}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Anterior
              </button>
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap px-2">
                {pagination.page}/{pagination.totalPages}
              </span>
              <button
                onClick={() => fetchRanking(pagination.page + 1, search, selectedCareerId)}
                disabled={pagination.page === pagination.totalPages}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoViewModal
        isOpen={selectedPhoto !== null}
        onClose={handleClosePhotoModal}
        photoUrl={selectedPhoto?.url || null}
        userName={selectedPhoto?.name || ''}
      />
    </div>
    </PermissionGate>
  )
}

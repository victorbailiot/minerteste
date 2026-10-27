'use client'

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { Search, Calendar, Award, TrendingUp, Users, Filter, X } from 'lucide-react'
import TeamMemberAvatar from '@/components/TeamMemberAvatar'
import PhotoViewModal from '@/components/PhotoViewModal'
import FlyerModal from '@/components/FlyerModal'

interface Graduation {
  id: string
  userId: string
  userName: string
  userEmail: string
  referralCode: string
  photoUrl?: string | null
  careerLevel: string
  pinImageUrl?: string | null
  requiredPoints: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: string
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: string
  travelBonus: string | null
  travelValue: string | null
  hasPrizeChoice?: boolean
  careerPrizeDescription?: string | null
  careerPrizeValue?: number | null
  prizeChoice?: string | null
  flyer?: { id: string; textColor: string; backgroundImage: string } | null
  graduatedAt: string
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

export default function GraduadosPage() {
  const [graduations, setGraduations] = useState<Graduation[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [careerLevels, setCareerLevels] = useState<CareerLevelOption[]>([])
  const [selectedCareerId, setSelectedCareerId] = useState<string>('')
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string | null; name: string } | null>(null)
  const [selectedGraduation, setSelectedGraduation] = useState<Graduation | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)

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

  const fetchGraduations = async (
    page = 1,
    filters?: { search?: string; startDate?: string; endDate?: string; careerId?: string }
  ) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      const activeSearch = filters?.search ?? search
      const activeStartDate = filters?.startDate ?? startDate
      const activeEndDate = filters?.endDate ?? endDate

      if (activeSearch) params.append('search', activeSearch)
      if (activeStartDate) params.append('startDate', activeStartDate)
      if (activeEndDate) params.append('endDate', activeEndDate)
      if (filters?.careerId !== undefined ? filters.careerId : selectedCareerId) {
        const cid = filters?.careerId ?? selectedCareerId
        if (cid) params.append('careerId', cid)
      }

      const response = await fetch(`/api/admin/career-graduations?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar graduações')
      }

      const data = await response.json()
      setGraduations(data.graduations)
      setPagination(data.pagination)
      if (careerLevels.length === 0) loadCareerLevels()
    } catch (error) {
      console.error('Erro ao buscar graduações:', error)
      alert('Erro ao buscar graduações')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCareerLevels()
    fetchGraduations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    const filters = {
      search: (searchRef.current?.value || '').trim(),
      startDate: startDateRef.current?.value || '',
      endDate: endDateRef.current?.value || '',
      careerId: selectedCareerId || undefined
    }
    setSearch(filters.search)
    setStartDate(filters.startDate)
    setEndDate(filters.endDate)
    fetchGraduations(1, filters)
  }

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setSelectedCareerId('')
    if (searchRef.current) searchRef.current.value = ''
    if (startDateRef.current) startDateRef.current.value = ''
    if (endDateRef.current) endDateRef.current.value = ''
    setTimeout(() => {
      fetchGraduations(1, { search: '', startDate: '', endDate: '', careerId: '' })
    }, 0)
  }

  dayjs.locale('pt-br')
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY HH:mm')
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR')
  }

  const handlePhotoClick = (photoUrl: string | null, userName: string) => {
    setSelectedPhoto({ url: photoUrl, name: userName })
  }

  const handleClosePhotoModal = () => {
    setSelectedPhoto(null)
  }

  const handleNameClick = (graduation: Graduation) => {
    setSelectedGraduation(graduation)
  }

  const handleCloseFlyerModal = () => {
    setSelectedGraduation(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Graduados no Plano de Carreira</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 hidden sm:block">
                Visualize todos os usuários que foram graduados nos níveis de carreira
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

        {/* Filtros */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca por Nome/Código */}
              <div>
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

              {/* Graduação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Graduação
                </label>
                <select
                  value={selectedCareerId}
                  onChange={(e) => setSelectedCareerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {careerLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={startDateRef}
                    type="date"
                    defaultValue={startDate}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={endDateRef}
                    type="date"
                    defaultValue={endDate}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
              <button
                onClick={handleSearch}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
              <button
                onClick={handleClearFilters}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total de Graduações</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1 truncate">{formatNumber(pagination.total)}</p>
              </div>
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-50 flex-shrink-0 ml-2" />
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

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-purple-600 font-medium">Exibindo</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1 truncate">
                  {graduations.length} registros
                </p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Graduações */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 sm:p-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : graduations.length === 0 ? (
          <div className="text-center p-8 sm:p-12">
            <Award className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium">Nenhuma graduação encontrada</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graduação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Rede
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Válidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Escolha do Prêmio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Graduação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {graduations.map((graduation) => (
                    <tr key={graduation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative bg-gray-100">
                            {graduation.pinImageUrl ? (
                              <NextImage
                                src={graduation.pinImageUrl}
                                alt={graduation.careerLevel}
                                width={48}
                                height={48}
                                className="object-contain w-full h-full"
                                unoptimized
                              />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{graduation.careerLevel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handlePhotoClick(graduation.photoUrl || null, graduation.userName)}
                            className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                            aria-label={`Ver foto de ${graduation.userName}`}
                          >
                            <TeamMemberAvatar
                              name={graduation.userName}
                              photoUrl={graduation.photoUrl}
                              size="md"
                            />
                          </button>
                          <div>
                            <button
                              onClick={() => handleNameClick(graduation)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer block text-left"
                            >
                              {graduation.userName}
                            </button>
                            <div className="text-sm text-gray-500">{graduation.referralCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(graduation.totalNetworkPoints)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(graduation.validPoints)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {graduation.hasPrizeChoice
                          ? (graduation.prizeChoice === 'CASH' && graduation.careerPrizeValue
                              ? `R$ ${graduation.careerPrizeValue.toLocaleString('pt-BR')}`
                              : graduation.prizeChoice === 'PHYSICAL'
                                ? (graduation.careerPrizeDescription || 'Prêmio físico')
                                : 'Não escolhido')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(graduation.graduatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="lg:hidden divide-y divide-gray-200">
              {graduations.map((graduation) => (
                <div key={graduation.id} className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 relative">
                        {graduation.pinImageUrl ? (
                          <NextImage
                            src={graduation.pinImageUrl}
                            alt={graduation.careerLevel}
                            width={40}
                            height={40}
                            className="object-contain w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 text-center max-w-[60px] truncate">{graduation.careerLevel}</span>
                    </div>
                    <button
                      onClick={() => handlePhotoClick(graduation.photoUrl || null, graduation.userName)}
                      className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full flex-shrink-0"
                      aria-label={`Ver foto de ${graduation.userName}`}
                    >
                      <TeamMemberAvatar
                        name={graduation.userName}
                        photoUrl={graduation.photoUrl}
                        size="md"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleNameClick(graduation)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer truncate block w-full text-left"
                      >
                        {graduation.userName}
                      </button>
                      <p className="text-xs text-gray-500 truncate">{graduation.referralCode}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="text-gray-600 block mb-1">Pontos Rede:</span>
                      <div className="font-semibold text-gray-900">{formatNumber(graduation.totalNetworkPoints)}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <span className="text-gray-600 block mb-1">Pontos Válidos:</span>
                      <div className="font-semibold text-gray-900">{formatNumber(graduation.validPoints)}</div>
                    </div>
                  </div>

                  {graduation.hasPrizeChoice && (
                    <div className="text-xs">
                      <span className="text-gray-600">Escolha do Prêmio: </span>
                      <span className="font-semibold text-gray-900">
                        {graduation.prizeChoice === 'CASH' && graduation.careerPrizeValue
                          ? `R$ ${graduation.careerPrizeValue.toLocaleString('pt-BR')}`
                          : graduation.prizeChoice === 'PHYSICAL'
                            ? (graduation.careerPrizeDescription || 'Prêmio físico')
                            : 'Não escolhido'}
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(graduation.graduatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Paginação */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              <span className="hidden sm:inline">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} graduações
              </span>
              <span className="sm:hidden">
                {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => fetchGraduations(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Anterior
              </button>
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap px-2">
                {pagination.page}/{pagination.totalPages}
              </span>
              <button
                onClick={() => fetchGraduations(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Foto */}
      <PhotoViewModal
        isOpen={selectedPhoto !== null}
        onClose={handleClosePhotoModal}
        photoUrl={selectedPhoto?.url || null}
        userName={selectedPhoto?.name || ''}
      />

      {/* Modal de Flyer */}
      <FlyerModal
        isOpen={selectedGraduation !== null}
        onClose={handleCloseFlyerModal}
        graduation={selectedGraduation}
      />
    </div>
  )
}


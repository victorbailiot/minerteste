'use client'

import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { Award, Calendar, Filter, Search, Users, X } from 'lucide-react'
import TeamMemberAvatar from '@/components/TeamMemberAvatar'
import FlyerModal from '@/components/FlyerModal'

interface Graduation {
  id: string
  userId: string
  userName: string
  userEmail: string
  referralCode: string
  photoUrl?: string | null
  careerLevel: string
  requiredPoints: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: string
  indirectBonusLevels: number
  reactivationLevels: number
  extraProfitPercent: string
  travelBonus: string | null
  travelValue: string | null
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

export default function GraduadosDaEquipePage() {
  const [graduations, setGraduations] = useState<Graduation[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [careerLevels, setCareerLevels] = useState<CareerLevelOption[]>([])
  const [selectedCareerId, setSelectedCareerId] = useState<string>('')
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

  const fetchGraduations = async (page = 1) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) })

      const s = (searchRef.current?.value || '').trim()
      const sd = startDateRef.current?.value || ''
      const ed = endDateRef.current?.value || ''
      if (s) params.append('search', s)
      if (sd) params.append('startDate', sd)
      if (ed) params.append('endDate', ed)
      if (selectedCareerId) params.append('careerId', selectedCareerId)

      const response = await fetch(`/api/user/team-graduations?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Erro ao carregar graduados da equipe')
      const data = await response.json()
      setGraduations(data.graduations)
      setPagination(data.pagination)
      if (careerLevels.length === 0) loadCareerLevels()
    } catch (e) {
      console.error(e)
      alert('Não foi possível carregar os graduados da equipe')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    dayjs.locale('pt-br')
    loadCareerLevels()
    fetchGraduations(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApplyFilters = () => fetchGraduations(1)

  const handleClearFilters = () => {
    if (searchRef.current) searchRef.current.value = ''
    if (startDateRef.current) startDateRef.current.value = ''
    if (endDateRef.current) endDateRef.current.value = ''
    setSelectedCareerId('')
    fetchGraduations(1)
  }

  const formatDate = (dateString: string) => dayjs(dateString).format('DD/MM/YYYY HH:mm')
  const formatNumber = (n: number) => n.toLocaleString('pt-BR')
  const handleOpenFlyer = (g: Graduation) => setSelectedGraduation(g)
  const handleCloseFlyer = () => setSelectedGraduation(null)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Graduados da Minha Equipe</h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1 hidden sm:block">Veja quem graduou na sua rede, filtre por nível e período</p>
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-sm sm:text-base">{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome ou Código</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input ref={searchRef} type="text" placeholder="Digite o nome ou código..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Graduação</label>
                <select value={selectedCareerId} onChange={(e) => setSelectedCareerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Todas</option>
                  {careerLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input ref={startDateRef} type="date" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input ref={endDateRef} type="date" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
              <button onClick={handleApplyFilters} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
              <button onClick={handleClearFilters} className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2">
                <X className="w-4 h-4" />
                <span>Limpar</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total de Graduações</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1 truncate">{pagination.total.toLocaleString('pt-BR')}</p>
              </div>
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-green-600 font-medium">Página Atual</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1 truncate">{pagination.page} / {pagination.totalPages}</p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-purple-600 font-medium">Exibindo</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1 truncate">{graduations.length} registros</p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 opacity-50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>
      </div>

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
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos Rede</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pontos Válidos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {graduations.map((g) => (
                    <tr
                      key={g.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleOpenFlyer(g)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <TeamMemberAvatar name={g.userName} photoUrl={g.photoUrl} size="md" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{g.userName}</div>
                            <div className="text-sm text-gray-500">Código: {g.referralCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white">{g.careerLevel}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(g.totalNetworkPoints)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(g.validPoints)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(g.graduatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-200">
              {graduations.map((g) => (
                <div
                  key={g.id}
                  className="p-3 sm:p-4 space-y-3 cursor-pointer"
                  onClick={() => handleOpenFlyer(g)}
                >
                  <div className="flex items-start gap-3">
                    <TeamMemberAvatar name={g.userName} photoUrl={g.photoUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{g.userName}</div>
                          <p className="text-xs text-gray-500 truncate">{g.userEmail}</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 whitespace-nowrap flex-shrink-0">{g.referralCode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-900 truncate">{g.careerLevel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-blue-50 p-2 rounded"><span className="text-gray-600 block mb-1">Pontos Rede:</span><div className="font-semibold text-gray-900">{formatNumber(g.totalNetworkPoints)}</div></div>
                    <div className="bg-green-50 p-2 rounded"><span className="text-gray-600 block mb-1">Pontos Válidos:</span><div className="font-semibold text-gray-900">{formatNumber(g.validPoints)}</div></div>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(g.graduatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!isLoading && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchGraduations(pagination.page - 1)} disabled={pagination.page === 1} className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">Anterior</button>
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap px-2">{pagination.page}/{pagination.totalPages}</span>
              <button onClick={() => fetchGraduations(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">Próxima</button>
            </div>
          </div>
        </div>
      )}

      {/* Flyer Modal */}
      <FlyerModal
        isOpen={selectedGraduation !== null}
        onClose={handleCloseFlyer}
        graduation={selectedGraduation}
      />
    </div>
  )
}



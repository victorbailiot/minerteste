'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import TeamMemberAvatar from '@/components/TeamMemberAvatar'
import { 
  Users, 
  CheckCircle, 
  Target, 
  ArrowLeft,
  AlertCircle,
  UserPlus,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

// Mapeamento de graduações para imagens de pin (fallback quando não há pinImageUrl no banco)
const GRADUATION_PIN_FALLBACK: Record<string, string> = {
  'QUARTZO': '/images/pins/cobre.png',
  'COBRE': '/images/pins/cobre.png',
  'FERRO': '/images/pins/cobre.png',
  'PRATA': '/images/pins/prata.png',
  'OURO': '/images/pins/ouro.png',
  'DIAMANTE': '/images/pins/diamante.png',
  'ESMERALDA': '/images/pins/esmeralda.png',
  'NIOBIO': '/images/pins/niobio.png',
  'NIÓBIO': '/images/pins/niobio.png',
  'SAFIRA': '/images/pins/safira.png'
}

interface DirectReferral {
  id: number
  name: string
  email: string
  phone: string
  country: string | null
  photoUrl: string | null
  referralCode: string
  registeredAt: string
  graduation: string
  pinImageUrl: string | null
  package: {
    name: string
    price: number
    points: number
  } | null
  packages: Array<{
    name: string
    price: number
    points: number
  }>
  points: {
    total: number
    left: number
    right: number
  }
}

interface DirectsResponse {
  success: boolean
  data: {
    directs: DirectReferral[]
    total: number
  }
}

type SortColumn = 'graduation' | 'name' | 'referralCode' | 'package' | 'points' | 'registeredAt'
type SortDirection = 'asc' | 'desc'

const SORT_COLUMNS: { value: SortColumn; label: string }[] = [
  { value: 'graduation', label: 'Graduação' },
  { value: 'name', label: 'Membro' },
  { value: 'referralCode', label: 'Código' },
  { value: 'package', label: 'Pacote' },
  { value: 'points', label: 'Pontos Totais' },
  { value: 'registeredAt', label: 'Cadastro' }
]

export default function DiretosPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [directs, setDirects] = useState<DirectReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<DirectReferral | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('registeredAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    const fetchDirects = async () => {
      if (!isAuthenticated || !user) return

      try {
        setLoading(true)
        const response = await fetch('/api/user/directs')
        
        if (!response.ok) {
          throw new Error('Erro ao carregar diretos')
        }

        const data: DirectsResponse = await response.json()
        
        if (data.success) {
          setDirects(data.data.directs)
        } else {
          throw new Error('Erro na resposta da API')
        }
      } catch (err) {
        console.error('Erro ao buscar diretos:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchDirects()
  }, [isAuthenticated, user])

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

  const getPinImageUrl = (direct: DirectReferral): string | null => {
    const grad = direct.graduation?.trim()
    if (!grad || grad.toLowerCase() === 'sem graduação') return null
    if (direct.pinImageUrl) return direct.pinImageUrl
    const key = grad.toUpperCase().replace(/\s/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return GRADUATION_PIN_FALLBACK[key] || GRADUATION_PIN_FALLBACK[grad.toUpperCase()] || null
  }

  const handleMemberNameClick = (direct: DirectReferral) => {
    setSelectedMember(direct)
  }

  const handleCloseModal = () => {
    setSelectedMember(null)
  }

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCloseModal()
  }

  const handleSortColumnChange = (col: SortColumn) => {
    setSortColumn(col)
    setSortDirection(col === 'registeredAt' || col === 'points' ? 'desc' : 'asc')
  }

  const sortedDirects = [...directs].sort((a, b) => {
    let comparison = 0
    switch (sortColumn) {
      case 'graduation':
        comparison = (a.graduation || '').localeCompare(b.graduation || '', 'pt-BR')
        break
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '', 'pt-BR')
        break
      case 'referralCode':
        comparison = (a.referralCode || '').localeCompare(b.referralCode || '', 'pt-BR')
        break
      case 'package':
        comparison = (a.package?.price ?? 0) - (b.package?.price ?? 0)
        break
      case 'points':
        comparison = a.points.total - b.points.total
        break
      case 'registeredAt':
        comparison = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()
        break
      default:
        comparison = 0
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Meus Diretos 👥
            </h1>
            <p className="text-gray-600">
              Gerencie sua equipe direta e acompanhe o desempenho dos seus indicados
            </p>
          </div>
          <Link
            href="/dashboard/meu-negocio"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Diretos</p>
              <p className="text-3xl font-bold text-blue-600">{directs.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Com Pacote Ativo</p>
              <p className="text-3xl font-bold text-green-600">
                {directs.filter(d => d.package).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total de Pontos</p>
              <p className="text-3xl font-bold text-purple-600">
                {directs.reduce((sum, d) => sum + d.points.total, 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Carregando seus diretos...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
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

      {/* Directs List */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Lista de Diretos ({directs.length})
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-column" className="text-sm text-gray-600 whitespace-nowrap">
                Ordenar por:
              </label>
              <select
                id="sort-column"
                value={sortColumn}
                onChange={(e) => handleSortColumnChange(e.target.value as SortColumn)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                aria-label="Coluna para ordenação"
              >
                {SORT_COLUMNS.map((col) => (
                  <option key={col.value} value={col.value}>
                    {col.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={sortDirection === 'asc' ? 'Ordenação crescente - clicar para decrescente' : 'Ordenação decrescente - clicar para crescente'}
                title={sortDirection === 'asc' ? 'Crescente (A-Z, menor primeiro)' : 'Decrescente (Z-A, maior primeiro)'}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {directs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum direto encontrado</h3>
              <p className="text-gray-600 mb-4">
                Você ainda não possui indicações diretas. Compartilhe seu código de indicação para começar a construir sua equipe!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-blue-800 font-medium">Seu código de indicação:</p>
                <p className="text-lg font-bold text-blue-900">{user.referralCode}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Graduação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pacote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontos Totais
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedDirects.map((direct) => (
                    <tr key={direct.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                            {(() => {
                              const pinUrl = getPinImageUrl(direct)
                              return pinUrl ? (
                                <Image
                                  src={pinUrl}
                                  alt={direct.graduation}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-400 text-lg">—</span>
                              )
                            })()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center">{direct.graduation}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TeamMemberAvatar
                            name={direct.name}
                            photoUrl={direct.photoUrl}
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleMemberNameClick(direct)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleMemberNameClick(direct)
                              }
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 -mx-1"
                            tabIndex={0}
                            aria-label={`Ver dados de ${direct.name}`}
                          >
                            {direct.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {direct.referralCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {direct.package ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{direct.package.name}</div>
                            <div className="text-sm text-gray-500">{formatCurrency(direct.package.price)}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sem pacote</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium text-purple-600">
                            {direct.points.total.toLocaleString('pt-BR')} pts
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(direct.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de dados do membro */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseModal}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 id="member-modal-title" className="text-xl font-semibold text-gray-900">
                Dados do Membro
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCloseModal()
                  }
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <TeamMemberAvatar
                  name={selectedMember.name}
                  photoUrl={selectedMember.photoUrl}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-gray-900">{selectedMember.name}</p>
                  <p className="text-sm text-gray-600">{selectedMember.graduation}</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">E-mail</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={selectedMember.email}>
                    {selectedMember.email || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">Telefone</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedMember.phone || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">País</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedMember.country || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">Código de indicação</span>
                  <span className="text-sm font-medium text-gray-900">{selectedMember.referralCode}</span>
                </div>
                <div className="py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600 block mb-2">Pacotes ativos</span>
                  {(selectedMember.packages?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(selectedMember.packages ?? []).map((pkg, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-800 border border-blue-100"
                        >
                          {pkg.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-500">Sem pacote</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">Pontos totais</span>
                  <span className="text-sm font-medium text-purple-600">
                    {selectedMember.points.total.toLocaleString('pt-BR')} pts
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Data de cadastro</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(selectedMember.registeredAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

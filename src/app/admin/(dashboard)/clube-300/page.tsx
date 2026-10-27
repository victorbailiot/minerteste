'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Crown, 
  Search, 
  Filter, 
  RefreshCw,
  Trophy
} from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import type { MinerOption } from '@/model/miners'

interface Clube300Member {
  id: number
  userId: number
  memberNumber: number
  minerId: number
  minerName: string
  name: string
  email: string
  cpf: string | null
  referralCode: string
  packageName: string
  packagePrice: number
  cotas: number
  joinedAt: string
  isActive: boolean
}

export default function Clube300Page() {
  const [members, setMembers] = useState<Clube300Member[]>([])
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [minerFilter, setMinerFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const loadMiners = async () => {
      try {
        const response = await fetch('/api/miners')
        const result = await response.json()
        if (response.ok && result.success) {
          const mappedMiners = (result.data || []).map((miner: { id: string; name: string }) => ({
            id: Number(miner.id),
            name: miner.name
          }))
          setMiners(mappedMiners)
        }
      } catch (error) {
        console.error('Erro ao carregar mineradoras:', error)
      }
    }

    loadMiners()
  }, [])

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        search: searchTerm,
        package: packageFilter,
        minerId: minerFilter
      })

      const response = await fetch(`/api/admin/clube-300?${params}`)
      const data = await response.json()

      if (data.success) {
        setMembers(data.data)
        setTotal(data.total)
      } else {
        console.error('Erro ao buscar membros:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, packageFilter, minerFilter])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
  }

  const applySearch = () => {
    setSearchTerm(searchInput)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
  }

  const handlePackageFilter = (value: string) => {
    setPackageFilter(value)
  }

  const handleMinerFilter = (value: string) => {
    setMinerFilter(value)
  }

  const selectedMinerName = miners.find((miner) => miner.id.toString() === minerFilter)?.name
  const isSingleMinerFilter = minerFilter !== 'all'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPackageBadge = (packageName: string) => {
    const styles: Record<string, string> = {
      'Núcleo': 'bg-indigo-100 text-indigo-800',
      'Tecton': 'bg-amber-100 text-amber-800'
    }

    const style = styles[packageName] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style}`}>
        {packageName}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando membros do Clube dos 300...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 lg:px-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl shadow-sm border border-amber-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
                <Crown className="w-6 h-6 md:w-8 md:h-8 text-amber-600 flex-shrink-0" />
                <span className="truncate">Clube dos 300</span>
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
                Lista completa dos membros fundadores do Clube dos 300
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {isSingleMinerFilter
                    ? `Membros em ${selectedMinerName}: ${total} / 300`
                    : `Total de membros: ${total}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <button 
                onClick={fetchMembers}
                className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors text-sm md:text-base"
              >
                <RefreshCw className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="space-y-4">
            {/* Seção de Busca */}
            <div className="bg-gray-50 rounded-lg p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">Busca por Texto</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Nome ou código..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applySearch()
                      }
                    }}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base"
                    tabIndex={0}
                    aria-label="Buscar membros do Clube dos 300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applySearch}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    tabIndex={0}
                    aria-label="Aplicar busca"
                  >
                    <Search className="w-4 h-4 flex-shrink-0" />
                    <span>Buscar</span>
                  </button>
                  <button
                    onClick={clearSearch}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    tabIndex={0}
                    aria-label="Limpar busca"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">Limpar</span>
                  </button>
                </div>
              </div>
              {searchTerm && (
                <div className="mt-2">
                  <span className="text-xs md:text-sm text-gray-600">
                    Buscando por: <span className="font-medium text-gray-900">&ldquo;{searchTerm}&rdquo;</span>
                  </span>
                </div>
              )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filtrar por Mineradora
                </label>
                <select
                  value={minerFilter}
                  onChange={(e) => handleMinerFilter(e.target.value)}
                  className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base w-full"
                  tabIndex={0}
                  aria-label="Filtrar por mineradora"
                >
                  <option value="all">Todas as mineradoras</option>
                  {miners.map((miner) => (
                    <option key={miner.id} value={miner.id}>
                      {miner.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filtrar por Pacote
                </label>
                <select
                  value={packageFilter}
                  onChange={(e) => handlePackageFilter(e.target.value)}
                  className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base w-full"
                  tabIndex={0}
                  aria-label="Filtrar por pacote"
                >
                  <option value="all">Todos os pacotes</option>
                  <option value="Núcleo">Núcleo</option>
                  <option value="Tecton">Tecton</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Membros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mineradora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pacote
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Cotas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Data de Entrada
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm || packageFilter !== 'all' || minerFilter !== 'all'
                        ? 'Nenhum membro encontrado com os filtros aplicados'
                        : 'Nenhum membro cadastrado no Clube dos 300'}
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Crown className="w-4 h-4 text-amber-600 mr-2" />
                          <span className="text-sm font-semibold text-gray-900">
                            #{member.memberNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-600">
                          {member.referralCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.minerName}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getPackageBadge(member.packageName)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {member.cotas} {member.cotas === 1 ? 'cota' : 'cotas'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(member.joinedAt)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo */}
        {members.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl shadow-sm border border-amber-200 p-4 md:p-6">
            <div className={`grid grid-cols-1 gap-4 ${isSingleMinerFilter ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <div className="text-center sm:text-left">
                <div className="text-sm text-gray-600">Total de Membros</div>
                <div className="text-2xl font-bold text-gray-900">
                  {isSingleMinerFilter ? `${total} / 300` : total}
                </div>
              </div>
              {isSingleMinerFilter && (
                <div className="text-center sm:text-left">
                  <div className="text-sm text-gray-600">Vagas Disponíveis</div>
                  <div className="text-2xl font-bold text-amber-600">{300 - total}</div>
                </div>
              )}
              <div className="text-center sm:text-left">
                <div className="text-sm text-gray-600">Membros Exibidos</div>
                <div className="text-2xl font-bold text-gray-900">{members.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}


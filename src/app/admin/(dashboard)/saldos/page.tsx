'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, RefreshCw, Search, ArrowLeft, User, DollarSign, Filter, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface UserBalance {
  id: number
  name: string
  email: string
  phone: string
  referralCode: string
  balance: number
  totalCredits: number
  totalDebits: number,
  totalBalance: number
}

interface BalanceResponse {
  success: boolean
  data: UserBalance[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  summary: {
    totalUsers: number
    totalBalance: number
    totalCredits: number
    totalDebits: number
  }
}

export default function SaldosPage() {
  const router = useRouter()
  const [balances, setBalances] = useState<UserBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    hasCredits: false,
    hasDebits: false,
    hasBalance: false,
    orderBy: 'name',
    orderDir: 'asc' as 'asc' | 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalCredits: 0,
    totalDebits: 0
  })

  // Carregar saldos
  const loadBalances = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/admin/balances?${params}`)
      const data: BalanceResponse = await response.json()

      if (data.success) {
        setBalances(data.data)
        setPagination(data.pagination)
        setSummary(data.summary)
      } else {
        toast.error('Erro ao carregar saldos')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar saldos:', error)
      toast.error('Erro ao carregar saldos')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Buscar com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, filters.search])

  // Carregar dados iniciais
  useEffect(() => {
    loadBalances()
  }, [filters, loadBalances])

  // Navegar para página de detalhes do usuário
  const handleUserClick = (userId: number) => {
    router.push(`/admin/usuarios/${userId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Wallet className="w-8 h-8 text-gray-700" />
                Saldos dos Usuários
              </h1>
              <p className="text-gray-600 mt-2">Visualize o saldo disponível de cada usuário</p>
            </div>
          </div>
          <button
            onClick={loadBalances}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Total em Bônus</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(summary.totalCredits)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Total em saques</p>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(summary.totalDebits)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Saldo Disponível</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Busca */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtros e Ordenação */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasCredits}
                onChange={(e) => setFilters(prev => ({ ...prev, hasCredits: e.target.checked, page: 1 }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Com Créditos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasDebits}
                onChange={(e) => setFilters(prev => ({ ...prev, hasDebits: e.target.checked, page: 1 }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Com Débitos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasBalance}
                onChange={(e) => setFilters(prev => ({ ...prev, hasBalance: e.target.checked, page: 1 }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Com Saldo Disponível</span>
            </label>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
            </div>

            <select
              value={filters.orderBy}
              onChange={(e) => setFilters(prev => ({ ...prev, orderBy: e.target.value, page: 1 }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Nome</option>
              <option value="credits">Créditos</option>
              <option value="debits">Débitos</option>
              <option value="balance">Saldo Disponível</option>
            </select>

            <select
              value={filters.orderDir}
              onChange={(e) => setFilters(prev => ({ ...prev, orderDir: e.target.value as 'asc' | 'desc', page: 1 }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>

            {(filters.hasCredits || filters.hasDebits || filters.hasBalance) && (
              <button
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  hasCredits: false, 
                  hasDebits: false, 
                  hasBalance: false,
                  page: 1 
                }))}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Saldos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Saldos por Usuário
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Carregando saldos...</p>
          </div>
        ) : balances.length === 0 ? (
          <div className="p-6 text-center">
            <Wallet className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Créditos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Débitos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Disponível
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balances.map((balance) => (
                    <tr
                      key={balance.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(balance.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{balance.name}</div>
                            <div className="text-sm text-gray-500">ID: {balance.id} - Código: {balance.referralCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{balance.email}</div>
                        <div className="text-sm text-gray-500">{balance.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(balance.totalCredits)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {formatCurrency(balance.totalDebits)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-bold ${
                          balance.balance > 0 ? 'text-blue-600' : 
                          balance.balance < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {formatCurrency(balance.balance)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} usuários
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pagination.page} de {pagination.pages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


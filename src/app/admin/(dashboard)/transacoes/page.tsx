'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TransactionStatus, TransactionType } from '@/generated/prisma'
import Pagination from '@/components/Pagination'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface Transaction {
  id: number
  type: TransactionType
  status: TransactionStatus
  amount: number
  description: string
  referenceId?: string
  correlationID?: string
  chargeId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerCpfCnpj?: string
  expiresAt?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    name: string
    email: string
  }
  userPackages: Array<{
    id: number
    package: {
      id: number
      name: string
      price: number
    }
  }>
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const transactionTypeLabels: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  BONUS: 'Bônus',
  WITHDRAWAL: 'Saque',
  PURCHASE: 'Compra',
  BONUS_PAYMENT: 'Pagamento com Bônus',
  MINING_REWARD: 'Recompensa de Mineração',
  PIX_PAYMENT: 'Pagamento PIX',
  CREDIT_PAYMENT: 'Pagamento com Cartão',
  DIRECT_BONUS: 'Bônus Direto',
  BOOSTED_BONUS: 'Bônus Turbinado',
  INDIRECT_BONUS: 'Bônus Indireto',
  CYCLE_BONUS: 'Bônus de Ciclo',
  BINARY_BONUS: 'Bônus Binário',
  PROFIT_SHARE: 'Divisão de Lucros',
  ACTIVATION_PIX: 'Ativação PIX',
  ACTIVATION_BONUS: 'Ativação Bônus',
  CASHBACK: 'Cashback',
  CAREER_BONUS: 'Bônus de Carreira',
  CAREER_PRIZE: 'Prêmio de Carreira',
  SOLIDARITY_PAYMENT: 'Crédito Minerador',
  REACTIVATION_BONUS: 'Bônus de Reativação',
  TRANSFER: 'Transferência',
  BONUS_ADJUSTMENT: 'Bônus de Ajuste'
}

const transactionStatusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada'
}

const statusColors: Record<TransactionStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

export default function TransactionsPage() {
  const { isSuperAdmin } = usePermissions()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search })
      })

      const response = await fetch(`/api/admin/transactions?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.data.transactions)
        setPagination(data.data.pagination)
      } else {
        console.error('Erro ao buscar transações:', data.error)
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters])

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, filters, fetchTransactions])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setCurrentPage(1)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getTransactionTypeColor = (type: TransactionType) => {
    const colors: Record<TransactionType, string> = {
      DEPOSIT: 'text-blue-600',
      BONUS: 'text-green-600',
      WITHDRAWAL: 'text-red-600',
      PURCHASE: 'text-purple-600',
      BONUS_PAYMENT: 'text-purple-600',
      MINING_REWARD: 'text-yellow-600',
      PIX_PAYMENT: 'text-indigo-600',
      CREDIT_PAYMENT: 'text-blue-700',
      DIRECT_BONUS: 'text-emerald-600',
      BOOSTED_BONUS: 'text-lime-600',
      INDIRECT_BONUS: 'text-teal-600',
      CYCLE_BONUS: 'text-cyan-600',
      BINARY_BONUS: 'text-sky-600',
      PROFIT_SHARE: 'text-violet-600',
      ACTIVATION_PIX: 'text-pink-600',
      ACTIVATION_BONUS: 'text-rose-600',
      CASHBACK: 'text-green-600',
      CAREER_BONUS: 'text-blue-600',
      CAREER_PRIZE: 'text-yellow-600',
      SOLIDARITY_PAYMENT: 'text-purple-600',
      REACTIVATION_BONUS: 'text-orange-600',
      TRANSFER: 'text-indigo-600',
      BONUS_ADJUSTMENT: 'text-amber-600'
    }
    return colors[type] || 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-600">Gerencie todas as transações do sistema</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Total: {pagination?.total || 0} transações
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Descrição, usuário, email..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(transactionTypeLabels)
                // Bônus de Ajuste só aparece para super admin
                .filter(([value]) => value !== 'BONUS_ADJUSTMENT' || isSuperAdmin())
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os status</option>
              {Object.entries(transactionStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
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
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/transacoes/${transaction.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.user ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`/admin/usuarios/${transaction.user.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                              aria-label={`Ver detalhes de ${transaction.user.name}`}
                            >
                              {transaction.user.name}
                            </a>
                            <div className="text-sm text-gray-500">
                              {transaction.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {transactionTypeLabels[transaction.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[transaction.status]}`}>
                          {transactionStatusLabels[transaction.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="whitespace-pre-wrap break-words">
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={setCurrentPage}
                showInfo={true}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
} 
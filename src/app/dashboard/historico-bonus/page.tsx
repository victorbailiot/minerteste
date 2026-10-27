'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { BONUS_TRANSACTION_TYPES } from '@/lib/transaction-types'

type BonusType = 'all' | typeof BONUS_TRANSACTION_TYPES[number]

interface TransactionItem {
  id: number
  type: string
  status: string
  amount: number
  description: string
  createdAt: string
  sourceUserId: number | null
  level: number | null
  sourceUser: {
    id: number
    name: string
    email: string
  } | null
}

export default function BonusListPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [filters, setFilters] = useState({
    type: 'all' as BonusType,
    startDate: '',
    endDate: ''
  })

  const typeOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos os tipos' },
      { value: 'DIRECT_BONUS', label: 'Bônus Direto' },
      { value: 'INDIRECT_BONUS', label: 'Bônus Indireto' },
      { value: 'ACTIVATION_BONUS', label: 'Bônus de Ativação' },
      { value: 'PROFIT_SHARE', label: 'Divisão de Lucros' },
      { value: 'CASHBACK', label: 'Cashback Pioneiro' },
      { value: 'CAREER_BONUS', label: 'Bônus de Carreira' },
      { value: 'CAREER_PRIZE', label: 'Prêmio de Carreira' }
    ]
  }, [])

  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'DIRECT_BONUS': 'Bônus Direto',
      'INDIRECT_BONUS': 'Bônus Indireto',
      'ACTIVATION_BONUS': 'Bônus de Ativação',
      'PROFIT_SHARE': 'Divisão de Lucros',
      'CASHBACK': 'Cashback Pioneiro',
      'PURCHASE': 'Compra de Pacote',
      'WITHDRAWAL': 'Saque',
      'CAREER_BONUS': 'Bônus de Carreira',
      'CAREER_PRIZE': 'Prêmio de Carreira'
    }
    return types[type] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getFirstAndLastName = (fullName: string) => {
    const names = fullName.trim().split(/\s+/)
    if (names.length === 0) return fullName
    if (names.length === 1) return names[0]
    return `${names[0]} ${names[names.length - 1]}`
  }

  const fetchItems = useCallback(async (pageToLoad: number, reset = false) => {
    if (!user) return
    try {
      setLoading(true)
      const limit = 20
      const params = new URLSearchParams({
        userId: String(user.id),
        page: String(pageToLoad),
        limit: String(limit)
      })
      if (filters.type !== 'all') params.set('type', filters.type)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)

      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar bônus')
      const data = await res.json()

      const list: TransactionItem[] = data.transactions || data.data?.transactions || data
      const total: number | undefined =
        data?.data?.pagination?.total ?? data?.total ?? data?.data?.total

      let newCount = 0
      setItems(prev => {
        newCount = reset ? list.length : prev.length + list.length
        return reset ? list : [...prev, ...list]
      })

      if (typeof total === 'number') {
        setHasMore(newCount < total)
      } else {
        setHasMore(list.length === limit)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  useEffect(() => {
    if (isAuthenticated && user) {
      setPage(1)
      fetchItems(1, true)
    }
  }, [isAuthenticated, user, filters, fetchItems])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">📊</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bônus - Histórico</h1>
              <p className="text-gray-600">Liste e filtre todos os seus bônus</p>
            </div>
          </div>
          <Link href="/dashboard/bonus" className="text-blue-600 hover:text-blue-700 text-sm">Voltar</Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de bônus</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as BonusType }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Total de Bônus */}
      {(() => {
        const bonusItems = items.filter(item => 
          BONUS_TRANSACTION_TYPES.includes(item.type as any)
        )
        const totalBonus = bonusItems.reduce((sum, item) => sum + item.amount, 0)
        
        return (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm p-6 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">💰</div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total de Bônus Filtrados</p>
                  <p className="text-xs text-gray-500 mt-1">{bonusItems.length} {bonusItems.length === 1 ? 'transação' : 'transações'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalBonus)}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {(() => {
          const bonusItems = items.filter(item => 
            BONUS_TRANSACTION_TYPES.includes(item.type as any)
          )
          
          if (bonusItems.length === 0 && !loading) {
            return <div className="p-8 text-center text-gray-600">Nenhum bônus encontrado</div>
          }
          
          return (
            <ul className="divide-y divide-gray-100">
              {bonusItems.map(item => (
              <li key={item.id} className="p-4 sm:p-5 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {getTransactionTypeLabel(item.type)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">{item.description}</p>
                  {/* Mostrar usuário que gerou o bônus e nível */}
                  {item.sourceUser && (item.type === 'DIRECT_BONUS' || item.type === 'INDIRECT_BONUS') && (
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs text-blue-600 font-medium">
                        De: {getFirstAndLastName(item.sourceUser.name)}
                      </span>
                      {item.level && (
                        <span className="text-xs text-purple-600 font-medium">
                          Nível {item.level}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatDate(item.createdAt)}</p>
                </div>
                <div className="text-right ml-4">
                  <p className={`font-bold ${BONUS_TRANSACTION_TYPES.includes(item.type as any) ? 'text-green-600' : 'text-red-600'}`}>
                    {BONUS_TRANSACTION_TYPES.includes(item.type as any) ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full inline-block w-fit ${item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </li>
              ))}
            </ul>
          )
        })()}

        {/* Paginação simples */}
        <div className="p-4 flex justify-between items-center">
          <button
            disabled={page === 1 || loading}
            onClick={() => {
              const previousPage = Math.max(1, page - 1)
              setPage(previousPage)
              fetchItems(previousPage, true)
            }}
            className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={!hasMore || loading}
            onClick={() => {
              const nextPage = page + 1
              setPage(nextPage)
              fetchItems(nextPage, false)
            }}
            className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          >
            Carregar mais
          </button>
        </div>
      </div>
    </div>
  )
}



'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transfer {
  id: number
  amount: number
  description: string
  type: 'SENT' | 'RECEIVED'
  status: string
  createdAt: string
  transferId: string | null
  otherUser: {
    id: number
    name: string
    email: string
  } | null
}

interface TransferStats {
  totalSent: number
  totalReceived: number
  totalSentCount: number
  totalReceivedCount: number
}

export default function TransferenciasPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [stats, setStats] = useState<TransferStats>({
    totalSent: 0,
    totalReceived: 0,
    totalSentCount: 0,
    totalReceivedCount: 0
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const router = useRouter()

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transfers/history?page=${pagination.page}&limit=${pagination.limit}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico de transferências')
      }

      const data = await response.json()
      setTransfers(data.data)
      setStats(data.stats)
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages
      }))

    } catch (err) {
      console.error('Erro ao buscar transferências:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTransfers()
    }
  }, [isAuthenticated, user, fetchTransfers])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico de transferências...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Erro</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">💸 Histórico de Transferências</h1>
              <p className="text-gray-600">Acompanhe todas as suas transferências enviadas e recebidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Transferências Enviadas</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSent)}</p>
              <p className="text-red-100 text-xs mt-2">{stats.totalSentCount} transferência{stats.totalSentCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Transferências Recebidas</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</p>
              <p className="text-green-100 text-xs mt-2">{stats.totalReceivedCount} transferência{stats.totalReceivedCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Transferências */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Todas as Transferências</h2>
        
        {transfers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">💸</div>
            <p className="text-gray-600">Nenhuma transferência encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border-2 transition-colors ${
                  transfer.type === 'SENT'
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 mb-3 sm:mb-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    transfer.type === 'SENT'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {transfer.type === 'SENT' ? (
                      <ArrowUpCircle className="w-5 h-5" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-semibold text-sm sm:text-base ${
                        transfer.type === 'SENT' ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {transfer.type === 'SENT' ? 'Transferência Enviada' : 'Transferência Recebida'}
                      </p>
                      {transfer.status === 'COMPLETED' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{transfer.description}</p>
                    {transfer.otherUser && (
                      <p className="text-xs text-gray-500">
                        {transfer.type === 'SENT' ? 'Para' : 'De'}: <span className="font-medium">{transfer.otherUser.name}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(transfer.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                  <span className={`font-bold text-lg sm:text-xl ${
                    transfer.type === 'SENT' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {transfer.type === 'SENT' ? '-' : '+'}
                    {formatCurrency(transfer.amount)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full inline-block w-fit ${
                    transfer.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transfer.status === 'COMPLETED' ? 'Concluída' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-600">
              Página {pagination.page} de {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


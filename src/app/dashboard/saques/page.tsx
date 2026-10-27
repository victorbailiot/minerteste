'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, DollarSign, CheckSquare, Shield, Ban } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Withdrawal {
  id: number
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CONFIRMED' | 'APPROVED'
  requestedAt: string
  processedAt?: string
  rejectedReason?: string
}

export default function SaquesPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const router = useRouter()

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/withdrawals?page=${pagination.page}&limit=${pagination.limit}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico de saques')
      }

      const data = await response.json()
      setWithdrawals(data.data)
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages
      }))

    } catch (err) {
      console.error('Erro ao buscar saques:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWithdrawals()
    }
  }, [isAuthenticated, user, fetchWithdrawals])



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pendente',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        }
      case 'APPROVED':
        return {
          label: 'Aprovado',
          icon: CheckSquare,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200'
        }
      case 'REJECTED':
      case 'FAILED':
        return {
          label: 'Rejeitado',
          icon: Ban,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        }
      case 'COMPLETED':
        return {
          label: 'Concluído',
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        }
      case 'CONFIRMED':
        return {
          label: 'Confirmado',
          icon: Shield,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        }
      default:
        return {
          label: 'Desconhecido',
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        }
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Histórico de Saques</h1>
              <p className="text-gray-600">Acompanhe todas as suas solicitações de saque</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Saques</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {withdrawals.filter(w => w.status === 'PENDING').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Concluídos</p>
              <p className="text-2xl font-bold text-blue-600">
                {withdrawals.filter(w => w.status === 'COMPLETED').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Saques */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Solicitações de Saque</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 text-xl mb-4">❌ Erro</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchWithdrawals}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <p className="text-gray-600">Nenhuma solicitação de saque encontrada</p>
            <p className="text-sm text-gray-500 mt-2">
              Faça sua primeira solicitação de saque na página de ganhos
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {withdrawals.map((withdrawal) => {
                const statusInfo = getStatusInfo(withdrawal.status)
                const StatusIcon = statusInfo.icon

                return (
                  <div key={withdrawal.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${statusInfo.bgColor} rounded-lg flex items-center justify-center`}>
                          <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(withdrawal.amount)}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} border`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Solicitado em: {formatDate(withdrawal.requestedAt)}
                          </p>
                          {withdrawal.processedAt && (
                            <p className="text-sm text-gray-600">
                              Processado em: {formatDate(withdrawal.processedAt)}
                            </p>
                          )}
                          {withdrawal.rejectedReason && (
                            <p className="text-sm text-red-600 mt-1">
                              Motivo: {withdrawal.rejectedReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">ID: #{withdrawal.id}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} saques
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
                      {pagination.page}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
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

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Informações sobre Saques</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Pendente:</strong> Aguardando aprovação do administrador</li>
          <li>• <strong>Concluído:</strong> Saque processado e confirmado</li>
          <li>• <strong>Rejeitado:</strong> Saque não aprovado (ver motivo)</li>          
          <li>• Saques são processados em até 24 horas úteis</li>
          <li>• Valores são enviados para sua chave PIX cadastrada</li>
        </ul>
      </div>
    </div>
  )
} 
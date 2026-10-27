'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Clock, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { PermissionGate } from '@/components/PermissionGate'

interface RecalcStats {
  needsRecalc: number
  upToDate: number
  total: number
  percentNeedsRecalc: string
}

interface QueueUser {
  userId: number
  name: string
  referralCode: string
  totalPoints: number
  lastUpdated: string
  waitingTime: string
}

interface RecalcQueueResponse {
  success?: boolean
  stats?: RecalcStats
  oldestInQueue?: QueueUser[]
  error?: string
}

const formatDateTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

const formatNumber = (value: number) => {
  return value.toLocaleString('pt-BR')
}

const FilaRecalculoPage = () => {
  const [stats, setStats] = useState<RecalcStats | null>(null)
  const [queue, setQueue] = useState<QueueUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recalculatingId, setRecalculatingId] = useState<number | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/points/recalculate', {
        method: 'GET',
        cache: 'no-store'
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Erro ao carregar dados da fila')
      }

      const data: RecalcQueueResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido ao carregar fila de recálculo')
      }

      setStats(data.stats ?? null)
      setQueue(data.oldestInQueue ?? [])
    } catch (err) {
      console.error('Erro ao carregar fila de recálculo:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Erro desconhecido ao carregar fila de recálculo de pontos'
      )
      setStats(null)
      setQueue([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRecalculate = async (userId: number) => {
    try {
      setRecalculatingId(userId)
      setError(null)
      const response = await fetch('/api/admin/points/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Erro ao recalcular')
      }
      if (data.success) {
        await loadData()
      } else {
        throw new Error(data.error || 'Erro ao recalcular')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao executar recálculo para este usuário'
      )
    } finally {
      setRecalculatingId(null)
    }
  }

  if (isLoading) {
    return (
      <PermissionGate
        permission="points.recalc.queue"
        fallback={
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 font-medium">
              Você não tem permissão para visualizar a fila de recálculo de pontos.
            </p>
          </div>
        }
      >
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-gray-600 text-sm">Carregando fila de recálculo...</p>
          </div>
        </div>
      </PermissionGate>
    )
  }

  return (
    <PermissionGate
      permission="points.recalc.queue"
      fallback={
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 font-medium">
            Você não tem permissão para visualizar a fila de recálculo de pontos.
          </p>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Fila de Recalculo de Pontos
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Visualize os usuários que estão marcados para recálculo de pontos no plano unilevel
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
            <p className="font-semibold mb-1">Erro ao carregar fila de recálculo</p>
            <p>{error}</p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Na fila</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {formatNumber(stats.needsRecalc)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-70" />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Atualizados</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {formatNumber(stats.upToDate)}
                </p>
              </div>
              <Users className="w-8 h-8 text-emerald-500 opacity-70" />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatNumber(stats.total)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  % em fila
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {stats.percentNeedsRecalc}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">
              Usuários na fila de recálculo
            </h2>
            <p className="text-xs text-gray-500">
              Mostrando os usuários mais antigos na fila
            </p>
          </div>

          {queue.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Nenhum usuário está atualmente na fila de recálculo de pontos.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pontos Totais
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última atualização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tempo em fila
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queue.map((item) => (
                      <tr key={item.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <Link
                              href={`/admin/usuarios/${item.userId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {item.name}
                            </Link>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.referralCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(item.totalPoints)} pts
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(item.lastUpdated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.waitingTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button
                            type="button"
                            onClick={() => handleRecalculate(item.userId)}
                            disabled={recalculatingId === item.userId}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Recalcular pontos de ${item.name}`}
                          >
                            {recalculatingId === item.userId ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Recalculando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Recalcular
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {queue.map((item) => (
                  <div key={item.userId} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/usuarios/${item.userId}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline block truncate"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-gray-500 truncate">{item.referralCode}</p>
                      </div>
                      <div className="ml-3 text-right">
                        <p className="text-xs text-gray-500">Pontos totais</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(item.totalPoints)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Última atualização: {formatDateTime(item.lastUpdated)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Tempo em fila: {item.waitingTime}</span>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleRecalculate(item.userId)}
                        disabled={recalculatingId === item.userId}
                        className="inline-flex items-center justify-center w-full px-3 py-2 border border-blue-600 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Recalcular pontos de ${item.name}`}
                      >
                        {recalculatingId === item.userId ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Recalculando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Recalcular
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PermissionGate>
  )
}

export default FilaRecalculoPage


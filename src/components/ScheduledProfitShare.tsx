'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Clock, DollarSign, Package as PackageIcon, Users, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ActiveProfitScheduleResponse, ProfitDivisionByPackage } from '@/types/profit-schedule'

export default function ScheduledProfitShare() {
  const [data, setData] = useState<ActiveProfitScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  })

  // Buscar agendamento ativo
  const fetchActiveSchedule = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profit-schedules/active')
      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        
        // Inicializar cronômetro
        const scheduledAt = new Date(result.data.schedule.scheduledAt)
        const now = new Date()
        const difference = scheduledAt.getTime() - now.getTime()

        if (difference <= 0) {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        } else {
          setCountdown({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
            isExpired: false
          })
        }
      } else {
        setData(null)
      }
    } catch (error) {
      console.error('Erro ao buscar agendamento ativo:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Atualizar cronômetro a cada segundo
  useEffect(() => {
    if (!data) return

    const interval = setInterval(() => {
      const scheduledAt = new Date(data.schedule.scheduledAt)
      const now = new Date()
      const difference = scheduledAt.getTime() - now.getTime()

      if (difference <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      setCountdown({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [data])

  // Buscar dados ao montar componente
  useEffect(() => {
    fetchActiveSchedule()
  }, [fetchActiveSchedule])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3"></div>
        <span className="text-gray-600 text-sm sm:text-base">Carregando agendamento...</span>
      </div>
    )
  }

  if (!data || !data.schedule.isActive) {
    return null
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-xl shadow-lg p-4 sm:p-6 border-2 border-green-500">
      <div className="mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Divisão de Lucro Agendada
        </h3>
        {data.miner && (
          <p className="text-green-100 text-sm sm:text-base mb-2">
            Mineradora: <span className="font-semibold">{data.miner.name}</span>
          </p>
        )}
        <div className="flex items-center space-x-2 text-green-100">
          <DollarSign className="h-5 w-5" />
          <span className="text-lg sm:text-xl font-semibold">
            {formatCurrency(data.totalProfit)}
          </span>
        </div>
      </div>

      {/* Cronômetro Regressivo */}
      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          <span className="text-xs sm:text-sm font-medium text-white">
            {countdown.isExpired ? 'Agendado para execução' : 'Tempo restante até a execução'}
          </span>
        </div>
        {!countdown.isExpired ? (
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-sm sm:text-base font-bold text-white">
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl">{String(countdown.days).padStart(2, '0')}</span>
              <span className="text-xs opacity-90">dias</span>
            </div>
            <span className="text-lg sm:text-xl">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="text-xs opacity-90">horas</span>
            </div>
            <span className="text-lg sm:text-xl">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-xs opacity-90">min</span>
            </div>
            <span className="text-lg sm:text-xl">:</span>
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="text-xs opacity-90">seg</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-white font-semibold">
            Agendado para execução
          </div>
        )}
        <div className="text-center text-white/90 text-xs sm:text-sm mt-2">
          Execução em: {formatDateTime(data.schedule.scheduledAt)}
        </div>
      </div>

      {/* Tabela de Divisão por Pacote */}
      {data.divisions && data.divisions.length > 0 && (
        <div className="bg-white rounded-lg p-4 overflow-x-auto">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Divisão por Pacote
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Pacote</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Percentual</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Cotas</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Valor por Cota</th>
              </tr>
            </thead>
            <tbody>
              {data.divisions
                .filter((division: ProfitDivisionByPackage) => !division.isClube300)
                .map((division: ProfitDivisionByPackage) => (
                  <tr key={division.packageId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center">
                        <PackageIcon className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium text-gray-900">{division.packageName}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="text-gray-700">
                        {division.totalProfitPercent.toFixed(2)}%
                        {division.percentExtra > 0 && (
                          <span className="text-green-600 ml-1">
                            ({division.percentExtra.toFixed(2)}% extra)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <div className="flex items-center justify-end">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-gray-700">
                          {division.uniqueUsersCount || division.activePackagesCount}
                          {division.uniqueUsersCount && division.uniqueUsersCount !== division.activePackagesCount && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({division.activePackagesCount} cotas)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(division.valuePerCota)}
                      </span>
                    </td>
                  </tr>
                ))}
              {/* Linha do Clube dos 300 - sempre na última linha */}
              {data.divisions
                .filter((division: ProfitDivisionByPackage) => division.isClube300)
                .map((division: ProfitDivisionByPackage) => (
                  <tr key="clube300" className="border-b border-gray-100 hover:bg-gray-50 bg-green-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center">
                        <PackageIcon className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium text-gray-900">{division.packageName}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="text-gray-700">
                        {division.totalProfitPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <div className="flex items-center justify-end">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-gray-700">
                          {division.activePackagesCount}
                          {division.totalCotas && division.totalCotas !== division.activePackagesCount && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({division.totalCotas} cotas)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(division.valuePerCota)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


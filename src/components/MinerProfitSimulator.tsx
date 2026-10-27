'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calculator, Building2, DollarSign, TrendingUp, Package as PackageIcon, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProfitSimulationResponse } from '@/types/profit-schedule'

interface MinerOption {
  id: string
  name: string
}

type MinerProfitSimulation = ProfitSimulationResponse & {
  miner?: { id: number; name: string } | null
}

export default function MinerProfitSimulator() {
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loadingMiners, setLoadingMiners] = useState(true)
  const [selectedMinerId, setSelectedMinerId] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [profitValue, setProfitValue] = useState(0)
  const [data, setData] = useState<MinerProfitSimulation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMiners = async () => {
      try {
        const response = await fetch('/api/miners')
        const result = await response.json()
        if (result.success && result.data) {
          setMiners(result.data)
        }
      } catch (err) {
        console.error('Erro ao carregar mineradoras:', err)
      } finally {
        setLoadingMiners(false)
      }
    }
    loadMiners()
  }, [])

  // Formata o input como moeda (centavos)
  const formatInputValue = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return ''
    return (parseInt(numbers) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const fetchSimulation = useCallback(async (value: number, minerId: string) => {
    if (value <= 0 || !minerId) {
      setData(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/profit-schedules/simulate?totalProfit=${value}&minerId=${minerId}`)
      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.message || 'Erro ao buscar simulação')
        setData(null)
      }
    } catch (err) {
      console.error('Erro ao buscar simulação:', err)
      setError('Erro ao buscar simulação')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce da simulação
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (profitValue > 0 && selectedMinerId) {
        fetchSimulation(profitValue, selectedMinerId)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [profitValue, selectedMinerId, fetchSimulation])

  const handleSelectMiner = (minerId: string) => {
    setSelectedMinerId(minerId)
    setInputValue('')
    setProfitValue(0)
    setData(null)
    setError(null)
  }

  const handleInputChange = (value: string) => {
    setInputValue(formatInputValue(value))
    const numbers = value.replace(/\D/g, '')
    if (numbers) {
      setProfitValue(parseInt(numbers) / 100)
    } else {
      setProfitValue(0)
      setData(null)
    }
  }

  const selectedMinerName = miners.find((miner) => miner.id === selectedMinerId)?.name
  const minerName = data?.miner?.name ?? selectedMinerName
  const packageDivisions = data?.divisions.filter((division) => !division.isClube300) ?? []
  const clube300Divisions = data?.divisions.filter((division) => division.isClube300) ?? []

  return (
    <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-xl shadow-lg p-4 sm:p-6 border-2 border-purple-500">
      <div className="mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center">
          <Calculator className="h-6 w-6 mr-2" />
          Simulador de Divisão de Lucro
        </h3>
        <p className="text-purple-100 text-sm sm:text-base">
          Escolha a mineradora e simule como um valor de lucro seria distribuído entre as cotas e o Clube dos 300
        </p>
      </div>

      {/* Mineradora */}
      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
        <label className="flex items-center text-white font-medium mb-2 text-sm sm:text-base">
          <Building2 className="h-4 w-4 mr-2" />
          Selecione a Mineradora
        </label>
        {loadingMiners ? (
          <div className="flex items-center text-white/80 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            Carregando mineradoras...
          </div>
        ) : (
          <Select value={selectedMinerId} onValueChange={handleSelectMiner}>
            <SelectTrigger className="bg-white text-gray-900 border-purple-300 focus:ring-purple-400">
              <SelectValue placeholder="Selecione a mineradora" />
            </SelectTrigger>
            <SelectContent>
              {miners.map((miner) => (
                <SelectItem key={miner.id} value={miner.id}>
                  {miner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedMinerId ? (
        <>
          {/* Valor */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
            <label htmlFor="profit-input" className="block text-white font-medium mb-2 text-sm sm:text-base">
              Valor do Lucro a Simular
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="profit-input"
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 text-lg sm:text-xl font-semibold text-gray-900 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <p className="text-white/80 text-xs sm:text-sm mt-2">Valor máximo: R$ 100.000.000,00</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mr-3"></div>
              <span className="text-white text-sm sm:text-base">Calculando...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-300 rounded-lg p-4 mb-4">
              <p className="text-white font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && profitValue === 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <Calculator className="h-12 w-12 text-white/60 mx-auto mb-3" />
              <p className="text-white/80 text-sm sm:text-base">Digite um valor acima para visualizar a simulação</p>
            </div>
          )}

          {!loading && !error && data && data.divisions && data.divisions.length > 0 && (
            <>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-white font-medium text-sm sm:text-base">Total a Dividir:</span>
                  <span className="text-white font-bold text-lg sm:text-2xl">{formatCurrency(data.totalProfit)}</span>
                </div>
                {minerName && (
                  <p className="text-white/80 text-xs sm:text-sm mt-1">Mineradora: {minerName}</p>
                )}
              </div>

              <div className="bg-white rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                  Divisão por Pacote
                </h4>

                {/* Mobile */}
                <div className="space-y-3 md:hidden">
                  {packageDivisions.map((division) => (
                    <div key={division.packageId} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center mb-2 pb-2 border-b border-gray-100">
                        <PackageIcon className="h-5 w-5 mr-2 text-purple-600" />
                        <span className="font-semibold text-gray-900">{division.packageName}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Percentual:</span>
                          <span className="font-medium text-gray-900">
                            {division.totalProfitPercent.toFixed(2)}%
                            {division.percentExtra > 0 && (
                              <span className="text-purple-600 text-xs ml-1">(+{division.percentExtra.toFixed(2)}%)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cotas:</span>
                          <span className="font-medium text-gray-900">
                            <Users className="h-3 w-3 inline mr-1 text-gray-500" />
                            {division.uniqueUsersCount || division.activePackagesCount}
                            {division.uniqueUsersCount && division.uniqueUsersCount !== division.activePackagesCount && (
                              <span className="text-xs text-gray-500 ml-1">({division.activePackagesCount})</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100">
                          <span className="text-gray-600 font-medium">Valor por Cota:</span>
                          <span className="font-bold text-purple-600 text-base">{formatCurrency(division.valuePerCota)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {clube300Divisions.map((division) => (
                    <div key="clube300" className="border-2 border-green-500 bg-green-50 rounded-lg p-3">
                      <div className="flex items-center mb-2 pb-2 border-b border-green-200">
                        <PackageIcon className="h-5 w-5 mr-2 text-green-600" />
                        <span className="font-semibold text-gray-900">{division.packageName}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Percentual:</span>
                          <span className="font-medium text-gray-900">{division.totalProfitPercent.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cotas:</span>
                          <span className="font-medium text-gray-900">
                            <Users className="h-3 w-3 inline mr-1 text-gray-500" />
                            {division.activePackagesCount}
                            {division.totalCotas != null && (
                              <span className="text-xs text-gray-500 ml-1">({division.totalCotas} cotas)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-green-200">
                          <span className="text-gray-600 font-medium">Valor por Cota:</span>
                          <span className="font-bold text-green-600 text-base">{formatCurrency(division.valuePerCota)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
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
                      {packageDivisions.map((division) => (
                        <tr key={division.packageId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center">
                              <PackageIcon className="h-4 w-4 mr-2 text-purple-600" />
                              <span className="font-medium text-gray-900">{division.packageName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="text-gray-700">
                              {division.totalProfitPercent.toFixed(2)}%
                              {division.percentExtra > 0 && (
                                <span className="text-purple-600 ml-1">({division.percentExtra.toFixed(2)}% extra)</span>
                              )}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2">
                            <div className="flex items-center justify-end">
                              <Users className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-gray-700">
                                {division.uniqueUsersCount || division.activePackagesCount}
                                {division.uniqueUsersCount && division.uniqueUsersCount !== division.activePackagesCount && (
                                  <span className="text-xs text-gray-500 ml-1">({division.activePackagesCount} cotas)</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="font-semibold text-purple-600">{formatCurrency(division.valuePerCota)}</span>
                          </td>
                        </tr>
                      ))}
                      {clube300Divisions.map((division) => (
                        <tr key="clube300" className="border-b border-gray-100 hover:bg-gray-50 bg-green-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center">
                              <PackageIcon className="h-4 w-4 mr-2 text-green-600" />
                              <span className="font-medium text-gray-900">{division.packageName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="text-gray-700">{division.totalProfitPercent.toFixed(2)}%</span>
                          </td>
                          <td className="text-right py-3 px-2">
                            <div className="flex items-center justify-end">
                              <Users className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-gray-700">
                                {division.activePackagesCount}
                                {division.totalCotas != null && (
                                  <span className="text-xs text-gray-500 ml-1">({division.totalCotas} cotas)</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="font-semibold text-green-600">{formatCurrency(division.valuePerCota)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
          <Building2 className="h-12 w-12 text-white/60 mx-auto mb-3" />
          <p className="text-white/80 text-sm sm:text-base">Escolha uma mineradora para continuar</p>
        </div>
      )}
    </div>
  )
}

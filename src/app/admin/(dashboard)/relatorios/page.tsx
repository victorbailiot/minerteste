'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Download, 
  Calendar,
  Package,
  Target,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReportData {
  metrics: {
    newUsers: number
    revenue: number
    packagesSold: number
    cyclesCompleted: number
    userGrowth: number
    revenueGrowth: number
    packageGrowth: number
    cycleGrowth: number
  }
  monthlyData: Array<{
    month: string
    users: number
    revenue: number
    packages: number
  }>
  packageDistribution: Array<{
    name: string
    count: number
    percentage: number
    color: string
  }>
}

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = async (period: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/reports?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar relatórios')
      }
      
      const reportData = await response.json()
      setData(reportData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData(selectedPeriod)
  }, [selectedPeriod])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }



  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
          <span className="text-gray-600">Carregando relatórios...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-2">Erro ao carregar relatórios</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => fetchReportData(selectedPeriod)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Nenhum dado disponível</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-gray-700" />
              Relatórios e Analytics
            </h1>
            <p className="text-gray-600 mt-2">Análise detalhada do desempenho da plataforma</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Novos Usuários</p>
              <p className="text-3xl font-bold text-blue-600">+{formatNumber(data.metrics.newUsers)}</p>
              <p className={`text-sm mt-1 ${data.metrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.metrics.userGrowth >= 0 ? '↗' : '↘'} {Math.abs(data.metrics.userGrowth)}% vs período anterior
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receita Total</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(data.metrics.revenue)}</p>
              <p className={`text-sm mt-1 ${data.metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.metrics.revenueGrowth >= 0 ? '↗' : '↘'} {Math.abs(data.metrics.revenueGrowth)}% vs período anterior
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pacotes Vendidos</p>
              <p className="text-3xl font-bold text-purple-600">{formatNumber(data.metrics.packagesSold)}</p>
              <p className={`text-sm mt-1 ${data.metrics.packageGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.metrics.packageGrowth >= 0 ? '↗' : '↘'} {Math.abs(data.metrics.packageGrowth)}% vs período anterior
              </p>
            </div>
            <Package className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ciclos Completos</p>
              <p className="text-3xl font-bold text-orange-600">{formatNumber(data.metrics.cyclesCompleted)}</p>
              <p className={`text-sm mt-1 ${data.metrics.cycleGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.metrics.cycleGrowth >= 0 ? '↗' : '↘'} {Math.abs(data.metrics.cycleGrowth)}% vs período anterior
              </p>
            </div>
            <Target className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Crescimento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Crescimento Mensal</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-4">
            {data.monthlyData.map((monthData, index) => {
              const maxRevenue = Math.max(...data.monthlyData.map(d => d.revenue))
              return (
                <div key={monthData.month} className="flex items-center">
                  <div className="w-8 text-sm text-gray-600">{monthData.month}</div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${maxRevenue > 0 ? (monthData.revenue / maxRevenue) * 100 : 0}%` }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {monthData.users} usuários
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(monthData.revenue)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Distribuição de Pacotes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Distribuição de Pacotes</h3>
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          
          <div className="space-y-4">
            {data.packageDistribution.map((package_item, index) => (
              <div key={package_item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{package_item.name}</span>
                  <span className="text-sm text-gray-600">{package_item.count} vendidos</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`${package_item.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${package_item.percentage}%` }}
                  ></div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">{package_item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Detalhada</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Novos Usuários
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacotes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversão
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.monthlyData.map((monthData, index) => (
                <tr key={monthData.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {monthData.month} 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {monthData.users}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(monthData.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {monthData.packages}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {monthData.users > 0 ? ((monthData.packages / monthData.users) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors text-left">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Relatório Mensal</div>
                <div className="text-sm text-blue-600">Gerar relatório completo</div>
              </div>
            </div>
          </button>
          
          <button className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors text-left">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Análise de Crescimento</div>
                <div className="text-sm text-green-600">Projeções e tendências</div>
              </div>
            </div>
          </button>
          
          <button className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors text-left">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">Relatório de Usuários</div>
                <div className="text-sm text-purple-600">Atividade e engajamento</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
} 
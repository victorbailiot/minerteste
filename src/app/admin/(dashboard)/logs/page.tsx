'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Trash2, Calendar, Filter } from 'lucide-react'

interface SystemLog {
  id: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  category: string
  message: string
  details?: string
  metadata?: any
  createdAt: string
}

interface LogStats {
  byCategory: Array<{ category: string; count: number }>
  byLevel: Array<{ level: string; count: number }>
}

interface LogResponse {
  success: boolean
  data: SystemLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: LogStats
  error?: string
}

const levelColors = {
  DEBUG: 'bg-gray-100 text-gray-800',
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-purple-100 text-purple-800'
}

const categoryColors = {
  CRON_JOB: 'bg-green-100 text-green-800',
  SYSTEM_EVENT: 'bg-blue-100 text-blue-800',
  SECURITY: 'bg-red-100 text-red-800',
  PERFORMANCE: 'bg-yellow-100 text-yellow-800',
  BUSINESS_LOGIC: 'bg-purple-100 text-purple-800',
  INTEGRATION: 'bg-indigo-100 text-indigo-800',
  DATABASE: 'bg-orange-100 text-orange-800'
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [stats, setStats] = useState<LogStats>({ byCategory: [], byLevel: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  
  // Filtros
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    search: '',
    startDate: '',
    endDate: ''
  })

  const fetchLogs = useCallback(async (page = 1, customFilters = filters) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...customFilters
      })

      const response = await fetch(`/api/admin/system-logs?${params}`)
      const data: LogResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar logs')
      }

      setLogs(data.data)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const clearLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar logs antigos (mais de 30 dias)?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/system-logs?days=30', {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        alert(`${data.deletedCount} logs removidos com sucesso`)
        fetchLogs(1)
      } else {
        throw new Error(data.error || 'Erro ao limpar logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar logs')
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchLogs(1, filters)
  }

  const resetFilters = () => {
    const emptyFilters = {
      category: '',
      level: '',
      search: '',
      startDate: '',
      endDate: ''
    }
    setFilters(emptyFilters)
    fetchLogs(1, emptyFilters)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getLevelColor = (level: string) => {
    return levelColors[level as keyof typeof levelColors] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryColor = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Logs do Sistema</h1>
        <Button onClick={clearLogs} variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar Logs Antigos
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byCategory.map((stat) => (
                <div key={stat.category} className="flex justify-between items-center">
                  <Badge variant="outline" className={getCategoryColor(stat.category)}>
                    {stat.category}
                  </Badge>
                  <span className="font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Por Nível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byLevel.map((stat) => (
                <div key={stat.level} className="flex justify-between items-center">
                  <Badge variant="outline" className={getLevelColor(stat.level)}>
                    {stat.level}
                  </Badge>
                  <span className="font-medium">{stat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select 
                value={filters.category} 
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Todas as categorias</option>
                <option value="CRON_JOB">Cron Jobs</option>
                <option value="SYSTEM_EVENT">Eventos do Sistema</option>
                <option value="SECURITY">Segurança</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="BUSINESS_LOGIC">Lógica de Negócio</option>
                <option value="INTEGRATION">Integrações</option>
                <option value="DATABASE">Banco de Dados</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Nível</label>
              <select 
                value={filters.level} 
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Todos os níveis</option>
                <option value="DEBUG">Debug</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar em mensagens..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Data Início</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Data Fim</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={resetFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="relative w-full rounded-lg border p-4 mb-4 bg-red-50 border-red-200">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum log encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getLevelColor(log.level)}>
                        {log.level}
                      </Badge>
                      <Badge variant="outline" className={getCategoryColor(log.category)}>
                        {log.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                  
                  <div className="font-medium">{log.message}</div>
                  
                  {log.details && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {log.details}
                    </div>
                  )}
                  
                  {log.metadata && (
                    <div className="text-sm text-gray-500">
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              
              <span className="text-sm">
                Página {pagination.page} de {pagination.pages}
              </span>
              
              <Button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                variant="outline"
                size="sm"
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
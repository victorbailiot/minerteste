'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, User, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditRecord {
  id: string
  actionType: string
  performedBy: {
    id: string
    name: string
    email: string
  }
  targetUser: {
    id: string
    name: string
    email: string
  } | null
  targetRole: {
    id: string
    name: string
  } | null
  permission: {
    id: string
    key: string
    description: string
  } | null
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
}

interface AuditFilters {
  userId: string
  roleId: string
  actionType: string
  startDate: string
  endDate: string
  page: number
  limit: number
}

export default function AuditTab() {
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AuditFilters>({
    userId: '',
    roleId: '',
    actionType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
  })
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  const actionTypes = [
    'ROLE_CREATED',
    'ROLE_UPDATED', 
    'ROLE_DELETED',
    'ROLE_ACTIVATED',
    'ROLE_DEACTIVATED',
    'PERMISSION_ASSIGNED_TO_ROLE',
    'PERMISSION_REMOVED_FROM_ROLE',
    'ROLE_ASSIGNED_TO_USER',
    'ROLE_REMOVED_FROM_USER',
    'PERMISSION_GRANTED_TO_USER',
    'PERMISSION_REVOKED_FROM_USER',
  ]

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true)
      
      const queryParams = new URLSearchParams()
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.roleId) queryParams.append('roleId', filters.roleId)
      if (filters.actionType) queryParams.append('actionType', filters.actionType)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      queryParams.append('page', filters.page.toString())
      queryParams.append('limit', filters.limit.toString())

      const res = await fetch(`/api/admin/permissions/audit?${queryParams}`)
      if (!res.ok) throw new Error('Erro ao buscar auditoria')
      
      const data = await res.json()
      setAudits(data.data.audits)
      setPagination(data.data.pagination)
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAudits()
  }, [fetchAudits])

  const handleFilterChange = (key: keyof AuditFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      userId: '',
      roleId: '',
      actionType: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20,
    })
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Data', 'Ação', 'Realizado por', 'Alvo', 'Detalhes', 'Razão'].join(','),
      ...audits.map(audit => [
        new Date(audit.createdAt).toLocaleString('pt-BR'),
        audit.actionType,
        audit.performedBy.name,
        audit.targetUser?.name || audit.targetRole?.name || '-',
        audit.newValue || audit.oldValue || '-',
        audit.reason || '-'
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria-permissoes-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      ROLE_CREATED: 'Role Criado',
      ROLE_UPDATED: 'Role Atualizado',
      ROLE_DELETED: 'Role Deletado',
      ROLE_ACTIVATED: 'Role Ativado',
      ROLE_DEACTIVATED: 'Role Desativado',
      PERMISSION_ASSIGNED_TO_ROLE: 'Permissão Atribuída ao Role',
      PERMISSION_REMOVED_FROM_ROLE: 'Permissão Removida do Role',
      ROLE_ASSIGNED_TO_USER: 'Role Atribuído ao Usuário',
      ROLE_REMOVED_FROM_USER: 'Role Removido do Usuário',
      PERMISSION_GRANTED_TO_USER: 'Permissão Concedida ao Usuário',
      PERMISSION_REVOKED_FROM_USER: 'Permissão Revogada do Usuário',
    }
    return labels[actionType] || actionType
  }

  const getActionTypeColor = (actionType: string) => {
    if (actionType.includes('CREATED') || actionType.includes('ASSIGNED') || actionType.includes('GRANTED')) {
      return 'bg-green-100 text-green-800'
    }
    if (actionType.includes('DELETED') || actionType.includes('REMOVED') || actionType.includes('REVOKED')) {
      return 'bg-red-100 text-red-800'
    }
    if (actionType.includes('UPDATED') || actionType.includes('ACTIVATED') || actionType.includes('DEACTIVATED')) {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Auditoria de Permissões</h2>
          <p className="text-gray-600">
            Histórico completo de todas as alterações de roles e permissões
          </p>
        </div>
        
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Filter className="w-5 h-5" />
          Filtros
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário ID
                </label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  placeholder="ID do usuário"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role ID
                </label>
                <input
                  type="text"
                  value={filters.roleId}
                  onChange={(e) => handleFilterChange('roleId', e.target.value)}
                  placeholder="ID do role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ação
                </label>
                <select
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os tipos</option>
                  {actionTypes.map(type => (
                    <option key={type} value={type}>
                      {getActionTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Itens por página
                </label>
                <select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Auditoria */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Realizado por
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alvo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Razão
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr key={audit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(audit.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getActionTypeColor(audit.actionType)}`}
                    >
                      {getActionTypeLabel(audit.actionType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{audit.performedBy.name}</div>
                    <div className="text-sm text-gray-500">{audit.performedBy.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {audit.targetUser ? (
                      <div>
                        <div className="text-sm text-gray-900">{audit.targetUser.name}</div>
                        <div className="text-sm text-gray-500">{audit.targetUser.email}</div>
                      </div>
                    ) : audit.targetRole ? (
                      <div className="text-sm text-gray-900 font-medium">
                        {audit.targetRole.name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {audit.permission && (
                        <div className="mb-1">
                          <span className="font-medium">Permissão:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {audit.permission.key}
                          </code>
                        </div>
                      )}
                      {audit.newValue && (
                        <div className="text-xs text-green-600">
                          <strong>Novo:</strong> {audit.newValue}
                        </div>
                      )}
                      {audit.oldValue && (
                        <div className="text-xs text-red-600">
                          <strong>Anterior:</strong> {audit.oldValue}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {audit.reason || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {audits.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum registro de auditoria encontrado</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Mostrando {audits.length} de {pagination.total} registros
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={!pagination.hasPreviousPage}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Página {filters.page} de {pagination.totalPages}
            </span>
            
            <button
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

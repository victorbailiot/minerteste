'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Search, Filter } from 'lucide-react'

interface Permission {
  id: string
  key: string
  resource: string
  action: string
  description: string
  isActive: boolean
  rolesCount: number
  usersCount: number
  createdAt: string
}

interface GroupedPermissions {
  [resource: string]: Permission[]
}

export default function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({})
  const [resources, setResources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/permissions')
      if (!res.ok) throw new Error('Erro ao buscar permissões')
      const data = await res.json()
      
      setPermissions(data.data.permissions)
      setGroupedPermissions(data.data.grouped)
      setResources(data.data.resources)
      
      // Expandir primeiro recurso por padrão
      if (data.data.resources.length > 0) {
        setExpandedResources(new Set([data.data.resources[0]]))
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleResource = (resource: string) => {
    const newExpanded = new Set(expandedResources)
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource)
    } else {
      newExpanded.add(resource)
    }
    setExpandedResources(newExpanded)
  }

  const filteredResources = resources.filter(resource => {
    if (selectedResource && resource !== selectedResource) return false
    if (!searchTerm) return true
    
    const permissions = groupedPermissions[resource] || []
    return permissions.some(p => 
      p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'users': return '👥'
      case 'transactions': return '💳'
      case 'withdrawals': return '💰'
      case 'packages': return '📦'
      case 'bonus': return '🎁'
      case 'financial': return '💼'
      case 'network': return '🌐'
      case 'parameters': return '⚙️'
      case 'logs': return '📝'
      case 'roles': return '🔐'
      case 'permissions': return '🔑'
      case 'contracts': return '📄'
      case 'reports': return '📊'
      case 'dashboard': return '🏠'
      case 'career': return '🏆'
      case 'clube300': return '💎'
      case 'vouchers': return '🎫'
      default: return '📋'
    }
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Permissões do Sistema</h2>
        <p className="text-gray-600">
          Visualize todas as permissões disponíveis, agrupadas por recurso. 
          As permissões são fixas e não podem ser editadas diretamente.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar permissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os recursos</option>
            {resources.map(resource => (
              <option key={resource} value={resource}>
                {getResourceIcon(resource)} {resource}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Permissões por Recurso */}
      <div className="space-y-4">
        {filteredResources.map(resource => {
          const resourcePermissions = groupedPermissions[resource] || []
          const isExpanded = expandedResources.has(resource)
          
          return (
            <div key={resource} className="border border-gray-200 rounded-lg">
              {/* Header do Recurso */}
              <button
                onClick={() => toggleResource(resource)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-xl">{getResourceIcon(resource)}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 capitalize">{resource}</h3>
                    <p className="text-sm text-gray-500">
                      {resourcePermissions.length} permissão(ões)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {resourcePermissions.filter(p => p.isActive).length} ativas
                  </div>
                </div>
              </button>

              {/* Permissões do Recurso */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Permissão
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Roles
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuários
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {resourcePermissions.map((permission) => (
                          <tr key={permission.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {permission.key}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">
                                {permission.description}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  permission.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {permission.isActive ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-600">
                                {permission.rolesCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-600">
                                {permission.usersCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhuma permissão encontrada com os filtros aplicados</p>
        </div>
      )}

      {/* Resumo */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Resumo do Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">Total de Permissões:</span>
            <div className="text-blue-900 font-semibold">{permissions.length}</div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Permissões Ativas:</span>
            <div className="text-blue-900 font-semibold">
              {permissions.filter(p => p.isActive).length}
            </div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Recursos:</span>
            <div className="text-blue-900 font-semibold">{resources.length}</div>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Última Atualização:</span>
            <div className="text-blue-900 font-semibold">
              {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

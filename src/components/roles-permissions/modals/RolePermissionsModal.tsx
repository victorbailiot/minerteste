'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Save, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'

interface Role {
  id: string
  name: string
  description: string
  isSystemRole: boolean
  isActive: boolean
  permissionsCount: number
  usersCount: number
  createdAt: string
  updatedAt: string
}

interface Permission {
  id: string
  key: string
  resource: string
  action: string
  description: string
  isActive: boolean
}

interface RolePermissionsModalProps {
  role: Role
  onClose: () => void
  onSuccess: () => void
}

export default function RolePermissionsModal({ role, onClose, onSuccess }: RolePermissionsModalProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set())
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState('')
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Buscar todas as permissões
      const permissionsRes = await fetch('/api/admin/permissions')
      if (!permissionsRes.ok) throw new Error('Erro ao buscar permissões')
      const permissionsData = await permissionsRes.json()

      // Buscar permissões do role
      const roleRes = await fetch(`/api/admin/roles/${role.id}/permissions`)
      if (!roleRes.ok) throw new Error('Erro ao buscar permissões do role')
      const roleData = await roleRes.json()

      setAllPermissions(permissionsData.data.permissions)
      setGroupedPermissions(permissionsData.data.grouped)
      
      const rolePermissionIds = new Set<string>(roleData.data.map((p: any) => p.id as string))
      setRolePermissions(rolePermissionIds)
      setSelectedPermissions(rolePermissionIds)
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [role.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleResourceToggle = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || []
    const resourcePermissionIds = resourcePermissions.map(p => p.id)
    
    const allSelected = resourcePermissionIds.every(id => selectedPermissions.has(id))
    
    const newSelected = new Set(selectedPermissions)
    
    if (allSelected) {
      // Desmarcar todas
      resourcePermissionIds.forEach(id => newSelected.delete(id))
    } else {
      // Marcar todas
      resourcePermissionIds.forEach(id => newSelected.add(id))
    }
    
    setSelectedPermissions(newSelected)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Calcular permissões a adicionar e remover
      const toAdd = Array.from(selectedPermissions).filter(id => !rolePermissions.has(id))
      const toRemove = Array.from(rolePermissions).filter(id => !selectedPermissions.has(id))

      // Adicionar novas permissões
      if (toAdd.length > 0) {
        const addRes = await fetch(`/api/admin/roles/${role.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissionIds: toAdd,
            reason: 'Atualização via interface administrativa',
          }),
        })

        if (!addRes.ok) {
          const data = await addRes.json()
          throw new Error(data.error || 'Erro ao adicionar permissões')
        }
      }

      // Remover permissões
      if (toRemove.length > 0) {
        const removeRes = await fetch(`/api/admin/roles/${role.id}/permissions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            permissionIds: toRemove,
            reason: 'Atualização via interface administrativa',
          }),
        })

        if (!removeRes.ok) {
          const data = await removeRes.json()
          throw new Error(data.error || 'Erro ao remover permissões')
        }
      }

      toast.success('Permissões atualizadas com sucesso')
      onSuccess()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  const getResourceIcon = (resource: string) => {
    const icons: Record<string, string> = {
      users: '👥',
      transactions: '💳',
      withdrawals: '💰',
      packages: '📦',
      bonus: '🎁',
      financial: '💼',
      network: '🌐',
      parameters: '⚙️',
      logs: '📝',
      roles: '🔐',
      permissions: '🔑',
      contracts: '📄',
      reports: '📊',
      dashboard: '🏠',
      career: '🏆',
      clube300: '💎',
      vouchers: '🎫',
    }
    return icons[resource] || '📋'
  }

  const filteredResources = Object.keys(groupedPermissions).filter(resource => {
    if (selectedResource && resource !== selectedResource) return false
    if (!searchTerm) return true
    
    const permissions = groupedPermissions[resource] || []
    return permissions.some(p => 
      p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const hasChanges = selectedPermissions.size !== rolePermissions.size || 
    !Array.from(selectedPermissions).every(id => rolePermissions.has(id))

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Gerenciar Permissões - {role.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {role.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar permissões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os recursos</option>
                {Object.keys(groupedPermissions).map(resource => (
                  <option key={resource} value={resource}>
                    {getResourceIcon(resource)} {resource}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-4">
            {filteredResources.map(resource => {
              const permissions = groupedPermissions[resource] || []
              const allSelected = permissions.every(p => selectedPermissions.has(p.id))
              const someSelected = permissions.some(p => selectedPermissions.has(p.id))

              return (
                <div key={resource} className="border border-gray-200 rounded-lg">
                  {/* Header do Recurso */}
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleResourceToggle(resource)}
                          className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : someSelected ? (
                            <div className="w-5 h-5 border-2 border-blue-600 bg-blue-100 rounded" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-xl">{getResourceIcon(resource)}</span>
                          <span className="font-semibold text-gray-900 capitalize">{resource}</span>
                        </button>
                      </div>
                      <div className="text-sm text-gray-500">
                        {permissions.filter(p => selectedPermissions.has(p.id)).length} / {permissions.length} selecionadas
                      </div>
                    </div>
                  </div>

                  {/* Permissões */}
                  <div className="divide-y divide-gray-100">
                    {permissions.map((permission) => {
                      const isSelected = selectedPermissions.has(permission.id)
                      const wasOriginallySelected = rolePermissions.has(permission.id)

                      return (
                        <div key={permission.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handlePermissionToggle(permission.id)}
                              className="flex items-center gap-3 flex-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                              <div className="text-left">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded mb-1">
                                  {permission.key}
                                </code>
                                <p className="text-sm text-gray-700">{permission.description}</p>
                              </div>
                            </button>
                            {isSelected !== wasOriginallySelected && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                isSelected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isSelected ? 'Adicionada' : 'Removida'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma permissão encontrada com os filtros aplicados</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedPermissions.size} permissão(ões) selecionada(s)
            {hasChanges && (
              <span className="ml-2 text-orange-600 font-medium">
                • Alterações não salvas
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!hasChanges || saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

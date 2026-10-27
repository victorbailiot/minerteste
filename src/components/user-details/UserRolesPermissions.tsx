'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Key, Plus, Trash2, Eye, X, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface Role {
  id: string
  name: string
  description: string
  assignedAt: string
  assignedBy: {
    name: string
  } | null
  expiresAt: string | null
}

interface Permission {
  id: string
  key: string
  resource: string
  action: string
  description: string
  type?: 'GRANT' | 'REVOKE'
  grantedAt?: string
  grantedBy?: {
    name: string
  } | null
  expiresAt?: string | null
  source?: string
}

interface AvailableRole {
  id: string
  name: string
  description: string
  isActive: boolean
}

interface AvailablePermission {
  id: string
  key: string
  resource: string
  action: string
  description: string
}

interface Props {
  userId: string
}

const UserRolesPermissions = ({ userId }: Props) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'individual' | 'effective'>('roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [individualPermissions, setIndividualPermissions] = useState<Permission[]>([])
  const [effectivePermissions, setEffectivePermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const { isSuperAdmin, loading: permissionsLoading } = usePermissions()

  // Modal states
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([])
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermission[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedPermission, setSelectedPermission] = useState<string>('')
  const [permissionType, setPermissionType] = useState<'GRANT' | 'REVOKE'>('GRANT')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch user roles
  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`)
      const data = await response.json()
      if (data.success) {
        setRoles(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar roles:', error)
    }
  }, [userId])

  // Fetch individual permissions
  const fetchIndividualPermissions = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`)
      const data = await response.json()
      if (data.success) {
        // A API retorna { granted: [], revoked: [] }
        // Precisamos combinar e adicionar o campo type
        const granted = (data.data.granted || []).map((p: any) => ({
          ...p,
          type: 'GRANT' as const
        }))
        const revoked = (data.data.revoked || []).map((p: any) => ({
          ...p,
          type: 'REVOKE' as const
        }))
        setIndividualPermissions([...granted, ...revoked])
      }
    } catch (error) {
      console.error('Erro ao carregar permissões individuais:', error)
    }
  }, [userId])

  // Fetch effective permissions
  const fetchEffectivePermissions = useCallback(async () => {
    try {
      const response = await fetch(`/api/auth/me/permissions?userId=${userId}`)
      const data = await response.json()
      if (data.success) {
        setEffectivePermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Erro ao carregar permissões efetivas:', error)
    }
  }, [userId])

  // Fetch available roles
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/roles')
      const data = await response.json()
      if (data.success) {
        setAvailableRoles(data.data.filter((r: AvailableRole) => r.isActive))
      }
    } catch (error) {
      console.error('Erro ao carregar roles disponíveis:', error)
    }
  }, [])

  // Fetch available permissions
  const fetchAvailablePermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/permissions')
      const data = await response.json()
      if (data.success) {
        setAvailablePermissions(data.data.permissions || [])
      }
    } catch (error) {
      console.error('Erro ao carregar permissões disponíveis:', error)
    }
  }, [])

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchRoles(),
      fetchIndividualPermissions(),
      fetchEffectivePermissions(),
      fetchAvailableRoles(),
      fetchAvailablePermissions()
    ])
    setLoading(false)
  }, [fetchRoles, fetchIndividualPermissions, fetchEffectivePermissions, fetchAvailableRoles, fetchAvailablePermissions])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Add role to user
  const handleAddRole = async () => {
    if (!selectedRole) {
      toast.error('Selecione um role')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRole,
          expiresAt: expiresAt || null,
          reason: reason || 'Atribuição via painel admin'
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Role atribuído com sucesso!')
        setShowAddRoleModal(false)
        setSelectedRole('')
        setExpiresAt('')
        setReason('')
        fetchData()
      } else {
        toast.error(data.error || 'Erro ao atribuir role')
      }
    } catch (error) {
      toast.error('Erro ao atribuir role')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove role from user
  const handleRemoveRole = async (roleId: string) => {
    if (!confirm('Tem certeza que deseja remover este role?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Role removido com sucesso!')
        fetchData()
      } else {
        toast.error(data.error || 'Erro ao remover role')
      }
    } catch (error) {
      toast.error('Erro ao remover role')
    }
  }

  // Add permission to user
  const handleAddPermission = async () => {
    if (!selectedPermission) {
      toast.error('Selecione uma permissão')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionId: selectedPermission,
          expiresAt: expiresAt || null,
          reason: reason || `Permissão ${permissionType === 'GRANT' ? 'concedida' : 'revogada'} via painel admin`
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Permissão ${permissionType === 'GRANT' ? 'concedida' : 'revogada'} com sucesso!`)
        setShowAddPermissionModal(false)
        setSelectedPermission('')
        setPermissionType('GRANT')
        setExpiresAt('')
        setReason('')
        fetchData()
      } else {
        toast.error(data.error || 'Erro ao adicionar permissão')
      }
    } catch (error) {
      toast.error('Erro ao adicionar permissão')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Remove permission from user
  const handleRemovePermission = async (permissionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta permissão individual?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Permissão removida com sucesso!')
        fetchData()
      } else {
        toast.error(data.error || 'Erro ao remover permissão')
      }
    } catch (error) {
      toast.error('Erro ao remover permissão')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const groupPermissionsByResource = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {}
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = []
      }
      grouped[permission.resource].push(permission)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Carregando permissões...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Roles Atribuídos</span>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                {roles.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'individual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span>Permissões Individuais</span>
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                {individualPermissions.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('effective')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'effective'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Permissões Efetivas</span>
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                {effectivePermissions.length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {isSuperAdmin() && (
        <div className="p-6">
          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Roles Atribuídos</h3>
                <button
                  onClick={() => {
                    fetchAvailableRoles()
                    setShowAddRoleModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Role</span>
                </button>
              </div>

              {roles.length > 0 ? (
                <div className="space-y-3">
                  {roles.map(role => (
                    <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">{role.name}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Atribuído em: {formatDate(role.assignedAt)}</span>
                            {role.assignedBy && (
                              <span>Por: {role.assignedBy.name}</span>
                            )}
                            {role.expiresAt && (
                              <span className="text-orange-600">
                                Expira em: {formatDate(role.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveRole(role.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum role atribuído</p>
                </div>
              )}
            </div>
          )}

          {/* Individual Permissions Tab */}
          {activeTab === 'individual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Permissões Individuais</h3>
                <button
                  onClick={() => {
                    fetchAvailablePermissions()
                    setShowAddPermissionModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Permissão</span>
                </button>
              </div>

              {individualPermissions.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupPermissionsByResource(individualPermissions)).map(([resource, perms]) => (
                    <div key={resource}>
                      <h4 className="font-semibold text-gray-900 mb-3 capitalize">{resource}</h4>
                      <div className="space-y-2">
                        {perms.map(permission => (
                          <div key={permission.id} className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${permission.type === 'GRANT'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                    }`}>
                                    {permission.type}
                                  </span>
                                  <span className="font-medium text-gray-900">{permission.key}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{permission.description}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                  {permission.grantedAt && (
                                    <span>Concedida em: {formatDate(permission.grantedAt)}</span>
                                  )}
                                  {permission.grantedBy && (
                                    <span>Por: {permission.grantedBy.name}</span>
                                  )}
                                  {permission.expiresAt && (
                                    <span className="text-orange-600">
                                      Expira em: {formatDate(permission.expiresAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemovePermission(permission.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover permissão"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma permissão individual</p>
                </div>
              )}
            </div>
          )}

          {/* Effective Permissions Tab */}
          {activeTab === 'effective' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Permissões Efetivas</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Consolidação de todas as permissões do usuário (roles + individuais)
                  </p>
                </div>
                <button
                  onClick={fetchEffectivePermissions}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Atualizar</span>
                </button>
              </div>

              {effectivePermissions.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupPermissionsByResource(effectivePermissions)).map(([resource, perms]) => (
                    <div key={resource}>
                      <h4 className="font-semibold text-gray-900 mb-3 capitalize flex items-center gap-2">
                        {resource}
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {perms.length}
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {perms.map(permission => (
                          <div key={permission.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{permission.key}</p>
                                {permission.source && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Origem: {permission.source}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma permissão efetiva encontrada</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Adicionar Role</h3>
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um role</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Expiração (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razão (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Motivo da atribuição..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddRoleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={isSubmitting || !selectedRole}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Permission Modal */}
      {showAddPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Adicionar Permissão</h3>
                <button
                  onClick={() => setShowAddPermissionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={permissionType}
                    onChange={(e) => setPermissionType(e.target.value as 'GRANT' | 'REVOKE')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="GRANT">GRANT (Conceder)</option>
                    <option value="REVOKE">REVOKE (Revogar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissão *
                  </label>
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma permissão</option>
                    {availablePermissions.map(permission => (
                      <option key={permission.id} value={permission.id}>
                        {permission.key} - {permission.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Expiração (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razão (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Motivo da concessão/revogação..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPermissionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPermission}
                  disabled={isSubmitting || !selectedPermission}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserRolesPermissions


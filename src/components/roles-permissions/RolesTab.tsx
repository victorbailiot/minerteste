'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Key, Users as UsersIcon, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import CreateRoleModal from './modals/CreateRoleModal'
import EditRoleModal from './modals/EditRoleModal'
import RolePermissionsModal from './modals/RolePermissionsModal'
import RoleUsersModal from './modals/RoleUsersModal'

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

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/roles')
      if (!res.ok) throw new Error('Erro ao buscar roles')
      const data = await res.json()
      setRoles(data.data)
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar roles')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (role: Role) => {
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !role.isActive }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar role')

      toast.success(`Role ${role.isActive ? 'desativado' : 'ativado'} com sucesso`)
      fetchRoles()
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao atualizar role')
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.isSystemRole) {
      toast.error('Não é permitido deletar roles do sistema')
      return
    }

    if (!confirm(`Tem certeza que deseja deletar o role "${role.name}"?`)) return

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao deletar role')
      }

      toast.success('Role deletado com sucesso')
      fetchRoles()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao deletar role')
    }
  }

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Criar Role
        </button>
      </div>

      {/* Roles Table */}
      <div className="overflow-x-auto shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                Descrição
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissões
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuários
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRoles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{role.name}</span>
                    {role.isSystemRole && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Sistema
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 min-w-[300px] max-w-[400px]">
                  <span className="text-sm text-gray-600 break-words">{role.description}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => {
                      setSelectedRole(role)
                      setShowPermissionsModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {role.permissionsCount}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => {
                      setSelectedRole(role)
                      setShowUsersModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {role.usersCount}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      role.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {role.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setSelectedRole(role)
                        setShowPermissionsModal(true)
                      }}
                      className="flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Gerenciar Permissões"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRole(role)
                        setShowUsersModal(true)
                      }}
                      className="flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ver Usuários"
                    >
                      <UsersIcon className="w-4 h-4" />
                    </button>
                    {!role.isSystemRole && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRole(role)
                            setShowEditModal(true)
                          }}
                          className="flex items-center justify-center w-8 h-8 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(role)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                            role.isActive 
                              ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          }`}
                          title={role.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {role.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum role encontrado
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchRoles()
          }}
        />
      )}

      {showEditModal && selectedRole && (
        <EditRoleModal
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false)
            setSelectedRole(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedRole(null)
            fetchRoles()
          }}
        />
      )}

      {showPermissionsModal && selectedRole && (
        <RolePermissionsModal
          role={selectedRole}
          onClose={() => {
            setShowPermissionsModal(false)
            setSelectedRole(null)
          }}
          onSuccess={() => {
            fetchRoles()
          }}
        />
      )}

      {showUsersModal && selectedRole && (
        <RoleUsersModal
          role={selectedRole}
          onClose={() => {
            setShowUsersModal(false)
            setSelectedRole(null)
          }}
          onSuccess={() => {
            fetchRoles()
          }}
        />
      )}
    </div>
  )
}


'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, User, Trash2, Calendar, AlertCircle } from 'lucide-react'
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

interface UserWithRole {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  isActive: boolean
  assignedAt: string
  assignedBy: string
  expiresAt?: string
}

interface RoleUsersModalProps {
  role: Role
  onClose: () => void
  onSuccess: () => void
}

export default function RoleUsersModal({ role, onClose, onSuccess }: RoleUsersModalProps) {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [removingUser, setRemovingUser] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/roles/${role.id}/users`)
      if (!res.ok) throw new Error('Erro ao buscar usuários do role')
      
      const data = await res.json()
      setUsers(data.data || [])
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [role.id])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário do role?')) {
      return
    }

    try {
      setRemovingUser(userId)
      
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: role.id,
          reason: 'Remoção via interface administrativa',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao remover usuário do role')
      }

      toast.success('Usuário removido do role com sucesso')
      fetchUsers() // Recarregar lista
      onSuccess()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao remover usuário')
    } finally {
      setRemovingUser(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getExpirationStatus = (expiresAt?: string) => {
    if (!expiresAt) return null
    
    const expirationDate = new Date(expiresAt)
    const now = new Date()
    const diffDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { status: 'expired', text: 'Expirado', color: 'text-red-600' }
    } else if (diffDays <= 7) {
      return { status: 'expiring', text: `Expira em ${diffDays} dia(s)`, color: 'text-orange-600' }
    } else {
      return { status: 'valid', text: `Expira em ${diffDays} dias`, color: 'text-green-600' }
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              Usuários com Role - {role.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {users.length} usuário(s) com este role
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Avisos */}
        {role.isSystemRole && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">
                Este é um role do sistema. Remover usuários pode afetar o funcionamento do sistema.
              </p>
            </div>
          </div>
        )}

        {/* Lista de Usuários */}
        <div className="overflow-y-auto max-h-96">
          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm">Este role não possui usuários atribuídos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => {
                const expirationStatus = getExpirationStatus(user.expiresAt)
                
                return (
                  <div key={user.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      {/* Informações do Usuário */}
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <User className="w-6 h-6 text-gray-500" />
                          )}
                        </div>

                        {/* Dados */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          
                          {/* Status e Expiração */}
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                            
                            {expirationStatus && (
                              <span className={`text-xs ${expirationStatus.color}`}>
                                {expirationStatus.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informações de Atribuição */}
                      <div className="text-right text-sm text-gray-600">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Atribuído em {formatDate(user.assignedAt)}</span>
                        </div>
                        <p>Por: {user.assignedBy}</p>
                        
                        {user.expiresAt && (
                          <p className="mt-1">
                            Expira em: {formatDate(user.expiresAt)}
                          </p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          disabled={removingUser === user.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remover do role"
                        >
                          {removingUser === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {users.length} usuário(s) com role {role.name}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

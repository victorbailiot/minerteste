'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { ShieldX, Plus, Search, Filter, Edit2, Trash2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BlacklistModal from '@/components/modals/BlacklistModal'
import ConfirmationModal from '@/components/modals/ConfirmationModal'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getFlatBlacklistOptions } from '@/lib/constants/blacklist-resources'

interface BlacklistEntry {
  id: string
  userId: string
  resource: string
  action: string | null
  reason: string
  addedAt: string
  expiresAt: string | null
  isActive: boolean
  isExpired: boolean
  user: {
    id: string
    name: string
    email: string
  }
  addedByUser: {
    id: string
    name: string
    email: string
  }
}

interface BlacklistGroupedByUser {
  userId: string
  user: { id: string; name: string; email: string }
  entries: BlacklistEntry[]
  /** Entrada mais recente para status e data de adição */
  latestEntry: BlacklistEntry
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const getResourceLabel = (resource: string, action: string | null): string => {
  const options = getFlatBlacklistOptions()
  const opt = options.find(
    (o) => o.resource === resource && (o.action ?? null) === (action ?? null)
  )
  return opt?.label ?? `${resource}${action ? ` – ${action}` : ''}`
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedEntry, setSelectedEntry] = useState<BlacklistEntry | null>(null)
  /** No modo edição: todas as entradas do mesmo usuário (para preencher recursos já bloqueados) */
  const [entriesForUser, setEntriesForUser] = useState<BlacklistEntry[]>([])
  
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  /** IDs das entradas a remover (pode ser várias para remover todas do usuário) */
  const [entriesToDelete, setEntriesToDelete] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  /** Agrupa entradas por usuário para exibição */
  const groupedByUser = useMemo((): BlacklistGroupedByUser[] => {
    const byUser = new Map<string, BlacklistEntry[]>()
    for (const entry of entries) {
      const list = byUser.get(entry.userId) ?? []
      list.push(entry)
      byUser.set(entry.userId, list)
    }
    return Array.from(byUser.entries()).map(([userId, userEntries]) => {
      const sorted = [...userEntries].sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      )
      return {
        userId,
        user: userEntries[0].user,
        entries: userEntries,
        latestEntry: sorted[0]
      }
    })
  }, [entries])

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        isActive: statusFilter,
        includeExpired: 'true'
      })

      if (resourceFilter !== 'all') {
        params.append('resource', resourceFilter)
      }

      const response = await fetch(`/api/admin/blacklist?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setEntries(data.data.entries)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Erro ao buscar blacklist:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, resourceFilter, statusFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAddNew = () => {
    setSelectedEntry(null)
    setModalMode('add')
    setModalOpen(true)
  }

  const handleEdit = (group: BlacklistGroupedByUser) => {
    setSelectedEntry(group.latestEntry)
    setEntriesForUser(group.entries)
    setModalMode('edit')
    setModalOpen(true)
  }

  const handleDeleteClick = (group: BlacklistGroupedByUser) => {
    setEntriesToDelete(group.entries.map((e) => e.id))
    setConfirmModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (entriesToDelete.length === 0) return

    setDeleting(true)
    try {
      for (const entryId of entriesToDelete) {
        const response = await fetch(`/api/admin/blacklist/${entryId}`, {
          method: 'DELETE'
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.error)
      }
      fetchEntries()
      setConfirmModalOpen(false)
      setEntriesToDelete([])
    } catch (error) {
      console.error('Erro ao deletar entrada:', error)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (group: BlacklistGroupedByUser) => {
    const hasInactive = group.entries.some((e) => !e.isActive)
    const hasExpired = group.entries.some((e) => e.isExpired)
    const hasActive = group.entries.some((e) => e.isActive && !e.isExpired)

    if (hasInactive && !hasActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <AlertCircle className="w-3 h-3" />
          Inativo
        </span>
      )
    }

    if (hasExpired && !hasActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <Clock className="w-3 h-3" />
          Expirado
        </span>
      )
    }

    if (hasActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <ShieldX className="w-3 h-3" />
          Ativo
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <AlertCircle className="w-3 h-3" />
        Inativo
      </span>
    )
  }

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedByUser
    const search = searchTerm.toLowerCase()
    return groupedByUser.filter((group) =>
      group.entries.some(
        (entry) =>
          entry.user.name.toLowerCase().includes(search) ||
          entry.user.email.toLowerCase().includes(search) ||
          entry.resource.toLowerCase().includes(search) ||
          entry.action?.toLowerCase().includes(search) ||
          entry.reason.toLowerCase().includes(search)
      )
    )
  }, [groupedByUser, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldX className="w-7 h-7 text-red-500" />
            Lista Negra (Blacklist)
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie restrições de acesso de usuários a funcionalidades específicas
          </p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Restrição
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          Filtros
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar usuário, recurso ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro de recurso */}
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os recursos</option>
            <option value="users">Usuários</option>
            <option value="transactions">Transações</option>
            <option value="withdrawals">Saques</option>
            <option value="network">Rede</option>
            <option value="packages">Pacotes</option>
            <option value="dashboard">Dashboard</option>
            <option value="admin">Admin</option>
            <option value="bonus">Bônus</option>
            <option value="cashback">Receber cashback</option>
            <option value="profits">Divisão de Lucros</option>
            <option value="contracts">Contratos</option>
            <option value="support">Suporte</option>
          </select>

          {/* Filtro de status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Entradas</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShieldX className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bloqueios Ativos</p>
              <p className="text-2xl font-bold text-red-600">
                {entries.filter(e => e.isActive && !e.isExpired).length}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expirados</p>
              <p className="text-2xl font-bold text-orange-600">
                {entries.filter(e => e.isExpired).length}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurso / Ação
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adicionado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma entrada encontrada
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{group.user.name}</p>
                        <p className="text-sm text-gray-500">{group.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {group.entries.map((entry) => (
                          <span
                            key={entry.id}
                            className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {getResourceLabel(entry.resource, entry.action)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">
                        {group.latestEntry.reason}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {getStatusBadge(group)}
                        {group.latestEntry.expiresAt && (
                          <p className="text-xs text-gray-500">
                            Expira {formatDistanceToNow(new Date(group.latestEntry.expiresAt), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-gray-700">
                          {formatDistanceToNow(new Date(group.latestEntry.addedAt), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {group.latestEntry.addedByUser.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(group)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <BlacklistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchEntries}
        entry={selectedEntry}
        entriesForUser={entriesForUser.map((e) => ({ resource: e.resource, action: e.action }))}
        mode={modalMode}
      />

      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false)
          setEntriesToDelete([])
        }}
        onConfirm={handleDeleteConfirm}
        title="Remover da Blacklist"
        message={
          entriesToDelete.length > 1
            ? 'Tem certeza que deseja remover todas as restrições deste usuário da blacklist? O usuário voltará a ter acesso normal às funcionalidades bloqueadas.'
            : 'Tem certeza que deseja remover esta restrição da blacklist? O usuário voltará a ter acesso normal à funcionalidade.'
        }
        confirmText="Remover"
        cancelText="Cancelar"
        type="danger"
        isLoading={deleting}
      />
    </div>
  )
}

"use client"
import { useEffect, useState } from 'react'

const formatActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    WITHDRAWAL_APPROVED: 'Saque aprovado',
    WITHDRAWAL_REJECTED: 'Saque rejeitado',
    WITHDRAWAL_COMPLETED: 'Saque concluído',
    WITHDRAWAL_PIX_SENT: 'PIX Bradesco enviado (saque)',
    USER_CREATED: 'Usuário criado',
    USER_UPDATED: 'Usuário atualizado',
    USER_ACTIVATED: 'Usuário ativado',
    USER_DEACTIVATED: 'Usuário desativado',
    PACKAGE_UPDATED: 'Pacote atualizado',
    PACKAGE_ACTIVATED: 'Pacote ativado',
    PACKAGE_DEACTIVATED: 'Pacote desativado',
    PARAMETER_UPDATED: 'Parâmetro atualizado',
    BONUS_ADJUSTED: 'Bônus ajustado',
    BONUS_GENERATED: 'Bônus de indicação gerado',
    DIRECT_BONUS_FIX: 'Correção bônus direto',
    TRANSACTION_UPDATED: 'Transação atualizada',
    FINANCIAL_TRANSACTION_CREATED: 'Lançamento financeiro criado',
    FINANCIAL_TRANSACTION_UPDATED: 'Lançamento financeiro atualizado',
    POINTS_RECALCULATED: 'Pontos recalculados',
    SPONSOR_CHANGED: 'Patrocinador alterado',
    OTHER: 'Outro',
  }
  return map[action] ?? action.replaceAll('_', ' ').toLowerCase().replace(/^(\w)/, m => m.toUpperCase())
}

type AuditItem = {
  id: number
  actionType: string
  description: string
  resourceType: string
  resourceId: number | null
  createdAt: string
  performedByUser?: { id: number; name: string | null; email: string | null }
  targetUser?: { id: number; name: string | null; email: string | null } | null
  oldValue?: string | null
  newValue?: string | null
}

export default function LogsAuditoriaPage() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [filters, setFilters] = useState({
    actionType: '',
    resourceType: '',
    performedByTerm: '',
    targetTerm: '',
  })

  const load = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (filters.actionType) params.set('actionType', filters.actionType)
      if (filters.resourceType) params.set('resourceType', filters.resourceType)
      if (filters.performedByTerm) params.set('performedByTerm', filters.performedByTerm)
      if (filters.targetTerm) params.set('targetTerm', filters.targetTerm)
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.items)
        setTotalPages(data.pagination.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/audit/actions')
        const data = await res.json()
        if (data?.success && Array.isArray(data.data)) {
          setActionTypes(data.data)
        }
      } catch {
        // silencioso
      }
    })()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Auditoria de Ações Administrativas</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <select
          className="border rounded px-3 py-2"
          value={filters.actionType}
          onChange={e => setFilters(f => ({ ...f, actionType: e.target.value }))}
        >
          <option value="">Todas as ações</option>
          {actionTypes.length
            ? actionTypes.map(t => (
              <option key={t} value={t}>
                {formatActionLabel(t)}
              </option>
            ))
            : (
              <>
                <option value="WITHDRAWAL_APPROVED">Saque aprovado</option>
                <option value="WITHDRAWAL_REJECTED">Saque rejeitado</option>
                <option value="WITHDRAWAL_COMPLETED">Saque concluído</option>
                <option value="USER_CREATED">Usuário criado</option>
                <option value="USER_UPDATED">Usuário atualizado</option>
                <option value="USER_ACTIVATED">Usuário ativado</option>
                <option value="USER_DEACTIVATED">Usuário desativado</option>
                <option value="PACKAGE_UPDATED">Pacote atualizado</option>
                <option value="PACKAGE_ACTIVATED">Pacote ativado</option>
                <option value="PACKAGE_DEACTIVATED">Pacote desativado</option>
                <option value="PARAMETER_UPDATED">Parâmetro atualizado</option>
                <option value="BONUS_ADJUSTED">Bônus ajustado</option>
                <option value="BONUS_GENERATED">Bônus de indicação gerado</option>
                <option value="DIRECT_BONUS_FIX">Correção bônus direto</option>
                <option value="TRANSACTION_UPDATED">Transação atualizada</option>
                <option value="FINANCIAL_TRANSACTION_CREATED">Lançamento financeiro criado</option>
                <option value="FINANCIAL_TRANSACTION_UPDATED">Lançamento financeiro atualizado</option>
                <option value="POINTS_RECALCULATED">Pontos recalculados</option>
                <option value="SPONSOR_CHANGED">Patrocinador alterado</option>
                <option value="OTHER">Outro</option>
              </>
            )}
        </select>
        <input className="border rounded px-3 py-2" placeholder="Resource type" value={filters.resourceType} onChange={e => setFilters(f => ({ ...f, resourceType: e.target.value }))} />
        <input className="border rounded px-3 py-2" placeholder="Admin (nome, código, ID)" value={filters.performedByTerm} onChange={e => setFilters(f => ({ ...f, performedByTerm: e.target.value }))} />
        <input className="border rounded px-3 py-2" placeholder="Usuário alvo (nome, código, ID)" value={filters.targetTerm} onChange={e => setFilters(f => ({ ...f, targetTerm: e.target.value }))} />
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" 
          onClick={() => { setPage(1); void load() }}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Filtrar'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Data</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Recurso</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário alvo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[320px]">Descrição</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{formatActionLabel(item.actionType)}</td>
                <td className="px-4 py-3 text-gray-700 break-words">{item.resourceType}{item.resourceId ? ` #${item.resourceId}` : ''}</td>
                <td className="px-4 py-3 text-gray-700 break-words">{item.performedByUser?.name || item.performedByUser?.email || '-'}</td>
                <td className="px-4 py-3 text-gray-700 break-words">{item.targetUser?.name || item.targetUser?.email || '-'}</td>
                <td className="px-4 py-3 text-gray-800 align-top">
                  <p className="whitespace-pre-wrap break-words leading-relaxed min-w-[280px]">
                    {item.description}
                  </p>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button disabled={loading || page <= 1} className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
        <span>página {page} de {totalPages}</span>
        <button disabled={loading || page >= totalPages} className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => p + 1)}>Próxima</button>
      </div>
    </div>
  )
}



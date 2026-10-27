'use client'

// Forçar renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Filter, CheckSquare, Shield, Ban, User, Wallet, Send } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { buildBradescoPixIdTransacaoForWithdrawal } from '@/lib/bradesco/id-transacao'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'

interface Withdrawal {
  id: number
  amount: number
  taxa: number | null
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'FAILED'
  bankAccount: string
  pix: string | null
  requestedAt: string
  processedAt: string | null
  rejectedReason: string | null
  processedBy: number | null
  transferId: string | null
  transferStatus: string | null
  user: {
    id: number
    name: string
    email: string
    phone: string
    bankAccount?: {
      id: string
      recipientId: string
      bankName: string
      accountNumber: string
    } | null
    pixKey?: {
      pixKey: string
      pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
      accountHolderName: string
      bankName: string
    } | null
  }
  openPixPaymentRequest?: {
    correlationID: string
    qrCodeImage: string
    brCode: string
    expiresAt: string
  } | null
}

interface WithdrawalResponse {
  success: boolean
  data: Withdrawal[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Modal de confirmação reutilizável
interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', loading, onConfirm, onCancel }) => (
  <Modal isOpen={isOpen}
    onClose={onCancel}
    maxWidth="max-w-md"
    title={title}
    footerButtons={
      <div className="flex flex-col sm:flex-row justify-end gap-2 w-full">
        <button onClick={onCancel} className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm" disabled={loading}>{cancelText}</button>
        <button onClick={onConfirm} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm" disabled={loading}>{loading ? 'Processando...' : confirmText}</button>
      </div>
    }>
    <div className="space-y-4">
      {description && (
        <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line break-words">{description}</p>
      )}

    </div>
  </Modal>
)

export default function SaquesPage() {
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    page: 1,
    limit: 20
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [stats, setStats] = useState({
    totalPending: 0,
    totalCompleted: 0,
    totalBalance: 0
  })
  const [bulkPaying, setBulkPaying] = useState(false)
  const [bulkPayConfirm, setBulkPayConfirm] = useState<{ isOpen: boolean; payables: Withdrawal[] }>({ isOpen: false, payables: [] })

  // Estado para modal de confirmação
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description?: string
    confirmText?: string
    onConfirm: (() => void) | null
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    onConfirm: null
  })

  // Estado para modal de envio PIX Bradesco
  const [pixModal, setPixModal] = useState<{
    isOpen: boolean
    withdrawalId: number | null
    sendingPix: boolean
    result: { e2eid?: string; status?: string; recebedor?: { nome: string; metodo: string; detalhe: string } } | null
    withdrawal: Withdrawal | null
    form: {
      idtransacao: string
      valor: string
      descricao: string
    }
  }>({
    isOpen: false,
    withdrawalId: null,
    sendingPix: false,
    result: null,
    withdrawal: null,
    form: {
      idtransacao: '',
      valor: '',
      descricao: '',
    }
  })

  /** Destino de pagamento ainda ativo no perfil (API já ignora conta/PIX com excludedAt). */
  const hasActivePayoutDestination = (w: Withdrawal) =>
    !!(w.user.pixKey || w.user.bankAccount)

  const openPixModal = (withdrawal: Withdrawal) => {
    if (!hasActivePayoutDestination(withdrawal)) {
      toast.error(
        'Este usuário não possui conta bancária nem chave PIX ativas no perfil. Não é possível enviar PIX até cadastrar um destino válido.'
      )
      return
    }

    const valorLiquido = withdrawal.taxa
      ? withdrawal.amount * (1 - withdrawal.taxa / 100)
      : withdrawal.amount

    setPixModal({
      isOpen: true,
      withdrawalId: withdrawal.id,
      sendingPix: false,
      result: null,
      withdrawal,
      form: {
        idtransacao: buildBradescoPixIdTransacaoForWithdrawal(withdrawal.id),
        valor: valorLiquido.toFixed(2),
        descricao: `Saque Minerstone`,
      }
    })
  }

  const handleBulkPayClick = async () => {
    setBulkPaying(true)
    try {
      const res = await fetch('/api/admin/withdrawals?status=PENDING&limit=500')
      const data: WithdrawalResponse = await res.json()

      if (!data.success || !data.data?.length) {
        toast.info('Nenhuma solicitação de saque para pagar')
        return
      }

      const payables = data.data.filter(
        w => hasActivePayoutDestination(w) && w.status === 'APPROVED'
      )

      if (payables.length === 0) {
        toast.info('Nenhuma solicitação aprovada com PIX ou conta bancária ativos no perfil para pagar')
        return
      }

      setBulkPayConfirm({ isOpen: true, payables })
    } catch {
      toast.error('Erro ao carregar solicitações')
    } finally {
      setBulkPaying(false)
    }
  }

  const handleBulkPayConfirm = async () => {
    setBulkPayConfirm(c => ({ ...c, isOpen: false }))
    setBulkPaying(true)

    try {
      const res = await fetch('/api/payments/bradesco/transfer-bulk', { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.success) {
        const { successCount = 0, failCount = 0, method = 'batch' } = data.data ?? {}
        toast.success(
          successCount > 0
            ? `${successCount} PIX enviado(s) com sucesso${failCount > 0 ? `. ${failCount} falha(s).` : ''} (${method === 'batch' ? 'lote' : 'individual'})`
            : (data.message || 'Processamento concluído')
        )
        await Promise.all([loadWithdrawals(), loadStats()])
      } else {
        toast.error(data.error || 'Erro ao processar pagamentos em massa', { duration: 6000 })
      }
    } catch {
      toast.error('Erro de rede ao processar pagamentos')
    } finally {
      setBulkPayConfirm({ isOpen: false, payables: [] })
      setBulkPaying(false)
    }
  }

  const handleSendPix = async () => {
    const { form, withdrawalId, withdrawal: modalWithdrawal } = pixModal
    if (!withdrawalId) return
    if (modalWithdrawal && !hasActivePayoutDestination(modalWithdrawal)) {
      toast.error('Destino de pagamento não está mais ativo no perfil do usuário.')
      return
    }

    setPixModal(m => ({ ...m, sendingPix: true, result: null }))

    try {
      const res = await fetch('/api/payments/bradesco/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          idtransacao: form.idtransacao,
          valor: form.valor,
          descricao: form.descricao || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('PIX enviado com sucesso!')
        setPixModal(m => ({ ...m, sendingPix: false, result: { ...data.data, recebedor: data.recebedor } }))
        await Promise.all([loadWithdrawals(), loadStats()])
        setTimeout(() => setPixModal(m => ({ ...m, isOpen: false })), 1500)
      } else {
        const msg = data.error || 'Erro ao enviar PIX'
        const detalhe = data.detalhe ? `\n${data.detalhe}` : ''
        toast.error(`${msg}${detalhe}`, { duration: 8000 })
        // Gera novo idtransacao para permitir retentar sem conflito de ID duplicado
        const novoId =
          pixModal.withdrawalId != null
            ? buildBradescoPixIdTransacaoForWithdrawal(pixModal.withdrawalId)
            : pixModal.form.idtransacao
        setPixModal(m => ({ ...m, sendingPix: false, form: { ...m.form, idtransacao: novoId } }))
      }
    } catch {
      toast.error('Erro de rede ao enviar PIX')
      setPixModal(m => ({ ...m, sendingPix: false }))
    }
  }

  // Carregar estatísticas
  const loadStats = useCallback(async () => {
    try {
      const statsResponse = await fetch('/api/admin/withdrawals/stats')
      const statsData = await statsResponse.json()

      console.log('📊 Stats Data:', statsData)

      if (statsData.success) {
        console.log('✅ Atualizando stats:', {
          totalPending: statsData.totalPending || 0,
          totalCompleted: statsData.totalCompleted || 0,
          totalBalance: statsData.totalBalance || 0
        })
        setStats(prev => ({
          ...prev,
          totalPending: statsData.totalPending || 0,
          totalCompleted: statsData.totalCompleted || 0,
          totalBalance: statsData.totalBalance || 0
        }))
      } else {
        console.error('❌ Erro ao buscar stats:', statsData)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }, [])

  // Carregar saques (silent: true = só atualiza dados, sem spinner que some com a lista)
  const loadWithdrawals = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    try {
      if (!silent) setLoading(true)
      const params = new URLSearchParams()

      // Adicionar filtros aos parâmetros
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      params.append('page', filters.page.toString())
      params.append('limit', filters.limit.toString())

      const response = await fetch(`/api/admin/withdrawals?${params}`)
      const data: WithdrawalResponse = await response.json()

      if (data.success) {
        setWithdrawals(data.data)
        setPagination(data.pagination)
      } else {
        toast.error('Erro ao carregar saques')
      }
    } catch (error) {
      console.error('Erro ao carregar saques:', error)
      toast.error('Erro ao carregar saques')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters])

  // Processar saque (aprovar/rejeitar/finalizar)
  const handleProcessWithdrawal = async (withdrawalId: number, action: 'approve' | 'reject' | 'complete' | 'undo_approval', rejectedReason?: string) => {
    try {
      setProcessingId(withdrawalId)

      const response = await fetch('/api/admin/withdrawals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          withdrawalId,
          action,
          rejectedReason
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        // Atualiza lista em segundo plano (sem esconder a tabela com loading)
        await Promise.all([loadWithdrawals({ silent: true }), loadStats()])
      } else {
        // Tratar erros específicos
        if (data.error && data.error.includes('stripe_account_id')) {
          toast.error('Conta Stripe Connect não cadastrada', {
            duration: 8000,
            description: 'O usuário precisa ter uma conta Stripe Connect cadastrada (stripe_account_id) antes de receber saques via Stripe Connect.'
          })
        } else if (data.error && data.error.includes('conta Stripe conectada')) {
          toast.error('Conta Stripe Connect inválida', {
            duration: 8000,
            description: 'A conta Stripe conectada do usuário é inválida ou não foi encontrada. Verifique o stripe_account_id cadastrado.'
          })
        } else if (data.error && data.error.includes('Saldo insuficiente')) {
          toast.error('Saldo Insuficiente na Conta Stripe', {
            duration: 8000,
            description: 'A conta Stripe principal não possui saldo suficiente para processar esta transferência.'
          })
        } else if (data.error && data.error.includes('conta bancária cadastrada')) {
          toast.error('Usuário precisa cadastrar conta bancária antes de receber saques via Stripe', {
            duration: 8000,
            description: 'O usuário deve acessar seu perfil e cadastrar uma conta bancária válida.'
          })
        } else {
          toast.error(data.error || 'Erro ao processar saque')
        }
      }
    } catch (error) {
      console.error('Erro ao processar saque:', error)
      toast.error('Erro ao processar saque')
    } finally {
      setProcessingId(null)
    }
  }

  // Aprovar saque
  const handleApprove = (withdrawalId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar aprovação',
      description: 'Deseja realmente aprovar este saque?',
      confirmText: 'Aprovar',
      onConfirm: () => {
        setConfirmModal(m => ({ ...m, isOpen: false }))
        handleProcessWithdrawal(withdrawalId, 'approve')
      }
    })
  }

  // Rejeitar saque
  const handleReject = (withdrawalId: number) => {
    let reason = ''
    const askReason = () => {
      reason = prompt('Motivo da rejeição:') || ''
      if (reason && reason.trim()) {
        setConfirmModal({
          isOpen: true,
          title: 'Confirmar rejeição',
          description: `Deseja realmente rejeitar este saque?\nMotivo: ${reason.trim()}`,
          confirmText: 'Rejeitar',
          onConfirm: () => {
            setConfirmModal(m => ({ ...m, isOpen: false }))
            handleProcessWithdrawal(withdrawalId, 'reject', reason.trim())
          }
        })
      } else if (reason !== null) {
        toast.error('Motivo da rejeição é obrigatório')
      }
    }
    askReason()
  }


  const handleComplete = (withdrawalId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Finalizar saque',
      description: 'Deseja realmente finalizar este saque? O status será alterado para concluído.',
      confirmText: 'Finalizar',
      onConfirm: () => {
        setConfirmModal(m => ({ ...m, isOpen: false }))
        handleProcessWithdrawal(withdrawalId, 'complete')
      }
    })
  }

  const handleUndoApproval = (withdrawalId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reverter aprovação',
      description:
        'Deseja realmente reverter a aprovação deste saque? O status voltará para pendente e será possível aprovar ou rejeitar novamente.',
      confirmText: 'Reverter',
      onConfirm: () => {
        setConfirmModal(m => ({ ...m, isOpen: false }))
        handleProcessWithdrawal(withdrawalId, 'undo_approval')
      }
    })
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  // Navegar para página de detalhes do usuário
  const handleUserClick = (userId: number) => {
    router.push(`/admin/usuarios/${userId}`)
  }

  // Obter status traduzido
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente'
      case 'APPROVED': return 'Aprovado'
      case 'COMPLETED': return 'Concluído'
      case 'FAILED': return 'Rejeitado'
      default: return status
    }
  }

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Função para atualizar tudo
  const handleRefresh = useCallback(async () => {
    await Promise.all([loadWithdrawals(), loadStats()])
  }, [loadWithdrawals, loadStats])

  // Handler do filtro de status
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault()
    const newStatus = e.target.value
    setFilters(prev => ({ ...prev, status: newStatus, page: 1 }))
  }, [])

  // Carregar dados iniciais e quando filtros mudarem
  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  // Carregar estatísticas na montagem
  useEffect(() => {
    loadStats()
  }, [loadStats])

  const pendingCount = withdrawals.filter(w => w.status === 'PENDING').length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 flex-shrink-0" />
              <span className="break-words">Gerenciamento de Saques</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Aprove ou rejeite solicitações de saque</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="FAILED">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card: Total de Saques Pendentes */}
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-yellow-600">Saques Pendentes</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-900 break-words">
                  {formatCurrency(stats.totalPending)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Total de Saques Concluídos */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-green-600">Saques Concluídos</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 break-words">
                  {formatCurrency(stats.totalCompleted)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Saldo Disponível para Saque */}
        <div
          className="cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => router.push('/admin/saldos')}
        >
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-blue-600">Saldo Disponível</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-900 break-words">
                    {formatCurrency(stats.totalBalance)}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Clique para ver detalhes</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                  <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card: Saldo Stripe - OCULTO TEMPORARIAMENTE
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-purple-600">Saldo Stripe</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-900 break-words">
                  ${(stats.stripeBalance / 100).toFixed(2)}
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  Pendente: ${(stats.stripePending / 100).toFixed(2)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        */}
      </div>

      {/* Botão PAGAR em massa */}
      <div className="flex justify-center sm:justify-end">
        <button
          onClick={handleBulkPayClick}
          disabled={bulkPaying || loading}
          className="px-6 py-3 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          {bulkPaying ? 'Carregando...' : 'PAGAR'}
        </button>
      </div>

      {/* Lista de saques */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Solicitações de Saque ({pendingCount} pendentes)
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm sm:text-base text-gray-500 mt-2">Carregando saques...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-sm sm:text-base text-gray-500 mt-2">Nenhuma solicitação de saque encontrada</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors self-start"
                          onClick={() => handleUserClick(withdrawal.user.id)}
                          title="Clique para ver detalhes do usuário"
                        >
                          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 hover:text-blue-600 break-words">{withdrawal.user.name}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)} self-start sm:self-auto`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="space-y-1">
                          <div
                            className="cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                            onClick={() => handleUserClick(withdrawal.user.id)}
                            title="Clique para ver detalhes do usuário"
                          >
                            <p className="break-words"><strong>Email:</strong> <span className="hover:text-blue-600">{withdrawal.user.email}</span></p>
                            <p className="break-words"><strong>Telefone:</strong> <span className="hover:text-blue-600">{withdrawal.user.phone}</span></p>

                            <div>
                              {withdrawal.taxa ? (
                                <>
                                  <p><strong>Valor:</strong> {formatCurrency(withdrawal.amount * (1 - withdrawal.taxa / 100))}</p>
                                  <p className="text-xs text-gray-500">
                                    Solicitado: {formatCurrency(withdrawal.amount)} | Taxa: {withdrawal.taxa}%
                                  </p>
                                </>
                              ) : (
                                <p><strong>Valor:</strong> {formatCurrency(withdrawal.amount)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {withdrawal.user.pixKey ? (
                            <div>
                              <p className="break-words">
                                <strong>Chave PIX:</strong>{' '}
                                <span className="font-mono">{withdrawal.user.pixKey.pixKey}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Tipo: {withdrawal.user.pixKey.pixKeyType} &bull; Banco: {withdrawal.user.pixKey.bankName}
                              </p>
                            </div>
                          ) : (
                            <p className="break-words"><strong>Chave PIX:</strong> {withdrawal.pix || withdrawal.bankAccount || '—'}</p>
                          )}
                          <p className="break-words"><strong>Solicitado em:</strong> {formatDate(withdrawal.requestedAt)}</p>
                          {withdrawal.processedAt && (
                            <p className="break-words"><strong>Processado em:</strong> {formatDate(withdrawal.processedAt)}</p>
                          )}
                        </div>
                      </div>

                      {/* Status da Conta Bancária 
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Conta Bancária:</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {withdrawal.user.bankAccount ? '✅ Cadastrada' : '❌ Não cadastrada'}
                          </span>
                        </div>
                        {!withdrawal.user.bankAccount && (
                          <p className="text-xs text-red-600 mt-1">
                            Usuário precisa cadastrar conta bancária para receber saques via Stripe
                          </p>
                        )}
                      </div>*/}
                      {withdrawal.rejectedReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-red-700 break-words">
                            <strong>Motivo da rejeição:</strong> {withdrawal.rejectedReason}
                          </p>
                        </div>
                      )}



                      {/* Informações da requisição de pagamento OpenPix */}
                      {withdrawal.openPixPaymentRequest && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex flex-col sm:flex-row items-start gap-3">
                            <div className="flex-1 w-full min-w-0">
                              <h4 className="text-xs sm:text-sm font-medium text-green-800 mb-2">
                                Requisição de Pagamento OpenPix
                              </h4>
                              <div className="space-y-1 text-xs sm:text-sm text-green-700">
                                <p className="break-words"><strong>Correlation ID:</strong> {withdrawal.openPixPaymentRequest.correlationID}</p>
                                <p className="break-words"><strong>Expira em:</strong> {formatDate(withdrawal.openPixPaymentRequest.expiresAt)}</p>
                                <div className="mt-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(withdrawal.openPixPaymentRequest!.brCode)
                                      toast.success('Código PIX copiado!')
                                    }}
                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
                                  >
                                    Copiar Código PIX
                                  </button>
                                </div>
                              </div>
                            </div>
                            {withdrawal.openPixPaymentRequest.qrCodeImage && (
                              <div className="flex-shrink-0 self-start">
                                <Image
                                  src={withdrawal.openPixPaymentRequest.qrCodeImage}
                                  alt="QR Code PIX"
                                  width={64}
                                  height={64}
                                  className="w-16 h-16 border border-green-300 rounded"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {withdrawal.status === 'APPROVED' && !hasActivePayoutDestination(withdrawal) && (
                        <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                          <p className="text-xs sm:text-sm text-amber-900 flex gap-2 items-start">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                            <span>
                              Sem conta bancária nem chave PIX ativas no perfil. O envio de PIX não pode ser feito até o usuário cadastrar novamente.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:ml-4">
                      {withdrawal.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleApprove(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <CheckSquare className="w-4 h-4 flex-shrink-0" />
                            <span>Aprovar</span>
                          </button>
                          <button
                            onClick={() => handleReject(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <Ban className="w-4 h-4 flex-shrink-0" />
                            <span>Rejeitar</span>
                          </button>
                        </>
                      ) : withdrawal.status === 'APPROVED' ? (
                        <>
                          <button
                            onClick={() => handleUndoApproval(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <Ban className="w-4 h-4 flex-shrink-0" />
                            <span>Reverter aprovação</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPixModal(withdrawal)}
                            disabled={processingId === withdrawal.id || !hasActivePayoutDestination(withdrawal)}
                            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            title={
                              !hasActivePayoutDestination(withdrawal)
                                ? 'Sem conta bancária nem chave PIX ativas no perfil'
                                : 'Enviar PIX via Bradesco'
                            }
                          >
                            <Send className="w-4 h-4 flex-shrink-0" />
                            <span>Enviar PIX</span>
                          </button>
                          <button
                            onClick={() => handleComplete(withdrawal.id)}
                            disabled={processingId === withdrawal.id}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Finalizar</span>
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(withdrawal.status)} text-center`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} saques
                  </p>
                  <div className="flex items-center justify-center sm:justify-end gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-xs sm:text-sm text-gray-600 px-2">
                      Página {pagination.page} de {pagination.pages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        loading={processingId !== null}
        onConfirm={confirmModal.onConfirm || (() => setConfirmModal(m => ({ ...m, isOpen: false })))}
        onCancel={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
      />

      <ConfirmModal
        isOpen={bulkPayConfirm.isOpen}
        title="Pagar em massa"
        description={`Enviar PIX Bradesco para ${bulkPayConfirm.payables.length} solicitação(ões) de saque aprovada(s)? Cada uma será marcada como concluída ao sucesso.`}
        confirmText="Enviar PIX"
        loading={bulkPaying}
        onConfirm={handleBulkPayConfirm}
        onCancel={() => setBulkPayConfirm({ isOpen: false, payables: [] })}
      />

      {/* Modal Enviar PIX Bradesco */}
      <Modal
        isOpen={pixModal.isOpen}
        onClose={() => setPixModal(m => ({ ...m, isOpen: false, result: null }))}
        title="Enviar PIX via Bradesco"
        maxWidth="max-w-md"
        footerButtons={
          <div className="flex flex-col sm:flex-row justify-end gap-2 w-full">
            <button
              onClick={() => setPixModal(m => ({ ...m, isOpen: false, result: null }))}
              disabled={pixModal.sendingPix}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              Fechar
            </button>
            {!pixModal.result && (
              <button
                onClick={handleSendPix}
                disabled={pixModal.sendingPix}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {pixModal.sendingPix ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-sm">

          {/* Resultado do envio */}
          {pixModal.result && (
            <div className="p-4 bg-green-50 border border-green-300 rounded-lg space-y-2">
              <p className="font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> PIX enviado com sucesso!
              </p>
              {pixModal.result.e2eid && (
                <div className="flex items-center gap-2">
                  <p className="text-green-700 break-all text-xs"><strong>E2E ID:</strong> {pixModal.result.e2eid}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(pixModal.result!.e2eid!); toast.success('E2E ID copiado!') }}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex-shrink-0"
                  >Copiar</button>
                </div>
              )}
              {pixModal.result.status && (
                <p className="text-green-700"><strong>Status:</strong> {pixModal.result.status}</p>
              )}
              {pixModal.result.recebedor && (
                <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-700 space-y-0.5">
                  <p><strong>Recebedor:</strong> {pixModal.result.recebedor.nome}</p>
                  <p><strong>Método:</strong> {pixModal.result.recebedor.metodo}</p>
                  <p className="font-mono break-all">{pixModal.result.recebedor.detalhe}</p>
                </div>
              )}
            </div>
          )}

          {/* Dados do usuário / recebedor automático */}
          {pixModal.withdrawal && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recebedor — preenchido automaticamente</p>
              </div>
              <div className="p-3 space-y-2 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{pixModal.withdrawal.user.name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{pixModal.withdrawal.user.email}</span>
                </div>

                {pixModal.withdrawal.user.pixKey ? (
                  <div className="pl-5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium">Envio via chave PIX</span>
                    </div>
                    <div className="text-gray-600">
                      <span className="text-gray-400">Chave:</span>{' '}
                      <span className="font-mono font-medium">{pixModal.withdrawal.user.pixKey.pixKey}</span>
                      <span className="ml-1.5 bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">{pixModal.withdrawal.user.pixKey.pixKeyType}</span>
                    </div>
                    <div className="text-gray-500">
                      <span className="text-gray-400">Titular:</span>{' '}
                      {pixModal.withdrawal.user.pixKey.accountHolderName}
                    </div>
                  </div>
                ) : pixModal.withdrawal.user.bankAccount ? (
                  <div className="pl-5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-blue-700">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium">Envio via agência + conta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-600">
                      <div><span className="text-gray-400">Banco:</span> <span className="font-medium">{pixModal.withdrawal.user.bankAccount.bankName}</span></div>
                      <div><span className="text-gray-400">Conta:</span> <span className="font-medium">{pixModal.withdrawal.user.bankAccount.accountNumber}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="pl-5 flex items-center gap-1.5 text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Sem chave PIX nem conta bancária — o envio será bloqueado.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ID da transação e valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">ID da Transação *</label>
                <button
                  type="button"
                  onClick={() =>
                    setPixModal(m => ({
                      ...m,
                      form: {
                        ...m.form,
                        idtransacao:
                          m.withdrawalId != null
                            ? buildBradescoPixIdTransacaoForWithdrawal(m.withdrawalId)
                            : m.form.idtransacao,
                      },
                    }))
                  }
                  className="text-xs text-violet-600 hover:text-violet-800 underline"
                >Gerar novo</button>
              </div>
              <input
                type="text"
                maxLength={35}
                disabled={true}
                value={pixModal.form.idtransacao}
                onChange={e => setPixModal(m => ({ ...m, form: { ...m.form, idtransacao: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input
                type="text"
                disabled={true}
                value={pixModal.form.valor}
                onChange={e => setPixModal(m => ({ ...m, form: { ...m.form, valor: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descrição <span className="text-gray-400 font-normal">(opcional, máx. 35 caracteres)</span></label>
            <input
              type="text"
              maxLength={35}
              value={pixModal.form.descricao}
              onChange={e => setPixModal(m => ({ ...m, form: { ...m.form, descricao: e.target.value } }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <p className="text-xs text-gray-400">
            Ambiente: <strong>{process.env.NEXT_PUBLIC_BRADESCO_ENV ?? 'sandbox'}</strong>
          </p>
        </div>
      </Modal>
    </div>
  )
} 
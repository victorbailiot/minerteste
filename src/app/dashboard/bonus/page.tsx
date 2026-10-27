'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import WithdrawalModal from '@/components/WithdrawalModal'
import TransferModal from '@/components/TransferModal'
import PointsDisplay from '@/components/PointsDisplay'
import { History, Calendar, AlertCircle, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { BONUS_TRANSACTION_TYPES } from '@/lib/transaction-types'
import Modal from '@/components/ui/modal'
import BlockedAccessModal from '@/components/modals/BlockedAccessModal'

interface BonusData {
  user: {
    id: number
    name: string
    email: string
    balance: number
    totalEarned: number
    sponsorId: number | null
    parentId: number | null
    position: string
  }
  network: {
    leftPoints: number
    rightPoints: number
    totalPoints: number
    valueToPointConversion: number
  }

  bonuses: {
    totalBonuses: number
    directBonuses: number
    indirectBonuses: number
    activationBonuses: number
    profitShares: number
    careerBonuses: number
    cashback: number
    hasEligiblePackage: boolean
    recentTransactions: Array<{
      id: number
      userId: number
      packageId: number | null
      type: string
      amount: number
      description: string
      createdAt: string
      status: string
      sourceUserId: number | null
      level: number | null
      sourceUser: {
        id: number
        name: string
        email: string
      } | null
    }>
  }
}

export default function GanhosPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bonusStats, setBonusStats] = useState<BonusData | null>(null)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showWeekendModal, setShowWeekendModal] = useState(false)
  const [transferBlocked, setTransferBlocked] = useState(false)
  const [transferBlockReason, setTransferBlockReason] = useState<string | null>(null)
  const [withdrawalBlocked, setWithdrawalBlocked] = useState(false)
  const [withdrawalBlockReason, setWithdrawalBlockReason] = useState<string | null>(null)
  const [showBlacklistModal, setShowBlacklistModal] = useState(false)
  const [blacklistModalReason, setBlacklistModalReason] = useState<string>('')
  const [fixingBonus, setFixingBonus] = useState(false)
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Buscar dados de bônus
      const bonusResponse = await fetch(`/api/business/bonus-stats?userId=${user?.id}`)
      if (!bonusResponse.ok) {
        throw new Error('Erro ao carregar dados de ganhos')
      }
      const bonusData = await bonusResponse.json()
      setBonusStats(bonusData.data)
    } catch (err) {
      console.error('❌ Erro em fetchData:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData()
    }
  }, [isAuthenticated, user, fetchData])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const checkBlacklist = async () => {
      try {
        const res = await fetch('/api/auth/me/blacklist')
        if (!res.ok) return
        const data = await res.json()
        if (!data.success || !data.data?.entries) return
        const transferBlockedEntry = data.data.entries.some(
          (e: { resource: string; action: string | null }) =>
            e.resource === 'bonus' && e.action === 'transfer'
        )
        setTransferBlocked(transferBlockedEntry)
        if (transferBlockedEntry) {
          const entry = data.data.entries.find(
            (e: { resource: string; action: string | null; reason?: string }) =>
              e.resource === 'bonus' && e.action === 'transfer'
          )
          setTransferBlockReason(entry?.reason ?? null)
        } else {
          setTransferBlockReason(null)
        }

        const withdrawalBlockedEntry = data.data.entries.some(
          (e: { resource: string; action: string | null }) =>
            e.resource === 'withdrawals' && (e.action === 'request' || e.action === null)
        )
        setWithdrawalBlocked(withdrawalBlockedEntry)
        if (withdrawalBlockedEntry) {
          const entry = data.data.entries.find(
            (e: { resource: string; action: string | null; reason?: string }) =>
              e.resource === 'withdrawals' && (e.action === 'request' || e.action === null)
          )
          setWithdrawalBlockReason(entry?.reason ?? null)
        } else {
          setWithdrawalBlockReason(null)
        }
      } catch {
        // ignora erro
      }
    }
    checkBlacklist()
  }, [isAuthenticated, user])

  const handleWithdrawalSuccess = () => {
    fetchData()
  }

  const handleFixDirectBonus = async () => {
    if (fixingBonus) return
    setFixingBonus(true)
    setFixResult(null)
    try {
      const res = await fetch('/api/business/fix-direct-bonus', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setFixResult({ success: false, message: data.error ?? 'Erro ao processar correção' })
        return
      }
      const { totalDownlinesAnalyzed, totalCorrected, totalAmountCorrected } = data.data
      if (totalCorrected > 0) {
        setFixResult({
          success: true,
          message: `${totalCorrected} bônus corrigido(s) — R$ ${totalAmountCorrected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} adicionado(s)`
        })
        fetchData()
      } else {
        setFixResult({
          success: true,
          message: `${totalDownlinesAnalyzed} downline(s) analisado(s) — bônus em dia`
        })
      }
    } catch {
      setFixResult({ success: false, message: 'Erro de conexão ao processar correção' })
    } finally {
      setFixingBonus(false)
    }
  }

  const handleTransferClick = async () => {
    if (!bonusStats || bonusStats.user.balance <= 0) return
    try {
      const res = await fetch('/api/auth/me/blacklist')
      if (!res.ok) return
      const data = await res.json()
      if (!data.success || !data.data?.entries) {
        setShowTransferModal(true)
        return
      }
      const blocked = data.data.entries.some(
        (e: { resource: string; action: string | null }) =>
          e.resource === 'bonus' && e.action === 'transfer'
      )
      if (blocked) {
        const entry = data.data.entries.find(
          (e: { resource: string; action: string | null; reason?: string }) =>
            e.resource === 'bonus' && e.action === 'transfer'
        )
        setBlacklistModalReason(
          entry?.reason ?? 'Você não está autorizado a realizar transferências de bônus.'
        )
        setShowBlacklistModal(true)
        return
      }
      setShowTransferModal(true)
    } catch {
      setShowTransferModal(true)
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

  const getFirstAndLastName = (fullName: string) => {
    const names = fullName.trim().split(/\s+/)
    if (names.length === 0) return fullName
    if (names.length === 1) return names[0]
    return `${names[0]} ${names[names.length - 1]}`
  }

  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'DIRECT_BONUS': 'Bônus Direto',
      'INDIRECT_BONUS': 'Bônus Indireto',
      'ACTIVATION_BONUS': 'Bônus de Ativação',
      'PROFIT_SHARE': 'Divisão de Lucros',
      'CASHBACK': 'Cashback Pioneiro',
      'PURCHASE': 'Compra de Pacote',
      'WITHDRAWAL': 'Saque',
      'CAREER_BONUS': 'Bônus de Carreira',
      'CAREER_PRIZE': 'Prêmio de Carreira',
      'TRANSFER': 'Transferência'
    }
    return types[type] || type
  }

  // Verificar se é fim de semana (sábado ou domingo)
  const isWeekend = (): boolean => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // 0 = domingo, 6 = sábado
  }

  // Calcular o próximo dia útil
  const getNextBusinessDay = (): string => {
    const today = new Date()
    const nextDay = new Date(today)
    
    // Se for sábado, próximo dia útil é segunda (adicionar 2 dias)
    if (today.getDay() === 6) {
      nextDay.setDate(today.getDate() + 2)
    }
    // Se for domingo, próximo dia útil é segunda (adicionar 1 dia)
    else if (today.getDay() === 0) {
      nextDay.setDate(today.getDate() + 1)
    }
    
    const formattedDate = nextDay.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Capitalizar a primeira letra do dia da semana
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
  }

  // Handler para abrir modal de saque com verificação de blacklist e fim de semana
  const handleWithdrawalClick = async () => {
    if (withdrawalBlocked) {
      setBlacklistModalReason(
        withdrawalBlockReason ?? 'Você não está autorizado a solicitar saques.'
      )
      setShowBlacklistModal(true)
      return
    }
    try {
      const res = await fetch('/api/auth/me/blacklist')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.entries) {
          const blocked = data.data.entries.some(
            (e: { resource: string; action: string | null }) =>
              e.resource === 'withdrawals' && (e.action === 'request' || e.action === null)
          )
          if (blocked) {
            const entry = data.data.entries.find(
              (e: { resource: string; action: string | null; reason?: string }) =>
                e.resource === 'withdrawals' && (e.action === 'request' || e.action === null)
            )
            setBlacklistModalReason(
              entry?.reason ?? 'Você não está autorizado a solicitar saques.'
            )
            setShowBlacklistModal(true)
            return
          }
        }
      }
    } catch {
      // em caso de erro na verificação, permite tentar (a API também valida)
    }
    if (isWeekend()) {
      setShowWeekendModal(true)
    } else {
      setShowWithdrawalModal(true)
    }
  }

  // Se ainda está carregando a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não está autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados de ganhos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Erro</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (!bonusStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">📊 Carregando dados...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsivo para mobile */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">💰 Meus Ganhos</h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Acompanhe todos os seus ganhos e bônus da rede
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/*
            <button
              onClick={handleFixDirectBonus}
              disabled={fixingBonus}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-3 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 ${fixingBonus ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{fixingBonus ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
            */}
            <button
              onClick={() => router.push('/dashboard/saques')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <History className="w-4 h-4" />
              <span className="whitespace-nowrap">Saques</span>
            </button>
            <button
              onClick={() => !transferBlocked && router.push('/dashboard/transferencias')}
              disabled={transferBlocked}
              title={transferBlocked ? transferBlockReason ?? 'Transferência de bônus não permitida' : undefined}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="whitespace-nowrap">Transferências</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner de resultado da correção de bônus */}
      {fixResult && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${fixResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <span className="mt-0.5 shrink-0">{fixResult.success ? '✅' : '❌'}</span>
          <span>{fixResult.message}</span>
          <button
            onClick={() => setFixResult(null)}
            className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cards de Resumo - Responsivo para mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-green-100 text-xs sm:text-sm font-medium">Saldo Atual</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(bonusStats.user.balance)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center text-lg sm:text-xl">
              💰
            </div>
          </div>
          {/* Botões de Ação */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleWithdrawalClick}
              disabled={bonusStats.user.balance <= 0 || withdrawalBlocked}
              title={withdrawalBlocked ? withdrawalBlockReason ?? 'Saque não permitido' : undefined}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sacar
            </button>
            <button
              onClick={handleTransferClick}
              disabled={bonusStats.user.balance <= 0}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transferir
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Ganho</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(bonusStats.user.totalEarned)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center text-lg sm:text-xl">
              📈
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 sm:p-6 shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-purple-100 text-xs sm:text-sm font-medium">Total Bônus</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(bonusStats.bonuses.totalBonuses)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center text-lg sm:text-xl">
              ⭐
            </div>
          </div>
        </div>
      </div>

      {/* Tipos de Bônus - Responsivo para mobile */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">💎 Tipos de Bônus</h3>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Bônus Direto</p>
              <p className="text-xs sm:text-sm text-gray-600">Indicações diretas</p>
            </div>
            <span className="font-bold text-green-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.directBonuses)}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Bônus Indireto</p>
              <p className="text-xs sm:text-sm text-gray-600">Níveis de indicação (2 a 7)</p>
            </div>
            <span className="font-bold text-blue-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.indirectBonuses)}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Bônus de Ativação</p>
              <p className="text-xs sm:text-sm text-gray-600">Ativação mensal de pacotes</p>
            </div>
            <span className="font-bold text-purple-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.activationBonuses)}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Divisão de Lucros</p>
              <p className="text-xs sm:text-sm text-gray-600">Participação na divisão de lucro</p>
            </div>
            <span className="font-bold text-orange-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.profitShares)}</span>
          </div>

          {/* Cashback - apenas para usuários com pacotes elegíveis */}
          {bonusStats.bonuses.hasEligiblePackage && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="mb-2 sm:mb-0">
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Cashback Pioneiro</p>
                <p className="text-xs sm:text-sm text-gray-600">Clube dos 300</p>
              </div>
              <span className="font-bold text-yellow-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.cashback)}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Bônus de Carreira</p>
              <p className="text-xs sm:text-sm text-gray-600">Progressão de carreira</p>
            </div>
            <span className="font-bold text-indigo-600 text-lg sm:text-xl">{formatCurrency(bonusStats.bonuses.careerBonuses)}</span>
          </div>
        </div>
      </div>

      {/* Histórico de Transações - Responsivo para mobile */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">📊 Histórico Recente</h3>
          <Link
            href="/dashboard/historico-bonus"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            aria-label="Ver mais bônus"
          >
            Ver mais
          </Link>
        </div>
        
        {!bonusStats.bonuses.recentTransactions || bonusStats.bonuses.recentTransactions.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="text-gray-400 text-3xl sm:text-4xl mb-3 sm:mb-4">📋</div>
            <p className="text-gray-600 text-sm sm:text-base">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bonusStats.bonuses.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start sm:items-center mb-3 sm:mb-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0 ${
                    BONUS_TRANSACTION_TYPES.includes(transaction.type as any)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {BONUS_TRANSACTION_TYPES.includes(transaction.type as any) ? '+' : '-'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {getTransactionTypeLabel(transaction.type)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 break-words">{transaction.description}</p>
                    {/* Mostrar usuário que gerou o bônus e nível */}
                    {transaction.sourceUser && (transaction.type === 'DIRECT_BONUS' || transaction.type === 'INDIRECT_BONUS') && (
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs text-blue-600 font-medium">
                          De: {getFirstAndLastName(transaction.sourceUser.name)}
                        </span>
                        {transaction.level && (
                          <span className="text-xs text-purple-600 font-medium">
                            Nível {transaction.level}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:text-right gap-2 sm:gap-0">
                  <span className={`font-bold text-lg sm:text-xl ${
                    BONUS_TRANSACTION_TYPES.includes(transaction.type as any)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {BONUS_TRANSACTION_TYPES.includes(transaction.type as any) ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full inline-block w-fit ${
                    transaction.status === 'COMPLETED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transaction.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Botão Ver Mais */}
        {bonusStats.bonuses.recentTransactions && bonusStats.bonuses.recentTransactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/historico-bonus"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Ver Mais
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Modal de Saque */}
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSuccess={handleWithdrawalSuccess}
        currentBalance={bonusStats.user.balance}
      />

      {/* Modal de Transferência */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleWithdrawalSuccess}
        currentBalance={bonusStats.user.balance}
      />

      {/* Modal informativo de blacklist */}
      <BlockedAccessModal
        isOpen={showBlacklistModal}
        onClose={() => setShowBlacklistModal(false)}
        reason={blacklistModalReason}
      />

      {/* Modal de Fim de Semana */}
      <Modal
        isOpen={showWeekendModal}
        onClose={() => setShowWeekendModal(false)}
        title="Saque Indisponível no Fim de Semana"
        maxWidth="max-w-md"
        footerButtons={
          <button
            onClick={() => setShowWeekendModal(false)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Entendi
          </button>
        }
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Saques disponíveis apenas em dias úteis
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Os saques estão disponíveis apenas em <strong>dias úteis</strong> (segunda a sexta-feira).
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mt-2">
                    O próximo dia útil para realizar seu saque será na{' '}
                    <strong className="text-blue-600">{getNextBusinessDay()}</strong>.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              Obrigado pela compreensão! 💙
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
} 
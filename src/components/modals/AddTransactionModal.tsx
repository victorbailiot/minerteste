'use client'

import { useState, useEffect } from 'react'
import { Search, X, User, DollarSign, FileText, Tag, CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface UserSearchResult {
  id: number
  name: string
  email: string
  referralCode: string
}

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  /** Exibe o tipo "Bônus de Ajuste" (somente super admin) */
  showBonusAdjustment?: boolean
  onSubmit: (data: {
    type: string
    amount: number
    description: string
    status: string
    userId: number
    sourceUserId?: number
  }) => Promise<void>
}

const TRANSACTION_TYPES = [
  'DEPOSIT',
  'BONUS',
  'WITHDRAWAL',
  'PURCHASE',
  'BONUS_PAYMENT',
  'MINING_REWARD',
  'PIX_PAYMENT',
  'CREDIT_PAYMENT',
  'DIRECT_BONUS',
  'BOOSTED_BONUS',
  'INDIRECT_BONUS',
  'CYCLE_BONUS',
  'BINARY_BONUS',
  'PROFIT_SHARE',
  'ACTIVATION_PIX',
  'ACTIVATION_BONUS',
  'CASHBACK',
  'CAREER_BONUS',
  'CAREER_PRIZE',
  'SOLIDARITY_PAYMENT',
  'REACTIVATION_BONUS',
  'BONUS_ADJUSTMENT'
] as const

const BONUS_ADJUSTMENT_TYPE = 'BONUS_ADJUSTMENT'

const TRANSACTION_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const

const getTransactionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    DEPOSIT: 'Depósito',
    BONUS: 'Bônus',
    WITHDRAWAL: 'Saque',
    PURCHASE: 'Compra',
    BONUS_PAYMENT: 'Pagamento de Bônus',
    MINING_REWARD: 'Recompensa de Mineração',
    PIX_PAYMENT: 'Pagamento PIX',
    CREDIT_PAYMENT: 'Pagamento de Crédito',
    DIRECT_BONUS: 'Bônus Direto',
    BOOSTED_BONUS: 'Bônus Impulsionado',
    INDIRECT_BONUS: 'Bônus Indireto',
    CYCLE_BONUS: 'Bônus de Ciclo',
    BINARY_BONUS: 'Bônus Binário',
    PROFIT_SHARE: 'Participação nos Lucros',
    ACTIVATION_PIX: 'Ativação PIX',
    ACTIVATION_BONUS: 'Bônus de Ativação',
    CASHBACK: 'Cashback',
    CAREER_BONUS: 'Bônus de Carreira',
    CAREER_PRIZE: 'Prêmio de Carreira',
    SOLIDARITY_PAYMENT: 'Crédito Minerador',
    REACTIVATION_BONUS: 'Bônus de Reativação',
    BONUS_ADJUSTMENT: 'Bônus de Ajuste'
  }
  return labels[type] || type
}

const getTransactionStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    COMPLETED: 'Concluída',
    FAILED: 'Falhou',
    CANCELLED: 'Cancelada'
  }
  return labels[status] || status
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  userId,
  showBonusAdjustment = false,
  onSubmit
}) => {
  const availableTransactionTypes = showBonusAdjustment
    ? TRANSACTION_TYPES
    : TRANSACTION_TYPES.filter((type) => type !== BONUS_ADJUSTMENT_TYPE)

  const [formData, setFormData] = useState({
    type: 'DEPOSIT',
    amount: '',
    description: '',
    status: 'PENDING',
    transactionDirection: 'receive' as 'receive' | 'generate'
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Função para formatar valor como moeda brasileira
  const formatCurrencyInput = (value: string): string => {
    const numericValue = value.replace(/\D/g, '')
    if (!numericValue) return ''
    
    const cents = parseInt(numericValue)
    const reais = cents / 100
    
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Função para converter valor formatado para número
  const parseCurrencyValue = (formattedValue: string): number => {
    if (!formattedValue) return 0
    
    const numericString = formattedValue
      .replace(/\./g, '')
      .replace(',', '.')
    
    return parseFloat(numericString)
  }

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        type: 'DEPOSIT',
        amount: '',
        description: '',
        status: 'PENDING',
        transactionDirection: 'receive'
      })
      setSearchTerm('')
      setSearchResults([])
      setSelectedUser(null)
      setErrors({})
    }
  }, [isOpen])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um nome, email ou CPF para pesquisar')
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data)
        if (data.data.length === 0) {
          toast.info('Nenhum usuário encontrado')
        }
      } else {
        toast.error('Erro ao pesquisar usuários')
      }
    } catch (error) {
      console.error('Erro ao pesquisar:', error)
      toast.error('Erro ao pesquisar usuários')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchResults([])
    setSearchTerm('')
  }

  const handleRemoveUser = () => {
    setSelectedUser(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.type) {
      newErrors.type = 'Selecione o tipo de transação'
    }

    const amountValue = parseCurrencyValue(formData.amount)
    if (!formData.amount || amountValue <= 0) {
      newErrors.amount = 'Digite um valor válido maior que zero'
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = 'Digite uma descrição'
    }

    if (!formData.status) {
      newErrors.status = 'Selecione o status'
    }

    // Bônus de Ajuste é lançado direto no saldo do usuário da página (sem usuário de origem)
    if (formData.type !== BONUS_ADJUSTMENT_TYPE && !selectedUser) {
      newErrors.user = 'Selecione um usuário para a transação'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isBonusAdjustment = formData.type === BONUS_ADJUSTMENT_TYPE
    if (!validateForm() || (!isBonusAdjustment && !selectedUser)) {
      toast.error('Por favor, corrija os erros no formulário')
      return
    }

    setIsSubmitting(true)
    try {
      const amountValue = parseCurrencyValue(formData.amount)
      const paramUserId = parseInt(userId, 10)

      let finalUserId: number
      let finalSourceUserId: number | undefined

      if (isBonusAdjustment) {
        finalUserId = paramUserId
        finalSourceUserId = undefined
      } else if (selectedUser) {
        const selectedUserId = typeof selectedUser.id === 'number' ? selectedUser.id : parseInt(String(selectedUser.id), 10)
        if (formData.transactionDirection === 'receive') {
          finalUserId = paramUserId
          finalSourceUserId = selectedUserId
        } else {
          finalUserId = selectedUserId
          finalSourceUserId = paramUserId
        }
      } else {
        toast.error('Por favor, corrija os erros no formulário')
        setIsSubmitting(false)
        return
      }

      const submitData: {
        type: string
        amount: number
        description: string
        status: string
        userId: number
        sourceUserId?: number
      } = {
        type: formData.type,
        amount: amountValue,
        description: formData.description,
        status: formData.status,
        userId: finalUserId
      }

      if (finalSourceUserId !== undefined) {
        submitData.sourceUserId = finalSourceUserId
      }

      await onSubmit(submitData)
      
      toast.success('Transação criada com sucesso!', {
        icon: <CheckCircle className="w-5 h-5" />
      })
      
      onClose()
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      toast.error('Erro ao criar transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Adicionar Transação Financeira</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar modal"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Transação */}
          <div>
            <label htmlFor="transaction-type" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Tag className="w-5 h-5 text-gray-400 mr-2" />
                Tipo de Transação *
              </div>
            </label>
            <select
              id="transaction-type"
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value
                setFormData(prev => ({ ...prev, type: newType }))
                setErrors(prev => ({ ...prev, type: '', user: '' }))
                if (newType === BONUS_ADJUSTMENT_TYPE) setSelectedUser(null)
              }}
              className={`mt-1 block w-full rounded-lg border ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              } bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-colors duration-200`}
              disabled={isSubmitting}
            >
              {availableTransactionTypes.map((type) => (
                <option key={type} value={type}>
                  {getTransactionTypeLabel(type)}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="transaction-amount" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                Valor (R$) *
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
              <input
                id="transaction-amount"
                type="text"
                value={formData.amount}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value)
                  setFormData(prev => ({ ...prev, amount: formatted }))
                  setErrors(prev => ({ ...prev, amount: '' }))
                }}
                className={`mt-1 block w-full rounded-lg border ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                } bg-white pl-10 pr-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-colors duration-200`}
                placeholder="0,00"
                disabled={isSubmitting}
              />
            </div>
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="transaction-status" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-gray-400 mr-2" />
                Status *
              </div>
            </label>
            <select
              id="transaction-status"
              value={formData.status}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, status: e.target.value }))
                setErrors(prev => ({ ...prev, status: '' }))
              }}
              className={`mt-1 block w-full rounded-lg border ${
                errors.status ? 'border-red-300' : 'border-gray-300'
              } bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-colors duration-200`}
              disabled={isSubmitting}
            >
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getTransactionStatusLabel(status)}
                </option>
              ))}
            </select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="transaction-description" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                Descrição *
              </div>
            </label>
            <textarea
              id="transaction-description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }))
                setErrors(prev => ({ ...prev, description: '' }))
              }}
              className={`mt-1 block w-full rounded-lg border ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              } bg-white px-4 py-2 text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 transition-colors duration-200 min-h-[100px]`}
              placeholder="Digite uma descrição para a transação"
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {formData.type !== BONUS_ADJUSTMENT_TYPE && (
          <>
          {/* Direção da Transação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <div className="flex items-center">
                {formData.transactionDirection === 'receive' ? (
                  <ArrowDownCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-blue-500 mr-2" />
                )}
                Direção da Transação *
              </div>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="transactionDirection"
                  value="receive"
                  checked={formData.transactionDirection === 'receive'}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, transactionDirection: 'receive' }))
                    setSelectedUser(null)
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-gray-700 flex items-center gap-2">
                  <ArrowDownCircle className="w-4 h-4 text-green-500" />
                  Receber (usuário da página recebe a transação)
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="transactionDirection"
                  value="generate"
                  checked={formData.transactionDirection === 'generate'}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, transactionDirection: 'generate' }))
                    setSelectedUser(null)
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-gray-700 flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-blue-500" />
                  Gerar (usuário da página gera a transação)
                </span>
              </label>
            </div>
          </div>

          {/* Usuário de Origem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                {formData.transactionDirection === 'receive' 
                  ? 'Usuário de Origem (quem gerou a transação) *'
                  : 'Usuário Destino (quem receberá a transação) *'
                }
              </div>
            </label>
            
            {selectedUser ? (
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveUser}
                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-50"
                    disabled={isSubmitting}
                    tabIndex={0}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite nome, email ou CPF para pesquisar"
                    className={`flex-1 px-4 py-2 border ${
                      errors.user ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    disabled={isSearching || isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching || isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    tabIndex={0}
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Pesquisando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Pesquisar</span>
                      </>
                    )}
                  </button>
                </div>
                {errors.user && <p className="text-red-500 text-sm mt-1">{errors.user}</p>}

                {/* Resultados da Pesquisa */}
                {searchResults.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Código</p>
                            <p className="font-medium text-sm">{user.referralCode}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Transação'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTransactionModal


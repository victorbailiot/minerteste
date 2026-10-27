'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { DollarSign, Search, User, X, Loader2 } from 'lucide-react'
import Modal from './ui/modal'
import { Button } from './ui/button'
import { formatCurrency } from '@/lib/utils'
import FinancialPasswordModal from './FinancialPasswordModal'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentBalance: number
}

interface UserSearchResult {
  id: number
  name: string
  email: string
  referralCode: string
}

export default function TransferModal({ isOpen, onClose, onSuccess, currentBalance }: TransferModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [amount, setAmount] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFinancialPasswordModal, setShowFinancialPasswordModal] = useState(false)
  const [hasFinancialPassword, setHasFinancialPassword] = useState<boolean | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<{ recipientId: number; amount: number; recipientName: string } | null>(null)
  const [validatedPassword, setValidatedPassword] = useState<string | null>(null)

  // Limpar estado ao fechar modal
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedUser(null)
      setAmount('')
      setIsSearching(false)
      setPendingTransfer(null)
    } else {
      checkFinancialPassword()
    }
  }, [isOpen])

  const checkFinancialPassword = async () => {
    try {
      const response = await fetch('/api/auth/financial-password/check')
      if (response.ok) {
        const data = await response.json()
        setHasFinancialPassword(data.hasFinancialPassword)
      }
    } catch (error) {
      console.error('Erro ao verificar senha financeira:', error)
    }
  }

  // Buscar usuários com debounce
  useEffect(() => {
    if (!isOpen || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery.trim())
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen])

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/transfers/search-user?query=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setSearchResults(data.users || [])
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Função para formatar valor como moeda brasileira
  const formatCurrencyInput = (value: string) => {
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
  const parseCurrencyValue = (formattedValue: string) => {
    if (!formattedValue) return 0
    const numericString = formattedValue
      .replace(/\./g, '')
      .replace(',', '.')
    return parseFloat(numericString)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCurrencyInput(e.target.value)
    setAmount(formattedValue)
  }

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery(user.name)
    setSearchResults([])
  }

  const handleClearSelection = () => {
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUser) {
      toast.error('Selecione um usuário destinatário')
      return
    }

    const transferAmount = parseCurrencyValue(amount)

    if (!transferAmount || transferAmount <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    if (transferAmount > currentBalance) {
      toast.error(`Saldo insuficiente. Seu saldo atual é ${formatCurrency(currentBalance)}`)
      return
    }

    // Verificar se tem senha financeira
    if (hasFinancialPassword === false) {
      // Se não tem senha, oferecer para criar
      toast.info('Você precisa criar uma senha financeira primeiro')
      setShowFinancialPasswordModal(true)
      return
    }

    // Se tem senha, solicitar confirmação
    if (hasFinancialPassword === true) {
      // Salvar dados da transferência pendente e abrir modal de senha
      setPendingTransfer({
        recipientId: selectedUser.id,
        amount: transferAmount,
        recipientName: selectedUser.name
      })
      setShowFinancialPasswordModal(true)
      return
    }

    // Se ainda está verificando, aguardar
    if (hasFinancialPassword === null) {
      toast.info('Verificando configurações...')
      return
    }

    // Processar transferência (não deveria chegar aqui, mas por segurança)
    processTransfer(selectedUser.id, transferAmount, undefined, selectedUser.name)
  }

  const processTransfer = async (recipientId: number, transferAmount: number, password?: string, recipientName?: string) => {
    setIsSubmitting(true)

    try {
      // Usar senha validada ou a senha passada como parâmetro
      const financialPassword = password || validatedPassword
      
      if (!financialPassword) {
        toast.error('Senha financeira não fornecida')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: recipientId,
          amount: transferAmount,
          financialPassword: financialPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar transferência')
      }

      const displayName = recipientName || selectedUser?.name || 'usuário'
      toast.success('Transferência realizada com sucesso!', {
        description: `${formatCurrency(transferAmount)} transferido para ${displayName}`
      })

      // Limpar formulário
      setAmount('')
      setSelectedUser(null)
      setSearchQuery('')
      setPendingTransfer(null)

      // Fechar modal e chamar callback de sucesso
      onClose()
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('Erro ao realizar transferência:', error)
      toast.error('Erro ao realizar transferência', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setAmount('')
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setIsSubmitting(false)
    setPendingTransfer(null)
    onClose()
  }

  const handleFinancialPasswordVerified = async (password: string) => {
    setValidatedPassword(password)
    if (pendingTransfer) {
      await processTransfer(pendingTransfer.recipientId, pendingTransfer.amount, password, pendingTransfer.recipientName)
    }
  }

  const handleFinancialPasswordCreated = () => {
    checkFinancialPassword()
    setShowFinancialPasswordModal(false)
    toast.success('Senha financeira criada! Agora você pode realizar transferências.')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transferir Saldo"
      maxWidth="max-w-md"
      footerButtons={
        <div className="flex gap-3 w-full">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="transfer-form"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={!selectedUser || isSubmitting || !amount || parseCurrencyValue(amount) <= 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transferindo...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Saldo Atual */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Disponível</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Busca de Usuário */}
          <div>
            <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-2">
              Usuário Destinatário
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                id="user-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o código de indicação ou nome do usuário"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting || !!selectedUser}
                autoComplete="off"
              />
              {selectedUser && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Resultados da Busca */}
            {!selectedUser && searchQuery.length >= 2 && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Buscando...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.referralCode} • {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-4 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </div>
                ) : null}
              </div>
            )}

            {/* Usuário Selecionado */}
            {selectedUser && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {selectedUser.referralCode} • {selectedUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Valor da Transferência */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Valor da Transferência
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                R$
              </span>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedUser || isSubmitting}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor mínimo: R$ 0,01
            </p>
          </div>
        </form>
      </div>

      {/* Modal de Senha Financeira */}
      <FinancialPasswordModal
        isOpen={showFinancialPasswordModal}
        onClose={() => {
          setShowFinancialPasswordModal(false)
          setPendingTransfer(null)
          setValidatedPassword(null)
        }}
        onSuccess={hasFinancialPassword ? undefined : handleFinancialPasswordCreated}
        onPasswordVerified={hasFinancialPassword ? handleFinancialPasswordVerified : undefined}
        mode={hasFinancialPassword ? 'verify' : 'create'}
        title={hasFinancialPassword ? 'Confirmar Senha Financeira' : 'Criar Senha Financeira'}
        description={hasFinancialPassword 
          ? 'Digite sua senha financeira para confirmar a transferência'
          : 'Crie uma senha financeira para proteger suas operações de transferência'}
      />
    </Modal>
  )
}


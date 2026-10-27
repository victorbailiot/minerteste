'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DollarSign, AlertTriangle, CheckCircle, X } from 'lucide-react'
import Modal from './ui/modal'
import { Button } from './ui/button'
import { formatCurrency } from '@/lib/utils'
import PixKeyModal from './pagamento/PixKeyModal'
import FinancialPasswordModal from './FinancialPasswordModal'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentBalance: number
}

interface PixKeyData {
  id: string
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
  pixKey: string
  accountHolderName: string
  bankName: string
  createdAt: string
  updatedAt: string
}


export default function WithdrawalModal({ isOpen, onClose, onSuccess, currentBalance }: WithdrawalModalProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState<PixKeyData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingPixKey, setIsLoadingPixKey] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [feePercentage, setFeePercentage] = useState<number | null>(null)
  const [minAmount, setMinAmount] = useState<number | null>(null)
  const [isLoadingFee, setIsLoadingFee] = useState(false)
  const [showFinancialPasswordModal, setShowFinancialPasswordModal] = useState(false)
  const [hasFinancialPassword, setHasFinancialPassword] = useState<boolean | null>(null)
  const [pendingWithdrawal, setPendingWithdrawal] = useState<{ amount: number; pixKeyId: string; timezone: string } | null>(null)
  const [validatedPassword, setValidatedPassword] = useState<string | null>(null)

  // Carregar chave PIX e parâmetros de saque
  useEffect(() => {
    if (isOpen) {
      loadUserPixKey()
      loadWithdrawalParameters()
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

  const loadUserPixKey = async () => {
    setIsLoadingPixKey(true)
    try {
      const response = await fetch('/api/auth/pix-key')
      if (response.ok) {
        const data = await response.json()
        setPixKey(data.pixKey)
      } else {
        setPixKey(null)
      }
    } catch (error) {
      console.error('Erro ao carregar chave PIX:', error)
      setPixKey(null)
    } finally {
      setIsLoadingPixKey(false)
    }
  }

  const loadWithdrawalParameters = async () => {
    setIsLoadingFee(true)
    try {
      const response = await fetch('/api/withdrawals/fee')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFeePercentage(data.data.feePercentage)
          setMinAmount(data.data.minAmount)
        }
      } else {
        console.error('Erro ao carregar parâmetros de saque')
        toast.error('Erro ao carregar configurações de saque')
      }
    } catch (error) {
      console.error('Erro ao carregar parâmetros de saque:', error)
      toast.error('Erro ao carregar configurações de saque')
    } finally {
      setIsLoadingFee(false)
    }
  }

  // Função para formatar valor como moeda brasileira
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '')

    // Se não há valor, retorna vazio
    if (!numericValue) return ''

    // Converte para centavos e formata
    const cents = parseInt(numericValue)
    const reais = cents / 100

    // Formata com 2 casas decimais
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Função para converter valor formatado para número
  const parseCurrencyValue = (formattedValue: string) => {
    if (!formattedValue) return 0

    // Remove pontos de milhares e substitui vírgula por ponto
    const numericString = formattedValue
      .replace(/\./g, '') // Remove pontos de milhares
      .replace(',', '.') // Substitui vírgula por ponto

    return parseFloat(numericString)
  }


  // Função para lidar com mudança no input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCurrencyInput(e.target.value)
    setAmount(formattedValue)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pixKey) {
      toast.error('Você precisa cadastrar uma chave PIX antes de solicitar saques')
      return
    }

    const withdrawalAmount = parseCurrencyValue(amount)

    // Validações
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    // Validar valor mínimo usando parâmetro
    if (minAmount !== null && withdrawalAmount < minAmount) {
      toast.error(`Valor mínimo para saque é ${formatCurrency(minAmount)}`)
      return
    }

    if (minAmount === null) {
      toast.error('Configuração de valor mínimo não carregada. Tente novamente.')
      return
    }

    if (withdrawalAmount > currentBalance) {
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
      // Salvar dados do saque pendente e abrir modal de senha
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setPendingWithdrawal({
        amount: withdrawalAmount,
        pixKeyId: pixKey.id,
        timezone: userTimezone
      })
      setShowFinancialPasswordModal(true)
      return
    }

    // Se ainda está verificando, aguardar
    if (hasFinancialPassword === null) {
      toast.info('Verificando configurações...')
      return
    }

    // Processar saque (não deveria chegar aqui, mas por segurança)
    processWithdrawal(withdrawalAmount, pixKey.id)
  }

  const processWithdrawal = async (withdrawalAmount: number, pixKeyId: string, timezone?: string, password?: string) => {
    setIsSubmitting(true)

    try {
      // Detectar timezone do navegador do usuário
      const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Usar senha validada ou a senha passada como parâmetro
      const financialPassword = password || validatedPassword
      
      if (!financialPassword) {
        toast.error('Senha financeira não fornecida')
        setIsSubmitting(false)
        return
      }
      
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          pixKeyId: pixKeyId,
          timezone: userTimezone,
          financialPassword: financialPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao solicitar saque')
      }

      toast.success('Solicitação de saque criada com sucesso!', {
        description: 'Aguarde a aprovação do administrador.'
      })

      // Limpar formulário
      setAmount('')
      setPendingWithdrawal(null)

      // Fechar modal e chamar callback de sucesso
      onClose()
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('Erro ao solicitar saque:', error)
      toast.error('Erro ao solicitar saque', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsSubmitting(false)
    }
  }



  const handleClose = () => {
    setAmount('')
    setIsSubmitting(false)
    setPendingWithdrawal(null)
    onClose()
  }

  const handleFinancialPasswordVerified = async (password: string) => {
    setValidatedPassword(password)
    if (pendingWithdrawal) {
      await processWithdrawal(
        pendingWithdrawal.amount,
        pendingWithdrawal.pixKeyId,
        pendingWithdrawal.timezone,
        password
      )
    }
  }

  const handleFinancialPasswordCreated = () => {
    checkFinancialPassword()
    setShowFinancialPasswordModal(false)
    toast.success('Senha financeira criada! Agora você pode realizar saques.')
  }

  const handleOpenPixModal = () => {
    setShowPixModal(true)
  }

  const handlePixModalSuccess = () => {
    setShowPixModal(false)
    loadUserPixKey() // Recarregar chave PIX
    toast.success('Chave PIX cadastrada com sucesso!')
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Solicitar Saque"
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
            form="withdrawal-form"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={!pixKey || isSubmitting || !amount || parseCurrencyValue(amount) <= 0}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processando...
              </>
            ) : (
              'Solicitar Saque'
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

        {/* Chave PIX */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Chave PIX para Recebimento</h4>

          {isLoadingPixKey ? (
            <div className="animate-pulse bg-gray-100 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : pixKey ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">{pixKey.bankName}</p>
                  <p className="text-sm text-blue-800 font-mono break-all">
                    {pixKey.pixKeyType}: {pixKey.pixKey}
                  </p>
                  <p className="text-xs text-blue-700">{pixKey.accountHolderName}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Chave PIX não cadastrada
                    </p>
                    <p className="text-xs text-yellow-700">
                      Cadastre uma chave PIX no seu perfil para receber saques
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleOpenPixModal}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Cadastrar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Formulário */}
        <form id="withdrawal-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Saque
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
                disabled={!pixKey || isSubmitting}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {minAmount !== null ? `Valor mínimo: ${formatCurrency(minAmount)}` : 'Carregando...'}
            </p>
          </div>

          {/* Detalhamento de Valores */}
          {amount && parseCurrencyValue(amount) > 0 && feePercentage !== null && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Detalhamento da Transferência</h5>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Valor Solicitado:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(parseCurrencyValue(amount))}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Taxa de Transferência ({feePercentage.toFixed(2)}%):</span>
                <span className="text-sm font-medium text-red-600">
                  - {formatCurrency(parseCurrencyValue(amount) * (feePercentage / 100))}
                </span>
              </div>

              <div className="border-t border-blue-300 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Valor a ser Transferido:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(parseCurrencyValue(amount) * (1 - feePercentage / 100))}
                </span>
              </div>
            </div>
          )}

          {/* Loading state para parâmetros */}
          {amount && parseCurrencyValue(amount) > 0 && feePercentage === null && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">Carregando informações de taxa...</p>
            </div>
          )}

          {/* Informações Importantes 
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Informações Importantes</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• O saque será processado em até 24 horas úteis</li>
              <li>• O valor será enviado para sua chave PIX cadastrada</li>
              <li>• Valor mínimo para saque: R$ 30,00</li>
              <li>• Não há taxa de processamento</li>
            </ul>
          </div>
*/}
        </form>
      </div>
    </Modal>

    {/* Modal de Cadastro PIX */}
    <PixKeyModal
      isOpen={showPixModal}
      onClose={() => setShowPixModal(false)}
      onSuccess={handlePixModalSuccess}
    />

    {/* Modal de Senha Financeira */}
    <FinancialPasswordModal
      isOpen={showFinancialPasswordModal}
      onClose={() => {
        setShowFinancialPasswordModal(false)
        setPendingWithdrawal(null)
        setValidatedPassword(null)
      }}
      onSuccess={hasFinancialPassword ? undefined : handleFinancialPasswordCreated}
      onPasswordVerified={hasFinancialPassword ? handleFinancialPasswordVerified : undefined}
      mode={hasFinancialPassword ? 'verify' : 'create'}
      title={hasFinancialPassword ? 'Confirmar Senha Financeira' : 'Criar Senha Financeira'}
      description={hasFinancialPassword 
        ? 'Digite sua senha financeira para confirmar o saque'
        : 'Crie uma senha financeira para proteger suas operações de saque'}
    />
  </>
  )
} 
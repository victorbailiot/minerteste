'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TransactionType, TransactionStatus } from '@/generated/prisma'
import Image from 'next/image'

interface TransactionDetails {
  id: number
  type: TransactionType
  status: TransactionStatus
  amount: number
  description: string
  referenceId?: string
  correlationID?: string
  chargeId?: string
  pixBrCode?: string
  qrCodeImage?: string
  comprovanteUrl?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerCpfCnpj?: string
  expiresAt?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    name: string
    email: string
    phone: string
    referralCode: string
    createdAt: string
  }
  userPackages: Array<{
    id: number
    isActive: boolean
    activatedAt: string
    expiresAt?: string
    completedCycles: number
    package: {
      id: number
      name: string
      price: number
      description?: string
      points: number
    }
  }>
}

const transactionTypeLabels: Record<TransactionType, string> = {
  DEPOSIT: 'Depósito',
  BONUS: 'Bônus',
  WITHDRAWAL: 'Saque',
  PURCHASE: 'Compra',
  BONUS_PAYMENT: 'Pagamento com Bônus',
  MINING_REWARD: 'Recompensa de Mineração',
  PIX_PAYMENT: 'Pagamento PIX',
  CREDIT_PAYMENT: 'Pagamento com Cartão',
  DIRECT_BONUS: 'Bônus Direto',
  BOOSTED_BONUS: 'Bônus Turbinado',
  INDIRECT_BONUS: 'Bônus Indireto',
  CYCLE_BONUS: 'Bônus de Ciclo',
  BINARY_BONUS: 'Bônus Binário',
  PROFIT_SHARE: 'Divisão de Lucros',
  ACTIVATION_PIX: 'Ativação PIX',
  ACTIVATION_BONUS: 'Ativação Bônus',
  CASHBACK: 'Cashback',
  CAREER_BONUS: 'Bônus de Carreira',
  CAREER_PRIZE: 'Prêmio de Carreira',
  SOLIDARITY_PAYMENT: 'Crédito Minerador',
  REACTIVATION_BONUS: 'Bônus de Reativação',
  TRANSFER: 'Transferência',
  BONUS_ADJUSTMENT: 'Bônus de Ajuste'
}

const transactionStatusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada'
}

const statusColors: Record<TransactionStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

const getTransactionTypeColor = (type: TransactionType) => {
  const colors: Record<TransactionType, string> = {
    DEPOSIT: 'text-blue-600',
    BONUS: 'text-green-600',
    WITHDRAWAL: 'text-red-600',
    PURCHASE: 'text-purple-600',
    BONUS_PAYMENT: 'text-purple-600',
    MINING_REWARD: 'text-yellow-600',
    PIX_PAYMENT: 'text-indigo-600',
    CREDIT_PAYMENT: 'text-blue-700',
    DIRECT_BONUS: 'text-emerald-600',
    BOOSTED_BONUS: 'text-lime-600',
    INDIRECT_BONUS: 'text-teal-600',
    CYCLE_BONUS: 'text-cyan-600',
    BINARY_BONUS: 'text-sky-600',
    PROFIT_SHARE: 'text-violet-600',
    ACTIVATION_PIX: 'text-pink-600',
    ACTIVATION_BONUS: 'text-rose-600',
    CASHBACK: 'text-green-600',
    CAREER_BONUS: 'text-blue-600',
    CAREER_PRIZE: 'text-yellow-600',
    SOLIDARITY_PAYMENT: 'text-purple-600',
    REACTIVATION_BONUS: 'text-orange-600',
    TRANSFER: 'text-indigo-600',
    BONUS_ADJUSTMENT: 'text-amber-600'
  }
  return colors[type] || 'text-gray-600'
}

export default function TransactionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showComprovanteModal, setShowComprovanteModal] = useState(false)
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false)

  const transactionId = params.id as string

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/transactions/${transactionId}`)
        const data = await response.json()

        if (data.success) {
          setTransaction(data.data)
        } else {
          setError(data.error || 'Erro ao carregar detalhes da transação')
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da transação:', error)
        setError('Erro interno do servidor')
      } finally {
        setLoading(false)
      }
    }

    if (transactionId) {
      fetchTransactionDetails()
    }
  }, [transactionId])

  const handleManualPayment = async () => {
    if (!transaction) return

    setProcessingPayment(true)
    try {
      // Preparar payload do webhook baseado nos dados da transação
      const webhookPayload = {
        event: "OPENPIX:TRANSACTION_RECEIVED",
        charge: {
          value: Math.round(transaction.amount * 100), // Converter para centavos
          comment: transaction.description,
          identifier: transaction.chargeId || `manual-${transaction.id}`,
          correlationID: transaction.correlationID || `manual-${transaction.id}`,
          transactionID: transaction.chargeId || `manual-${transaction.id}`,
          status: "COMPLETED",
          additionalInfo: [
            {
              key: "tipo_compra",
              value: "pacote"
            },
            {
              key: "manual_payment",
              value: "true"
            },
            ...(transaction.user ? [
              {
                key: "usuario_id",
                value: transaction.user.id.toString()
              }
            ] : [])
          ],
          fee: 85,
          discount: 0,
          valueWithDiscount: Math.round(transaction.amount * 100),
          expiresDate: transaction.expiresAt || new Date(Date.now() + 3600000).toISOString(),
          type: "DYNAMIC",
          paymentLinkID: `manual-${transaction.id}`,
          createdAt: transaction.createdAt,
          updatedAt: new Date().toISOString(),
          customer: transaction.customerName ? {
            name: transaction.customerName,
            taxID: transaction.customerCpfCnpj ? {
              taxID: transaction.customerCpfCnpj,
              type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
            } : undefined,
            correlationID: `manual-${transaction.id}`
          } : undefined,
          paidAt: new Date().toISOString(),
          payer: transaction.customerName ? {
            name: transaction.customerName,
            taxID: transaction.customerCpfCnpj ? {
              taxID: transaction.customerCpfCnpj,
              type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
            } : undefined,
            correlationID: `manual-${transaction.id}`
          } : undefined,
          ensureSameTaxID: false,
          brCode: transaction.pixBrCode || "",
          expiresIn: 3600,
          pixKey: `manual-${transaction.id}`,
          paymentLinkUrl: `https://manual-payment-${transaction.id}`,
          qrCodeImage: transaction.qrCodeImage || "",
          globalID: `manual-${transaction.id}`,
          paymentMethods: {
            pix: {
              method: "PIX_COB",
              txId: transaction.chargeId || `manual-${transaction.id}`,
              value: Math.round(transaction.amount * 100),
              status: "COMPLETED",
              fee: 85,
              brCode: transaction.pixBrCode || "",
              transactionID: transaction.chargeId || `manual-${transaction.id}`,
              identifier: transaction.chargeId || `manual-${transaction.id}`,
              qrCodeImage: transaction.qrCodeImage || ""
            }
          }
        },
        pixQrCode: null,
        pix: {
          customer: transaction.customerName ? {
            name: transaction.customerName,
            taxID: transaction.customerCpfCnpj ? {
              taxID: transaction.customerCpfCnpj,
              type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
            } : undefined,
            correlationID: `manual-${transaction.id}`
          } : undefined,
          payer: transaction.customerName ? {
            name: transaction.customerName,
            taxID: transaction.customerCpfCnpj ? {
              taxID: transaction.customerCpfCnpj,
              type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
            } : undefined,
            correlationID: `manual-${transaction.id}`
          } : undefined,
          charge: {
            value: Math.round(transaction.amount * 100),
            comment: transaction.description,
            identifier: transaction.chargeId || `manual-${transaction.id}`,
            correlationID: transaction.correlationID || `manual-${transaction.id}`,
            transactionID: transaction.chargeId || `manual-${transaction.id}`,
            status: "COMPLETED",
            additionalInfo: [
              {
                key: "tipo_compra",
                value: "pacote"
              },
              {
                key: "manual_payment",
                value: "true"
              },
              ...(transaction.user ? [
                {
                  key: "usuario_id",
                  value: transaction.user.id.toString()
                }
              ] : [])
            ],
            fee: 85,
            discount: 0,
            valueWithDiscount: Math.round(transaction.amount * 100),
            expiresDate: transaction.expiresAt || new Date(Date.now() + 3600000).toISOString(),
            type: "DYNAMIC",
            paymentLinkID: `manual-${transaction.id}`,
            createdAt: transaction.createdAt,
            updatedAt: new Date().toISOString(),
            customer: transaction.customerName ? {
              name: transaction.customerName,
              taxID: transaction.customerCpfCnpj ? {
                taxID: transaction.customerCpfCnpj,
                type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
              } : undefined,
              correlationID: `manual-${transaction.id}`
            } : undefined,
            paidAt: new Date().toISOString(),
            payer: transaction.customerName ? {
              name: transaction.customerName,
              taxID: transaction.customerCpfCnpj ? {
                taxID: transaction.customerCpfCnpj,
                type: transaction.customerCpfCnpj.length === 11 ? "BR:CPF" : "BR:CNPJ"
              } : undefined,
              correlationID: `manual-${transaction.id}`
            } : undefined,
            ensureSameTaxID: false,
            brCode: transaction.pixBrCode || "",
            expiresIn: 3600,
            pixKey: `manual-${transaction.id}`,
            paymentLinkUrl: `https://manual-payment-${transaction.id}`,
            qrCodeImage: transaction.qrCodeImage || "",
            globalID: `manual-${transaction.id}`
          },
          value: Math.round(transaction.amount * 100),
          time: new Date().toISOString(),
          endToEndId: `manual-${transaction.id}`,
          transactionID: transaction.chargeId || `manual-${transaction.id}`,
          infoPagador: "Pagamento manual via admin",
          type: "PAYMENT",
          createdAt: new Date().toISOString(),
          globalID: `manual-${transaction.id}`
        },
        company: {
          id: "manual-company",
          name: "Minerstone",
          taxID: "00000000000000"
        },
        account: {
          accountId: "manual-account",
          branch: "0001",
          account: "0000"
        },
        refunds: []
      }

      // Enviar webhook para processar o pagamento
      const response = await fetch('/api/webhook/openpix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })

      if (response.ok) {
        // Recarregar os dados da transação para mostrar o novo status
        const refreshResponse = await fetch(`/api/admin/transactions/${transactionId}`)
        const refreshData = await refreshResponse.json()
        
        if (refreshData.success) {
          setTransaction(refreshData.data)
          toast.success('Pagamento processado com sucesso!')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar pagamento')
      }
    } catch (error) {
      console.error('Erro ao processar pagamento manual:', error)
      toast.error(`Erro ao processar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setProcessingPayment(false)
      setShowConfirmPaymentModal(false)
    }
  }

  const handleConfirmPayment = () => {
    setShowConfirmPaymentModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    // Formata telefone brasileiro
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const formatCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Voltar
        </button>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg font-medium mb-4">Transação não encontrada</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Transação #{transaction.id}
            </h1>
            <p className="text-gray-600">Detalhes completos da transação</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Botão Ver Comprovante */}
          {transaction.comprovanteUrl && (
            <button
              onClick={() => setShowComprovanteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Ver Comprovante</span>
            </button>
          )}
          
          {/* Botão PAGAR para transações pendentes de pagamento PIX */}
          {transaction.status === 'PENDING' && 
           (transaction.type === 'PIX_PAYMENT' || transaction.type === 'PURCHASE') && (
            <button
              onClick={handleConfirmPayment}
              disabled={processingPayment}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {processingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>PAGAR</span>
                </>
              )}
            </button>
          )}
          
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[transaction.status]}`}>
            {transactionStatusLabels[transaction.status]}
          </span>
          <span className={`text-lg font-bold ${getTransactionTypeColor(transaction.type)}`}>
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Principais */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações da Transação</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">ID</label>
                <p className="text-sm text-gray-900 font-mono">#{transaction.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Tipo</label>
                <p className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                  {transactionTypeLabels[transaction.type]}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-sm text-gray-900">{transaction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Valor</label>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[transaction.status]}`}>
                  {transactionStatusLabels[transaction.status]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Criada em</label>
                <p className="text-sm text-gray-900">{formatDate(transaction.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Atualizada em</label>
                <p className="text-sm text-gray-900">{formatDate(transaction.updatedAt)}</p>
              </div>
            </div>

            {transaction.paidAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Paga em</label>
                <p className="text-sm text-gray-900">{formatDate(transaction.paidAt)}</p>
              </div>
            )}

            {transaction.expiresAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Expira em</label>
                <p className="text-sm text-gray-900">{formatDate(transaction.expiresAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Referências e IDs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Referências e IDs</h2>
          <div className="space-y-4">
            {transaction.referenceId && (
              <div>
                <label className="block text-sm font-medium text-gray-500">ID de Referência</label>
                <p className="text-sm text-gray-900 font-mono">{transaction.referenceId}</p>
              </div>
            )}

            {transaction.correlationID && (
              <div>
                <label className="block text-sm font-medium text-gray-500">ID de Correlação</label>
                <p className="text-sm text-gray-900 font-mono">{transaction.correlationID}</p>
              </div>
            )}

            {transaction.chargeId && (
              <div>
                <label className="block text-sm font-medium text-gray-500">ID da Cobrança</label>
                <p className="text-sm text-gray-900 font-mono">{transaction.chargeId}</p>
              </div>
            )}

            {transaction.pixBrCode && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Código PIX</label>
                <p className="text-sm text-gray-900 font-mono break-all">{transaction.pixBrCode}</p>
              </div>
            )}

            {transaction.qrCodeImage && (
              <div>
                <label className="block text-sm font-medium text-gray-500">QR Code</label>
                <Image 
                  src={transaction.qrCodeImage} 
                  alt="QR Code PIX" 
                  width={256}
                  height={256}
                  className="mt-2 max-w-xs border border-gray-200 rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Dados do Cliente */}
        {(transaction.customerName || transaction.customerEmail || transaction.customerPhone || transaction.customerCpfCnpj) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h2>
            <div className="space-y-4">
              {transaction.customerName && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-sm text-gray-900">{transaction.customerName}</p>
                </div>
              )}

              {transaction.customerEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{transaction.customerEmail}</p>
                </div>
              )}

              {transaction.customerPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-sm text-gray-900">{formatPhone(transaction.customerPhone)}</p>
                </div>
              )}

              {transaction.customerCpfCnpj && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">CPF/CNPJ</label>
                  <p className="text-sm text-gray-900">{formatCpfCnpj(transaction.customerCpfCnpj)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dados do Usuário */}
        {transaction.user && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Usuário</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">ID do Usuário</label>
                  <p className="text-sm text-gray-900 font-mono">#{transaction.user.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Código de Referência</label>
                  <p className="text-sm text-gray-900 font-mono">{transaction.user.referralCode}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Nome</label>
                <p className="text-sm text-gray-900">{transaction.user.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{transaction.user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Telefone</label>
                <p className="text-sm text-gray-900">{formatPhone(transaction.user.phone)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Membro desde</label>
                <p className="text-sm text-gray-900">{formatDateOnly(transaction.user.createdAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pacotes Relacionados */}
      {transaction.userPackages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pacotes Relacionados</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pacote
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pontos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ativado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ciclos Completados
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transaction.userPackages.map((userPackage) => (
                  <tr key={userPackage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userPackage.package.name}
                        </div>
                        {userPackage.package.description && (
                          <div className="text-sm text-gray-500">
                            {userPackage.package.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(userPackage.package.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userPackage.package.points.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userPackage.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userPackage.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userPackage.activatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userPackage.completedCycles}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Pagamento */}
      {showConfirmPaymentModal && (
        <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Pagamento
              </h3>
              <button
                onClick={() => setShowConfirmPaymentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Atenção: Ação Irreversível
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Ao confirmar este pagamento, as seguintes ações serão executadas automaticamente e <strong>não poderão ser revertidas</strong>:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 mb-4">
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Ativação do pacote do usuário</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Distribuição de pontos na rede binária</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Pagamento de bônus de indicação direta (7%)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Pagamento de bônus de indicação indireta (2% e 1%)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Ativação do ponto rotativo (30 dias)</span>
                    </li>
                  </ul>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 font-medium">
                      Valor do pagamento: {formatCurrency(transaction?.amount || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleManualPayment}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirmar Pagamento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Comprovante */}
      {showComprovanteModal && transaction.comprovanteUrl && (
        <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Comprovante de Pagamento
              </h3>
              <button
                onClick={() => setShowComprovanteModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <div className="flex justify-center">
                {transaction.comprovanteUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={transaction.comprovanteUrl}
                    className="w-full h-[70vh] border border-gray-200 rounded"
                    title="Comprovante PDF"
                  />
                ) : (
                  <Image
                    src={transaction.comprovanteUrl}
                    alt="Comprovante de Pagamento"
                    width={800}
                    height={600}
                    className="max-w-full max-h-[70vh] object-contain border border-gray-200 rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'text-center text-red-600 p-8'
                      errorDiv.innerHTML = `
                        <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <p class="text-lg font-medium">Erro ao carregar imagem</p>
                        <p class="text-sm text-gray-500 mt-2">Não foi possível exibir o comprovante</p>
                      `
                      target.parentNode?.appendChild(errorDiv)
                    }}
                  />
                )}
              </div>
              <div className="mt-4 text-center">
                <a
                  href={transaction.comprovanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir em Nova Aba
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
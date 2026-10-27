/**
 * Modal de Pagamento PIX via Stripe
 * Componente para processar pagamentos PIX usando Stripe
 */

'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, QrCode, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { STRIPE_PUBLISHABLE_KEY, isStripeConfigured } from '@/lib/stripe/stripe-config'
import { toast } from 'sonner'

// ===== TIPOS =====

interface StripePixPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  packageId: string
  packageName: string
  packagePrice: number
  quantity?: number
  currency?: string
  onSuccess?: (paymentIntentId: string) => void
  onError?: (error: string) => void
}

// ===== CONFIGURAÇÃO STRIPE =====

const stripePromise = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder' 
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null

// ===== COMPONENTE PIX FORM =====

interface PixFormProps {
  packageId: string
  packageName: string
  packagePrice: number
  quantity: number
  currency: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

const PixForm: React.FC<PixFormProps> = ({
  packageId,
  packageName,
  packagePrice,
  quantity,
  currency,
  onSuccess,
  onError,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [pixData, setPixData] = useState<{
    qrCode?: string
    copiaCola?: string
    paymentIntentId?: string
  } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'succeeded' | 'failed'>('pending')
  const [copied, setCopied] = useState(false)
  const [expirationTime, setExpirationTime] = useState<number>(3600) // 1 hora em segundos

  // Countdown para expiração
  useEffect(() => {
    if (pixData && expirationTime > 0) {
      const timer = setInterval(() => {
        setExpirationTime(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [pixData, expirationTime])

  // Verificar status do pagamento periodicamente
  useEffect(() => {
    if (!pixData?.paymentIntentId || paymentStatus !== 'processing') return

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/stripe/charge?payment_intent_id=${pixData.paymentIntentId}`)
        const result = await response.json()

        if (result.success && result.data?.payment) {
          const status = result.data.payment.status

          if (status === 'succeeded') {
            setPaymentStatus('succeeded')
            toast.success('Pagamento confirmado!')
            if (pixData.paymentIntentId) {
              onSuccess(pixData.paymentIntentId)
            }
          } else if (status === 'canceled' || status === 'failed') {
            setPaymentStatus('failed')
            onError('Pagamento falhou ou foi cancelado')
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error)
      }
    }

    // Verificar a cada 3 segundos
    const interval = setInterval(checkPaymentStatus, 3000)

    return () => clearInterval(interval)
  }, [pixData, paymentStatus, onSuccess, onError])

  // Criar PaymentIntent com PIX
  const handleCreatePixPayment = async () => {
    setIsProcessing(true)

    try {
      // Chamar API para criar PaymentIntent com PIX
      const response = await fetch('/api/stripe/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packageId,
          quantity,
          currency: 'brl', // PIX só funciona com BRL
          paymentMethod: 'pix'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar pagamento PIX')
      }

      // Extrair dados do PIX
      const { paymentIntentId, pixData: pixInfo } = result.data

      if (!pixInfo?.pixQrCode || !pixInfo?.pixCopiaCola) {
        throw new Error('Dados do PIX não foram retornados corretamente')
      }

      setPixData({
        qrCode: pixInfo.pixQrCode,
        copiaCola: pixInfo.pixCopiaCola,
        paymentIntentId
      })

      setPaymentStatus('processing')
      toast.success('PIX gerado com sucesso!')

    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento'
      toast.error(errorMessage)
      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Copiar código PIX
  const handleCopyPixCode = () => {
    if (pixData?.copiaCola) {
      navigator.clipboard.writeText(pixData.copiaCola)
      setCopied(true)
      toast.success('Código PIX copiado!')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  // Formatar tempo de expiração
  const formatExpirationTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Formatar moeda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount)
  }

  // Se o pagamento foi bem-sucedido
  if (paymentStatus === 'succeeded') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Pagamento Confirmado!
        </h3>
        <p className="text-gray-600 mb-4">
          Seu pagamento foi processado com sucesso.
        </p>
      </div>
    )
  }

  // Se o pagamento falhou
  if (paymentStatus === 'failed') {
    return (
      <div className="text-center py-8">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Pagamento Falhou
        </h3>
        <p className="text-gray-600 mb-4">
          Não foi possível processar seu pagamento. Tente novamente.
        </p>
        <Button onClick={onCancel}>Fechar</Button>
      </div>
    )
  }

  // Se ainda não gerou o PIX
  if (!pixData) {
    return (
      <div className="space-y-6">
        {/* Informações do Pagamento */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pacote:</span>
            <span className="font-semibold text-gray-900">{packageName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Quantidade:</span>
            <span className="font-semibold text-gray-900">{quantity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Valor Total:</span>
            <span className="text-lg font-bold text-blue-600">
              {formatCurrency(packagePrice * quantity)}
            </span>
          </div>
        </div>

        {/* Aviso IOF */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Sobre IOF (Imposto sobre Operações Financeiras)</p>
              <p>
                Esta é uma compra internacional e inclui a tarifa de 3.5% de IOF. 
                Ao prosseguir, você reconhece e aceita os termos e condições do Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Como funciona o PIX:</h4>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>Clique no botão abaixo para gerar o código PIX</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>Escaneie o QR Code ou copie o código PIX</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>Abra o app do seu banco e efetue o pagamento</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span>Aguarde a confirmação automática (geralmente instantânea)</span>
            </li>
          </ol>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            onClick={handleCreatePixPayment}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PIX...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Gerar PIX
              </>
            )}
          </Button>
          <Button onClick={onCancel} variant="outline" disabled={isProcessing}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // Exibir PIX gerado
  return (
    <div className="space-y-6">
      {/* Tempo de Expiração */}
      {expirationTime > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">Tempo para pagamento</p>
            <p className="text-xs text-orange-700">
              Este código expira em {formatExpirationTime(expirationTime)}
            </p>
          </div>
        </div>
      )}

      {expirationTime === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Código Expirado</p>
            <p className="text-xs text-red-700">
              O tempo para pagamento expirou. Gere um novo código.
            </p>
          </div>
        </div>
      )}

      {/* QR Code */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="text-center font-semibold text-gray-900 mb-4">
          Escaneie o QR Code
        </h4>
        <div className="flex justify-center">
          {pixData.qrCode ? (
            <img 
              src={pixData.qrCode} 
              alt="QR Code PIX" 
              className="w-64 h-64 border-2 border-gray-200 rounded-lg"
            />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Código PIX Copia e Cola */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Ou copie o código PIX:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pixData.copiaCola || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
          />
          <Button
            onClick={handleCopyPixCode}
            variant={copied ? 'default' : 'outline'}
            size="icon"
            className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {copied ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Status do Pagamento */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-medium text-blue-900">Aguardando pagamento...</p>
            <p className="text-sm text-blue-700">
              Assim que o pagamento for confirmado, você será notificado automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Botão Cancelar */}
      <Button onClick={onCancel} variant="outline" className="w-full">
        Fechar
      </Button>
    </div>
  )
}

// ===== COMPONENTE PRINCIPAL =====

const StripePixPaymentModal: React.FC<StripePixPaymentModalProps> = ({
  isOpen,
  onClose,
  packageId,
  packageName,
  packagePrice,
  quantity = 1,
  currency = 'brl',
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 500)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Verificar se o Stripe está configurado
  if (!isStripeConfigured) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configuração Necessária
            </h3>
            <p className="text-gray-600 mb-4">
              O Stripe não está configurado. Configure as variáveis de ambiente para usar pagamentos.
            </p>
            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSuccess = (paymentIntentId: string) => {
    onSuccess?.(paymentIntentId)
    setTimeout(() => onClose(), 2000)
  }

  const handleError = (error: string) => {
    onError?.(error)
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Pagamento PIX</h2>
              <p className="text-sm text-gray-600">Via Stripe</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Carregando...</span>
            </div>
          ) : !stripePromise ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configuração Necessária
              </h3>
              <p className="text-gray-600">
                O Stripe não está configurado corretamente. Configure as variáveis de ambiente.
              </p>
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <PixForm
                packageId={packageId}
                packageName={packageName}
                packagePrice={packagePrice}
                quantity={quantity}
                currency={currency}
                onSuccess={handleSuccess}
                onError={handleError}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}

export default StripePixPaymentModal








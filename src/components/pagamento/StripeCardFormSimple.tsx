/**
 * Formulário de Cartão Stripe Simples
 * Versão que sempre usa campos HTML nativos para garantir visibilidade
 */

'use client'

import React, { useState } from 'react'
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, CheckCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

// ===== TIPOS =====

interface StripeCardFormSimpleProps {
  packageId: string
  packageName: string
  packagePrice: number
  currency: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

// ===== COMPONENTE =====

const StripeCardFormSimple: React.FC<StripeCardFormSimpleProps> = ({
  packageId,
  packageName,
  packagePrice,
  currency,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCvv, setShowCvv] = useState(false)
  
  // Campos do formulário
  const [cardData, setCardData] = useState<{
    number: string
    expiry: string
    cvc: string
    name: string
  }>({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe) {
      setError('Stripe não está carregado')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // 1. Criar Payment Intent no backend
      const response = await fetch('/api/stripe/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          currency,
          metadata: {
            source: 'stripe_card_form_simple'
          }
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar pagamento')
      }

      const { clientSecret } = result.data

      // 2. Criar método de pagamento usando elementos do Stripe
      const cardNumberElement = elements?.getElement(CardNumberElement)
      if (!cardNumberElement) {
        throw new Error('Elemento do cartão não encontrado')
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: cardData.name,
        },
      })

      if (pmError) {
        throw new Error(pmError.message || 'Erro ao criar método de pagamento')
      }

      // 3. Confirmar pagamento
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod.id,
        }
      )

      if (confirmError) {
        throw new Error(confirmError.message || 'Erro ao confirmar pagamento')
      }

      if (paymentIntent?.status === 'succeeded') {
        toast.success('Pagamento aprovado com sucesso!')
        onSuccess(paymentIntent.id)
      } else {
        throw new Error(`Status do pagamento: ${paymentIntent?.status}`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      onError(errorMessage)
      toast.error(`Erro no pagamento: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    })
    return formatter.format(amount)
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    // Limitar a 16 dígitos
    const limited = v.substring(0, 16)
    const parts: string[] = []
    for (let i = 0, len = limited.length; i < len; i += 4) {
      parts.push(limited.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return limited
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardData(prev => ({ ...prev, number: formatted }))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value)
    setCardData(prev => ({ ...prev, expiry: formatted }))
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4)
    setCardData(prev => ({ ...prev, cvc: value }))
  }

  const isFormValid = () => {
    const cardNumber = cardData.number.replace(/\s/g, '')
    const hasValidCardNumber = cardNumber.length >= 13 && cardNumber.length <= 16
    const hasValidExpiry = cardData.expiry.length === 5 && cardData.expiry.includes('/')
    const hasValidCvc = cardData.cvc.length >= 3 && cardData.cvc.length <= 4
    const hasValidName = cardData.name.trim().length > 0
    
    return hasValidCardNumber && hasValidExpiry && hasValidCvc && hasValidName
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumo do Pacote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Resumo da Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pacote:</span>
            <span className="font-medium">{packageName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Valor:</span>
            <span className="font-bold text-lg">
              {formatCurrency(packagePrice, currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Moeda:</span>
            <span className="text-sm font-medium uppercase bg-gray-100 px-2 py-1 rounded">
              {currency}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Formulário do Cartão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Informações do Cartão
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Digite os dados do seu cartão de crédito ou débito
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Nome do Titular */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nome do Titular *
              </label>
              <input
                type="text"
                value={cardData.name}
                onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome como está no cartão"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Número do Cartão */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Número do Cartão *
              </label>
              <input
                type="text"
                value={cardData.number}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Data de Validade e CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Data de Validade *
                </label>
                <input
                  type="text"
                  value={cardData.expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  CVV *
                </label>
                <div className="relative">
                  <input
                    type={showCvv ? "text" : "password"}
                    value={cardData.cvc}
                    onChange={handleCvcChange}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Informações de Segurança */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-medium">🔒 Pagamento Seguro</p>
                <p>• Aceitamos cartões de crédito e débito</p>
                <p>• Seu pagamento é processado de forma segura pela Stripe</p>
                <p>• Você receberá uma confirmação por email</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing || !isFormValid()}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Pagarrrrr {formatCurrency(packagePrice, currency)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default StripeCardFormSimple

/**
 * Formulário de Cartão Stripe Final
 * Versão corrigida usando Stripe Elements
 */

'use client'

import React, { useState } from 'react'
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, CheckCircle, XCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'

// ===== TIPOS =====

interface StripeCardFormFinalProps {
  packageId: string
  packageName: string
  packagePrice: number
  quantity?: number
  currency: string
  minerId: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

// ===== COMPONENTE =====

const StripeCardFormFinal: React.FC<StripeCardFormFinalProps> = ({
  packageId,
  packageName,
  packagePrice,
  quantity,
  currency,
  minerId,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardNumberComplete, setCardNumberComplete] = useState(false)
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false)
  const [cardCvcComplete, setCardCvcComplete] = useState(false)
  const [stripeLoaded, setStripeLoaded] = useState(false)
  
  // Verificar se o Stripe carregou
  React.useEffect(() => {
    if (stripe && elements) {
      setStripeLoaded(true)
    }
  }, [stripe, elements])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe não está configurado. Entre em contato com o suporte.')
      toast.error('Erro de configuração do Stripe')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // 1. Criar Payment Intent no backend
      const requestBody = {
        packageId: packageId.toString(), // Garantir que é string
        minerId,
        currency,
        quantity: quantity || 1, // Usar quantity ou 1 por padrão
        metadata: {
          source: 'stripe_card_form_final',
          minerId
        }
      }

      const response = await fetch('/api/stripe/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar pagamento')
      }

      // Verificar se result.data existe e tem clientSecret
      if (!result.data || !result.data.clientSecret) {
        throw new Error('Dados de pagamento inválidos')
      }

      const { clientSecret } = result.data

      // 2. Obter elementos do cartão de forma segura
      const cardNumberElement = elements.getElement(CardNumberElement)
      const cardExpiryElement = elements.getElement(CardExpiryElement)
      const cardCvcElement = elements.getElement(CardCvcElement)

      if (!cardNumberElement || !cardExpiryElement || !cardCvcElement) {
        throw new Error('Elementos do cartão não encontrados')
      }

      // 3. Criar PaymentMethod usando elementos separados
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: user?.name || 'Cliente',
          email: user?.email,
          phone: user?.phone,
        },
      })

      if (pmError) {
        throw new Error(pmError.message || 'Erro ao criar método de pagamento')
      }

      // 4. Confirmar pagamento
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

  const handleCardNumberChange = (event: any) => {
    setCardNumberComplete(event.complete)
    setError(null)
  }

  const handleCardExpiryChange = (event: any) => {
    setCardExpiryComplete(event.complete)
    setError(null)
  }

  const handleCardCvcChange = (event: any) => {
    setCardCvcComplete(event.complete)
    setError(null)
  }

  const isFormValid = () => {
    return cardNumberComplete && cardExpiryComplete && cardCvcComplete
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
              {formatCurrency(Math.round(packagePrice * 1.061 * 100) / 100, currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Moeda:</span>
            <span className="text-sm font-medium uppercase bg-gray-100 px-2 py-1 rounded">
              {currency}
            </span>
          </div>
          <p className="text-xs text-gray-500 text-right">inclui taxa de 6,1%</p>
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
            {/* Número do Cartão */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Número do Cartão *
              </label>
              <div className={`p-3 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                cardNumberComplete ? 'border-green-500' : 'border-gray-300'
              }`}>
                {stripeLoaded ? (
                  <CardNumberElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                    }}
                    onChange={handleCardNumberChange}
                  />
                ) : (
                  <div className="flex items-center justify-center py-4 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Carregando...
                  </div>
                )}
              </div>
              {cardNumberComplete && (
                <p className="text-xs text-green-600">✓ Número válido</p>
              )}
            </div>

            {/* Data de Validade e CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Data de Validade *
                </label>
                <div className={`p-3 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                  cardExpiryComplete ? 'border-green-500' : 'border-gray-300'
                }`}>
                  {stripeLoaded ? (
                    <CardExpiryElement
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                              color: '#aab7c4',
                            },
                          },
                          invalid: {
                            color: '#9e2146',
                          },
                        },
                      }}
                      onChange={handleCardExpiryChange}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-4 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Carregando...
                    </div>
                  )}
                </div>
                {cardExpiryComplete && (
                  <p className="text-xs text-green-600">✓ Data válida</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  CVV *
                </label>
                <div className={`p-3 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                  cardCvcComplete ? 'border-green-500' : 'border-gray-300'
                }`}>
                  {stripeLoaded ? (
                    <CardCvcElement
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                              color: '#aab7c4',
                            },
                          },
                          invalid: {
                            color: '#9e2146',
                          },
                        },
                      }}
                      onChange={handleCardCvcChange}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-4 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Carregando...
                    </div>
                  )}
                </div>
                {cardCvcComplete && (
                  <p className="text-xs text-green-600">✓ CVV válido</p>
                )}
              </div>
            </div>

            {!stripeLoaded && (
              <p className="text-xs text-red-600">⚠️ Não carregou corretamente</p>
            )}

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
                <p>• Seu pagamento é processado de forma segura</p>
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
          disabled={!stripeLoaded || isProcessing || !isFormValid()}
          className={`flex-1 ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Pagar
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default StripeCardFormFinal

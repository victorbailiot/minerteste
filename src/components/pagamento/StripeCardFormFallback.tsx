/**
 * Formulário de Cartão Stripe com Fallback
 * Versão alternativa com campos HTML nativos para melhor visibilidade
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, CheckCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

// ===== TIPOS =====

interface StripeCardFormFallbackProps {
  packageId: string
  packageName: string
  packagePrice: number
  currency: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

// ===== COMPONENTE =====

const StripeCardFormFallback: React.FC<StripeCardFormFallbackProps> = ({
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
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
            source: 'stripe_card_form_fallback'
          }
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar pagamento')
      }

      const { clientSecret } = result.data

      // 2. Confirmar pagamento com Stripe
      const cardNumberElement = elements.getElement(CardNumberElement)
      if (!cardNumberElement) {
        throw new Error('Elemento do cartão não encontrado')
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
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
              {/* Número do Cartão */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Número do Cartão
                  </label>
                  <div className="relative">
                    <div className="border border-gray-300 rounded-md p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[48px] flex items-center">
                      <CardNumberElement
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#374151',
                              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              lineHeight: '1.5',
                              '::placeholder': {
                                color: '#9CA3AF',
                              },
                            },
                            invalid: {
                              color: '#DC2626',
                            },
                          },
                          placeholder: '1234 1234 1234 1234',
                          showIcon: true,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Data de Validade e CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Validade
                    </label>
                    <div className="relative">
                      <div className="border border-gray-300 rounded-md p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[48px] flex items-center">
                        <CardExpiryElement
                          options={{
                            style: {
                              base: {
                                fontSize: '16px',
                                color: '#374151',
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                lineHeight: '1.5',
                                '::placeholder': {
                                  color: '#9CA3AF',
                                },
                              },
                              invalid: {
                                color: '#DC2626',
                              },
                            },
                            placeholder: 'MM/AA',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      CVV
                    </label>
                    <div className="relative">
                      <div className="border border-gray-300 rounded-md p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[48px] flex items-center">
                        <CardCvcElement
                          options={{
                            style: {
                              base: {
                                fontSize: '16px',
                                color: '#374151',
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                lineHeight: '1.5',
                                '::placeholder': {
                                  color: '#9CA3AF',
                                },
                              },
                              invalid: {
                                color: '#DC2626',
                              },
                            },
                            placeholder: '123',
                          }}
                        />
                      </div>
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
          disabled={!stripe || isProcessing}
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
              Pagar {formatCurrency(packagePrice, currency)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default StripeCardFormFallback

/**
 * Formulário de Cartão Stripe com Campos Individuais
 * Componente alternativo que usa campos separados para melhor visibilidade
 */

'use client'

import React, { useState } from 'react'
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
import { Loader2, CreditCard, CheckCircle, XCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'

// ===== TIPOS =====

interface StripeCardFormProps {
  packageId: string
  packageName: string
  packagePrice: number
  currency: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

// ===== COMPONENTE =====

const StripeCardForm: React.FC<StripeCardFormProps> = ({
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
  const [cardComplete, setCardComplete] = useState({
    number: false,
    expiry: false,
    cvc: false
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Stripe não está carregado')
      return
    }

    // Verificar se todos os campos estão preenchidos
    if (!cardComplete.number || !cardComplete.expiry || !cardComplete.cvc) {
      setError('Por favor, preencha todos os campos do cartão')
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
            source: 'stripe_card_form'
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

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
          },
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

  const handleCardChange = (field: 'number' | 'expiry' | 'cvc') => (event: any) => {
    setCardComplete(prev => ({
      ...prev,
      [field]: event.complete
    }))
  }

  const isFormComplete = cardComplete.number && cardComplete.expiry && cardComplete.cvc

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
                    onChange={handleCardChange('number')}
                  />
                </div>
                {!cardComplete.number && (
                  <div className="absolute inset-0 pointer-events-none flex items-center px-3 text-gray-400">
                    <span className="text-sm">1234 1234 1234 1234</span>
                  </div>
                )}
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
                      onChange={handleCardChange('expiry')}
                    />
                  </div>
                  {!cardComplete.expiry && (
                    <div className="absolute inset-0 pointer-events-none flex items-center px-3 text-gray-400">
                      <span className="text-sm">MM/AA</span>
                    </div>
                  )}
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
                      onChange={handleCardChange('cvc')}
                    />
                  </div>
                  {!cardComplete.cvc && (
                    <div className="absolute inset-0 pointer-events-none flex items-center px-3 text-gray-400">
                      <span className="text-sm">123</span>
                    </div>
                  )}
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
          disabled={!stripe || isProcessing || !isFormComplete}
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
              Pagar
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default StripeCardForm

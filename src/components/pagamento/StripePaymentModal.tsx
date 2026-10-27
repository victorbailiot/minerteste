/**
 * Modal de Pagamento Stripe
 * Componente para processar pagamentos via Stripe
 */

'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle } from 'lucide-react'
import { STRIPE_PUBLISHABLE_KEY, STRIPE_ELEMENTS_OPTIONS, isStripeConfigured } from '@/lib/stripe/stripe-config'
import StripeCardFormFinal from './StripeCardFormFinal'

// ===== TIPOS =====

interface StripePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  packageId: string
  packageName: string
  packagePrice: number
  quantity?: number
  currency?: string
  minerId: string
  onSuccess?: (paymentIntentId: string) => void
  onError?: (error: string) => void
}

// ===== CONFIGURAÇÃO STRIPE =====

// Carregar Stripe de forma segura
const stripePromise = STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder' 
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null

// ===== COMPONENTE PRINCIPAL =====

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  packageId,
  packageName,
  packagePrice,
  quantity = 1,
  currency = 'usd',
  minerId,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      // Simular carregamento do Stripe
      setTimeout(() => setIsLoading(false), 1000)
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
    onClose()
  }

  const handleError = (error: string) => {
    onError?.(error)
  }

  return (
    <div className="fixed inset-0 bg-black/85 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Pagamento com Cartão</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando...</span>
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
            <Elements 
              stripe={stripePromise} 
              options={{
                ...STRIPE_ELEMENTS_OPTIONS,
                clientSecret: undefined, // Garantir que não há conflito
              }}
            >
              <StripeCardFormFinal
                packageId={packageId}
                packageName={packageName}
                packagePrice={packagePrice}
                currency={currency}
                quantity={quantity}
                minerId={minerId}
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

export default StripePaymentModal

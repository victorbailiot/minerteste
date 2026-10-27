/**
 * Botão de Checkout Stripe
 * Redireciona para Checkout Session do Stripe
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, Globe } from 'lucide-react'
import { toast } from 'sonner'

// ===== TIPOS =====

interface StripeCheckoutButtonProps {
  packageId: string
  packageName: string
  packagePrice: number
  quantity?: number
  currency?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  onSuccess?: (checkoutUrl: string) => void
  onError?: (error: string) => void
}

// ===== COMPONENTE =====

const StripeCheckoutButton: React.FC<StripeCheckoutButtonProps> = ({
  packageId,
  packageName,
  packagePrice,
  quantity = 1,
  currency = 'usd',
  className,
  variant = 'default',
  size = 'default',
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)

    try {
      // Criar Checkout Session
      const response = await fetch('/api/stripe/charge', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          currency,
          quantity,
          metadata: {
            source: 'stripe_checkout_button'
          },
          returnUrl: `${window.location.origin}/dashboard/planos?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard/planos?canceled=true`
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar checkout')
      }

      const { checkoutUrl } = result.data

      // Notificar sucesso
      onSuccess?.(checkoutUrl)

      // Redirecionar para Checkout Session
      window.location.href = checkoutUrl

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Erro ao criar checkout:', error)
      
      onError?.(errorMessage)
      toast.error(`Erro ao processar pagamento: ${errorMessage}`)
    } finally {
      setIsLoading(false)
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
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <Globe className="mr-2 h-4 w-4" />
          Pagar com Cartão
        </>
      )}
    </Button>
  )
}

export default StripeCheckoutButton

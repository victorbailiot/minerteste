/**
 * Exemplo de Uso da Integração Stripe
 * Demonstra como integrar os componentes Stripe na página de planos
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { CreditCard, Globe, QrCode, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

// Componentes Stripe
import StripePaymentModal from './StripePaymentModal'
import StripeCheckoutButton from './StripeCheckoutButton'
import CurrencySelector from '../CurrencySelector'

// ===== TIPOS =====

interface Package {
  id: string
  name: string
  description: string
  price: number
  points: number
  cycleBonus: number
  isActive: boolean
}

interface StripePaymentExampleProps {
  packages: Package[]
}

// ===== COMPONENTE =====

const StripePaymentExample: React.FC<StripePaymentExampleProps> = ({ packages }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('usd')
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'modal' | 'checkout'>('modal')

  const handlePaymentSuccess = (paymentIntentId: string) => {
    toast.success('Pagamento aprovado com sucesso!')
    console.log('Payment Intent ID:', paymentIntentId)
    // Aqui você pode redirecionar ou atualizar o estado
  }

  const handlePaymentError = (error: string) => {
    toast.error(`Erro no pagamento: ${error}`)
    console.error('Payment Error:', error)
  }

  const handleCheckoutSuccess = (checkoutUrl: string) => {
    toast.success('Redirecionando para checkout...')
    console.log('Checkout URL:', checkoutUrl)
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    })
    return formatter.format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Moeda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Selecionar Moeda
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Escolha a moeda para o pagamento
          </p>
        </CardHeader>
        <CardContent>
          <CurrencySelector
            value={selectedCurrency}
            onValueChange={setSelectedCurrency}
          />
        </CardContent>
      </Card>

      {/* Lista de Pacotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {pkg.name}
                <Badge variant={pkg.isActive ? "default" : "secondary"}>
                  {pkg.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preço */}
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(pkg.price, selectedCurrency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pkg.points} pontos • {formatCurrency(pkg.cycleBonus, selectedCurrency)} bônus
                </div>
              </div>

              <hr className="my-4" />

              {/* Métodos de Pagamento */}
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setSelectedPackage(pkg)
                    setShowStripeModal(true)
                  }}
                  className="w-full"
                  disabled={!pkg.isActive}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar com Cartão (Modal)
                </Button>
                
                <StripeCheckoutButton
                  packageId={pkg.id}
                  packageName={pkg.name}
                  packagePrice={pkg.price}
                  currency={selectedCurrency}
                  className="w-full"
                  onSuccess={handleCheckoutSuccess}
                  onError={handlePaymentError}
                />
              </div>

              {/* Informações Adicionais */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Pagamento seguro via Stripe
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Suporte a {selectedCurrency.toUpperCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Pagamento Stripe */}
      {selectedPackage && (
        <StripePaymentModal
          isOpen={showStripeModal}
          onClose={() => {
            setShowStripeModal(false)
            setSelectedPackage(null)
          }}
          packageId={selectedPackage.id}
          packageName={selectedPackage.name}
          packagePrice={selectedPackage.price}
          currency={selectedCurrency}
          minerId="1"
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  )
}

export default StripePaymentExample

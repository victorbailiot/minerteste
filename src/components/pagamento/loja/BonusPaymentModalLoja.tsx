'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Package as PackageIcon
} from 'lucide-react'
import { toast } from 'sonner'

interface BonusPaymentModalLojaProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId?: string) => void
  orderId: string
  orderNumber: string
  total: number
  items?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

const BonusPaymentModalLoja: React.FC<BonusPaymentModalLojaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  orderNumber,
  total,
  items = []
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [balanceInfo, setBalanceInfo] = useState<{
    canPayWithBonus: boolean
    availableBalance: number
    requiredAmount: number
    missingAmount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      checkBalance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId, total])

  const checkBalance = async () => {
    setIsChecking(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/store/payments/bonus-payment?orderId=${orderId}&total=${total}`
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao verificar saldo')
      }

      if (result.success) {
        setBalanceInfo(result.data)
      } else {
        throw new Error(result.error || 'Erro ao verificar saldo')
      }
    } catch (err) {
      console.error('Erro ao verificar saldo:', err)
      setError(err instanceof Error ? err.message : 'Erro ao verificar saldo')
    } finally {
      setIsChecking(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!balanceInfo?.canPayWithBonus) {
      toast.error('Saldo insuficiente')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/store/payments/bonus-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          orderNumber,
          total
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      if (result.success) {
        toast.success('Pagamento realizado com sucesso!')
        onSuccess(result.data.transactionId)
        onClose()
      } else {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Pagamento com Saldo de Bônus
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} - Confirme os detalhes do pagamento usando seu saldo de bônus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <PackageIcon className="w-4 h-4" />
              <span className="font-medium">Detalhes da Compra</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pedido:</span>
                <Badge variant="outline">#{orderNumber}</Badge>
              </div>
              
              {items.length > 0 && (
                <div className="space-y-1 mt-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isChecking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Verificando saldo...</span>
            </div>
          ) : balanceInfo ? (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>Seu Saldo de Bônus</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Saldo Disponível:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(balanceInfo.availableBalance)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valor Necessário:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(balanceInfo.requiredAmount)}
                  </span>
                </div>

                {!balanceInfo.canPayWithBonus && balanceInfo.missingAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm font-medium">Faltam:</span>
                    <span className="font-bold">
                      {formatCurrency(balanceInfo.missingAmount)}
                    </span>
                  </div>
                )}
              </div>

              {balanceInfo.canPayWithBonus ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Você possui saldo suficiente para esta compra!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Saldo insuficiente. Você precisa de mais {formatCurrency(balanceInfo.missingAmount)} em bônus.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {balanceInfo?.canPayWithBonus && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                O valor será debitado do seu saldo de bônus imediatamente após a confirmação.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={isLoading || isChecking || !balanceInfo?.canPayWithBonus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BonusPaymentModalLoja
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

interface BonusPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId?: string) => void
  packageId: string
  packageName: string
  packagePrice: number
  quantity: number
  currency: string
  minerId: string
}

const BonusPaymentModal: React.FC<BonusPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  packageId,
  packageName,
  packagePrice,
  quantity,
  currency,
  minerId
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

  // Verificar saldo disponível quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      checkBalance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, packageId, quantity])

  const checkBalance = async () => {
    setIsChecking(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/payments/bonus-payment?packageId=${packageId}&quantity=${quantity}&minerId=${minerId}`
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
      const response = await fetch('/api/payments/bonus-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          quantity,
          minerId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      if (result.success) {
        toast.success('Pagamento realizado com sucesso!')
        
        // Mostrar informações adicionais
        if (result.data.addedToClube300) {
          toast.success(
            `Você foi adicionado ao Clube dos 300! Membro #${result.data.clube300MemberNumber}`,
            { duration: 5000 }
          )
        }

        if (result.data.upgradedPackages.length > 0) {
          toast.success(
            `Upgrade automático aplicado! ${result.data.upgradedPackages.length} pacote(s) de upgrade criado(s)`,
            { duration: 5000 }
          )
        }

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

  const totalAmount = packagePrice * quantity

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Pagamento com Saldo de Bônus
          </DialogTitle>
          <DialogDescription>
            Confirme os detalhes do pagamento usando seu saldo de bônus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Pacote */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <PackageIcon className="w-4 h-4" />
              <span className="font-medium">Detalhes da Compra</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pacote:</span>
                <span className="font-semibold">{packageName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quantidade:</span>
                <Badge variant="outline">{quantity}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor Unitário:</span>
                <span className="font-medium">{formatCurrency(packagePrice)}</span>
              </div>
              
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status do Saldo */}
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

              {/* Alertas */}
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

          {/* Erro */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso */}
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

export default BonusPaymentModal


'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, Gift, User, Package, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import BlockedAccessModal from '@/components/modals/BlockedAccessModal'
import FinancialPasswordModal from '@/components/FinancialPasswordModal'

interface VoucherInfo {
  voucher: {
    id: string
    code: string
    amount: number
    quantity: number
    description: string | null
    status: string
    expiresAt: string
    isValid: boolean
    validationError?: string
  }
  beneficiary: {
    id: string
    name: string
    email: string
  }
  package: {
    id: string
    name: string
    description: string | null
    price: number
    points: number
  }
}

interface PaymentConfirmation {
  amount: number
  quantity: number
  packageName: string
  beneficiary: string
  availableBonus: number
  remainingBonus: number
}

const PayVoucherCard: React.FC = () => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [voucherInfo, setVoucherInfo] = useState<VoucherInfo | null>(null)
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showBlacklistModal, setShowBlacklistModal] = useState(false)
  const [blacklistModalReason, setBlacklistModalReason] = useState('')
  const [isFinancialPasswordModalOpen, setIsFinancialPasswordModalOpen] = useState(false)

  const handleSearch = async () => {
    if (!code || code.length < 10) {
      setError('Digite um código válido')
      return
    }

    try {
      setSearching(true)
      setError(null)
      setVoucherInfo(null)
      setConfirmation(null)

      // Verificar se o usuário está na blacklist para pagamento com crédito minerador
      const blacklistRes = await fetch(
        '/api/auth/me/blacklist/check?resource=pay_package_miner_credit&action=pay'
      )
      const blacklistData = await blacklistRes.json()
      if (blacklistRes.ok && blacklistData.success && blacklistData.data?.blocked) {
        setBlacklistModalReason(
          blacklistData.data.reason ??
            'Você não está autorizado a usar crédito minerador para pacotes.'
        )
        setShowBlacklistModal(true)
        setSearching(false)
        return
      }

      const response = await fetch(`/api/vouchers/${code.toUpperCase()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Voucher não encontrado')
      }

      setVoucherInfo(data)

      if (!data.voucher.isValid) {
        setError(data.voucher.validationError || 'Voucher inválido')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const handlePayment = async (confirm: boolean = false) => {
    if (!voucherInfo) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/vouchers/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherInfo.voucher.code,
          confirmPayment: confirm
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento')
      }

      if (data.needConfirmation) {
        setConfirmation(data.payment)
      } else {
        setSuccess(true)
        setVoucherInfo(null)
        setConfirmation(null)
        setCode('')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCode('')
    setVoucherInfo(null)
    setConfirmation(null)
    setError(null)
    setSuccess(false)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <BlockedAccessModal
        isOpen={showBlacklistModal}
        onClose={() => setShowBlacklistModal(false)}
        reason={blacklistModalReason}
      />
      <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-purple-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-6 w-6" />
          Crédito Minerador
        </CardTitle>
        <CardDescription className="text-orange-100">
          Ajude outro minerador pagando seu pacote com seu saldo de bônus
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {success ? (
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-600 mb-2">
                Pagamento Realizado com Sucesso!
              </h3>
              <p className="text-gray-600">
                O pacote foi ativado para o beneficiário.
              </p>
            </div>
            <Button onClick={handleReset} className="bg-purple-600 hover:bg-purple-700">
              Pagar Outro Voucher
            </Button>
          </div>
        ) : (
          <>
            {/* Campo de busca */}
            {!voucherInfo && !confirmation && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="voucherCode" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Código do Voucher
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="voucherCode"
                      type="text"
                      placeholder="MINER-XXXX-YYYY"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="font-mono"
                      maxLength={16}
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={searching || !code}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Digite o código recebido do beneficiário
                  </p>
                </div>
              </div>
            )}

            {/* Informações do voucher */}
            {voucherInfo && !confirmation && (
              <div className="space-y-4">
                {voucherInfo.voucher.isValid ? (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      ✅ Voucher válido e disponível para pagamento
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {voucherInfo.voucher.validationError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Beneficiário</p>
                      <p className="font-semibold">{voucherInfo.beneficiary.name}</p>
                      <p className="text-xs text-gray-500">{voucherInfo.beneficiary.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Pacote</p>
                      <p className="font-semibold">{voucherInfo.package.name}</p>
                      <p className="text-xs text-gray-500">
                        Quantidade: {voucherInfo.voucher.quantity} | {voucherInfo.package.points} pontos cada
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="font-bold text-green-600 text-2xl">
                        {formatCurrency(voucherInfo.voucher.amount)}
                      </p>
                      {voucherInfo.voucher.quantity > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {voucherInfo.voucher.quantity}x {formatCurrency(voucherInfo.package.price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Válido até</p>
                      <p className="font-semibold">
                        {formatDate(voucherInfo.voucher.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePayment(false)}
                    disabled={loading || !voucherInfo.voucher.isValid}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Continuar Pagamento'
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Confirmação de pagamento */}
            {confirmation && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    ℹ️ Confirme os detalhes do pagamento antes de prosseguir
                  </AlertDescription>
                </Alert>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor a pagar:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(confirmation.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Seu saldo disponível:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(confirmation.availableBonus)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-gray-600">Saldo após pagamento:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(confirmation.remainingBonus)}
                    </span>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Beneficiário:</strong> {confirmation.beneficiary}
                  </p>
                  <p className="text-sm text-purple-800">
                    <strong>Pacote:</strong> {confirmation.packageName}
                  </p>
                  {confirmation.quantity > 1 && (
                    <p className="text-sm text-purple-800">
                      <strong>Quantidade:</strong> {confirmation.quantity}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsFinancialPasswordModalOpen(true)}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} disabled={loading}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Mensagens de erro */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
      <FinancialPasswordModal
        isOpen={isFinancialPasswordModalOpen}
        mode="verify"
        onClose={() => setIsFinancialPasswordModalOpen(false)}
        onSuccess={() => {
          setIsFinancialPasswordModalOpen(false)
          void handlePayment(true)
        }}
      />
    </>
  )
}

export default PayVoucherCard


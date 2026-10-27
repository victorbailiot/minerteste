'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Check, Loader2, Gift, Clock, DollarSign } from 'lucide-react'

interface GenerateVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  packageId: number
  packageName: string
  packagePrice: number
  quantity: number
  minerId: number
}

interface VoucherData {
  code: string
  amount: number
  expiresAt: string
  createdAt: string
}

const GenerateVoucherModal: React.FC<GenerateVoucherModalProps> = ({
  isOpen,
  onClose,
  packageId,
  packageName,
  packagePrice,
  quantity,
  minerId
}) => {
  const [loading, setLoading] = useState(false)
  const [voucher, setVoucher] = useState<VoucherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [validityHours, setValidityHours] = useState(2)

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/vouchers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          minerId,
          quantity,
          validityHours
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar voucher')
      }

      setVoucher(data.voucher)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!voucher) return

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(voucher.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea')
        textArea.value = voucher.code
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Erro ao copiar:', err)
      alert('Não foi possível copiar automaticamente. Por favor, copie manualmente: ' + voucher.code)
    }
  }

  const handleShare = async () => {
    if (!voucher) return

    const message = `🎁 Crédito Minerador - MinerStone\n\n` +
      `Código: ${voucher.code}\n` +
      `Pacote: ${packageName}\n` +
      `Quantidade: ${quantity}\n` +
      `Valor Total: R$ ${(packagePrice * quantity).toFixed(2)}\n\n` +
      `Use este código para pagar com seu saldo de bônus e ajudar outro minerador!`

    try {
      if (navigator?.share) {
        await navigator.share({
          title: 'Voucher de Crédito Minerador',
          text: message
        })
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
        alert('Mensagem copiada para a área de transferência!')
      } else {
        // Fallback
        const textArea = document.createElement('textarea')
        textArea.value = message
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Mensagem copiada para a área de transferência!')
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
      alert('Código do voucher: ' + voucher.code)
    }
  }

  const handleClose = () => {
    setVoucher(null)
    setError(null)
    setCopied(false)
    onClose()
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-orange-600" />
            Crédito Minerador
          </DialogTitle>
          <DialogDescription>
            Gere um código para que outro minerador pague este pacote por você usando saldo de bônus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!voucher ? (
            <>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pacote:</span>
                  <span className="font-semibold">{packageName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantidade:</span>
                  <span className="font-semibold">{quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor Unitário:</span>
                  <span className="font-semibold text-green-600">
                    R$ {packagePrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <span className="text-sm font-semibold text-gray-700">Total:</span>
                  <span className="font-bold text-green-600 text-lg">
                    R$ {(packagePrice * quantity).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="validity" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Validade do código (horas)
                </Label>
                <Input
                  id="validity"
                  type="number"
                  min={1}
                  max={168}
                  value={validityHours}
                  onChange={(e) => setValidityHours(Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sugestão: 48 horas (2 dias)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {error && error.toLowerCase().includes('voucher pendente') && (
                <div className="-mt-2 text-center">
                  <a
                    href="/dashboard/credito-minerador#historico"
                    className="inline-block text-sm text-purple-700 hover:text-purple-800 underline"
                  >
                    Ver vouchers pendentes
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Gerar Código
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ✅ Voucher gerado com sucesso! Compartilhe o código abaixo.
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-6 rounded-lg space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Código do Voucher</p>
                  <div className="bg-white p-4 rounded-lg border-2 border-purple-300">
                    <p className="text-2xl font-mono font-bold text-purple-600 tracking-wider">
                      {voucher.code}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-semibold text-green-600">
                      R$ {voucher.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Válido até:</span>
                    <span className="font-semibold">
                      {formatDate(voucher.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Código
                    </>
                  )}
                </Button>
              </div>

              <Button
                onClick={handleClose}
                variant="ghost"
                className="w-full"
              >
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateVoucherModal


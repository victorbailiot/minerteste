'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Receipt, 
  Download, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// ===== TIPOS =====

interface BoletoData {
  boletoUrl: string
  boletoBarcode: string
  dueDate: string
  amount: number
  currency: string
}

interface BoletoPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId?: string) => void
  title: string
  description: string
  amount: number
  currency: string
  packageId: string
  packageName: string
  customerData: {
    email: string
    name: string
    phone?: string
    cpf?: string
    address?: string
    city?: string
    state?: string
    postalCode?: string
  }
}

// ===== COMPONENTE PRINCIPAL =====

export default function BoletoPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  amount,
  currency,
  packageId,
  packageName,
  customerData
}: BoletoPaymentModalProps) {
  const [boletoData, setBoletoData] = useState<BoletoData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resetar estado quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setBoletoData(null)
      setError(null)
      setIsLoading(false)
      setIsGenerating(false)
    }
  }, [isOpen])

  // Gerar boleto
  const generateBoleto = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          currency: 'brl', // Boleto só funciona com BRL
          paymentMethod: 'boleto',
          customerData,
          metadata: {
            tipo_compra: 'boleto',
            pacote_nome: packageName
          }
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar boleto')
      }

      // Para boleto, usar stripe.confirmBoletoPayment
      if (result.data.clientSecret) {
        console.log('📄 Payment Intent criado, aguardando confirmação...')
        
        // Carregar Stripe.js
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        
        if (!stripe) {
          throw new Error('Stripe não carregado')
        }

        // Confirmar pagamento com boleto
        const confirmResult = await stripe.confirmBoletoPayment(
          result.data.clientSecret,
          {
            payment_method: {
              boleto: {
                tax_id: customerData.cpf || '000.000.000-00', // CPF do cliente
              },
              billing_details: {
                name: customerData.name,
                email: customerData.email,
                address: {
                  line1: customerData.address || 'Endereço não informado',
                  city: customerData.city || 'Cidade não informada',
                  state: customerData.state || 'SP',
                  postal_code: customerData.postalCode || '00000-000',
                  country: 'BR',
                },
              },
            },
          }
        )

        if (confirmResult.error) {
          throw new Error(confirmResult.error.message)
        }

        // Se chegou aqui, o boleto foi gerado com sucesso
        toast.success('Boleto gerado com sucesso! Verifique seu email.')
        
        // Fechar modal
        onClose()
        
      } else {
        throw new Error('Client Secret não recebido')
      }

    } catch (error) {
      console.error('Erro ao gerar boleto:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      toast.error('Erro ao gerar boleto')
    } finally {
      setIsGenerating(false)
    }
  }

  // Copiar código de barras
  const copyBarcode = async () => {
    if (!boletoData?.boletoBarcode) return

    try {
      await navigator.clipboard.writeText(boletoData.boletoBarcode)
      toast.success('Código de barras copiado!')
    } catch (error) {
      toast.error('Erro ao copiar código de barras')
    }
  }

  // Baixar boleto
  const downloadBoleto = () => {
    if (!boletoData?.boletoUrl) return

    const link = document.createElement('a')
    link.href = boletoData.boletoUrl
    link.download = `boleto-${packageName}.pdf`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Abrir boleto em nova aba
  const openBoleto = () => {
    if (!boletoData?.boletoUrl) return
    window.open(boletoData.boletoUrl, '_blank')
  }

  // Formatar moeda
  const formatCurrency = (amount: number, currencyCode: string) => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    })
    return formatter.format(amount)
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pacote:</span>
                <span className="font-semibold">{packageName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Método:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Receipt className="w-3 h-3" />
                  Boleto Bancário
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Como pagar o boleto:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Baixe ou imprima o boleto</li>
                  <li>Pague em qualquer banco, lotérica ou internet banking</li>
                  <li>O pagamento pode levar até 3 dias úteis para ser confirmado</li>
                  <li>Após o pagamento, seu plano será ativado automaticamente</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Gerar Boleto */}
          {!boletoData && (
            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={generateBoleto}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gerando Boleto...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-2" />
                      Gerar Boleto Bancário
                    </>
                  )}
                </Button>
                
                {error && (
                  <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dados do Boleto */}
          {boletoData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Boleto Gerado com Sucesso!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações do Boleto */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-bold">
                      {formatCurrency(boletoData.amount, boletoData.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vencimento:</span>
                    <span className="font-medium">
                      {formatDate(boletoData.dueDate)}
                    </span>
                  </div>
                </div>

                {/* Código de Barras */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Código de Barras:
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                      {boletoData.boletoBarcode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyBarcode}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={downloadBoleto}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Boleto
                  </Button>
                  
                  <Button
                    onClick={openBoleto}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Boleto
                  </Button>
                </div>

                {/* Aviso de Vencimento */}
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> O boleto vence em{' '}
                    {formatDate(boletoData.dueDate)}. Após o pagamento, 
                    pode levar até 3 dias úteis para a confirmação.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Botões de Fechamento */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fechar
            </Button>
            
            {/* Botão de Entendi, Fechar *
            {boletoData && (
              <Button
                onClick={() => onSuccess()}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Entendi, Fechar
              </Button>
            )}*/}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, Copy, CreditCard, Loader2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../ui/modal'
import { Button } from '../ui/button'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface PixData {
  transactionId: number
  correlationID: string
  pixBrCode: string
  qrCodeImage: string
  amount: number
  expiresAt: string
}

interface PixActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  reactivationAmount?: number
}

type ModalState = 'initial' | 'generating' | 'showing_pix' | 'checking_payment' | 'paid'

export default function PixActivationModal({ isOpen, onClose, onSuccess, reactivationAmount = 100 }: PixActivationModalProps) {
  const [state, setState] = useState<ModalState>('initial')
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Limpar dados quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      setState('initial')
      setPixData(null)
      setTimeRemaining(0)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isOpen])

  // Timer para expiração do PIX
  useEffect(() => {
    if (pixData && state === 'showing_pix') {
      const expiresAt = new Date(pixData.expiresAt).getTime()
      
      const timer = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          clearInterval(timer)
          setState('initial')
          setPixData(null)
          toast.error('PIX expirado. Gere um novo código.')
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [pixData, state])

  const generatePix = async () => {
    setState('generating')
    
    try {
      const response = await fetch('/api/activation/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setPixData(result.data)
        setState('showing_pix')
        console.log('result.data:', result.data)
        startPaymentPolling(result.data.correlationID)
        toast.success('PIX gerado com sucesso!')
      } else {
        throw new Error(result.error || 'Erro ao gerar PIX')
      }
    } catch (error) {
      console.error('Erro ao gerar PIX:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar PIX')
      setState('initial')
    }
  }

  const startPaymentPolling = useCallback((correlationID: string) => {
    setState('checking_payment')
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/activation/check-payment?correlationID=${correlationID}`)
        const result = await response.json()
        
        if (result.success && result.data.paid) {
          clearInterval(interval)
          pollingIntervalRef.current = null
          setState('paid')
          toast.success('Pagamento confirmado! Ativação realizada com sucesso.')
          
          // Aguardar um pouco antes de fechar e recarregar
          setTimeout(() => {
            onSuccess()
            onClose()
          }, 2000)
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error)
      }
    }, 5000) // Verificar a cada 5 segundos
    
    pollingIntervalRef.current = interval
  }, [onSuccess, onClose])

  const copyPixCode = async () => {
    if (!pixData) return
    
    try {
      await navigator.clipboard.writeText(pixData.pixBrCode)
      toast.success('Chave PIX copiada!')
    } catch (error) {
      console.error('Erro ao copiar:', error)
      toast.error('Erro ao copiar chave PIX')
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }



  const handleClose = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Ativação via PIX"
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* Estado Inicial */}
        {state === 'initial' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Ativação Mensal</h3>
              <p className="text-gray-600 mb-4">
                Gere uma chave PIX de {formatCurrency(reactivationAmount)} para ativar sua conta por 30 dias.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Após gerar o PIX, você terá 24 horas para realizar o pagamento.
                </p>
              </div>
            </div>
            <Button 
              onClick={generatePix}
              className="w-full"
              size="lg"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Gerar Chave PIX
            </Button>
          </div>
        )}

        {/* Estado Gerando */}
        {state === 'generating' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Gerando PIX...</h3>
              <p className="text-gray-600">
                Aguarde enquanto criamos sua chave PIX personalizada.
              </p>
            </div>
          </div>
        )}

        {/* Estado Mostrando PIX */}
        {(state === 'showing_pix' || state === 'checking_payment') && pixData && (
          <div className="space-y-4">
            {/* Header com status */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {state === 'checking_payment' && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                <h3 className="text-lg font-semibold">
                  {state === 'checking_payment' ? 'Aguardando Pagamento...' : 'PIX Gerado'}
                </h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(pixData.amount)}
              </p>
              {timeRemaining > 0 && (
                <p className="text-sm text-gray-600">
                  Expira em: <span className="font-mono text-red-600">{formatTime(timeRemaining)}</span>
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <Image 
                  src={pixData.qrCodeImage} 
                  alt="QR Code PIX" 
                  width={192}
                  height={192}
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Chave PIX */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Chave PIX (Copia e Cola):
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={pixData.pixBrCode}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <Button
                  onClick={copyPixCode}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Como pagar:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Escaneie o QR Code com seu banco</li>
                <li>2. Ou copie e cole a chave PIX no seu aplicativo</li>
                <li>3. Confirme o pagamento de {formatCurrency(pixData.amount)}</li>
                <li>4. Aguarde a confirmação (pode levar alguns minutos)</li>
              </ol>
            </div>

            {state === 'checking_payment' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                  <p className="text-sm text-yellow-800">
                    Verificando pagamento automaticamente...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado Pago */}
        {state === 'paid' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Pagamento Confirmado!
              </h3>
              <p className="text-gray-600">
                Sua ativação foi processada com sucesso. Você está ativo por mais 30 dias.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ A página será atualizada automaticamente em alguns segundos.
              </p>
            </div>
          </div>
        )}

        
      </div>
    </Modal>
  )
} 
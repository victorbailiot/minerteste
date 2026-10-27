'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, Copy, Loader2, XCircle, QrCode, CreditCard, Clock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import CpfPhoneModal from './CpfPhoneModal'

interface PixPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  description: string
  amount: number
  items?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  apiEndpoint: string
  requestBody: any
}

export default function PixPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  amount,
  items = [],
  apiEndpoint,
  requestBody
}: PixPaymentModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [pixLoading, setPixLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [pixData, setPixData] = useState<{
    qrCodeImage?: string
    pixCopiaCola?: string
    correlationID?: string
    pixKey?: string
    expiresAt?: string
  } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'COMPLETED' | 'failed'>('pending')
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showCpfPhoneModal, setShowCpfPhoneModal] = useState(false)
  const [userCpf, setUserCpf] = useState<string>('')
  const [userPhone, setUserPhone] = useState<string>('')

  // Função para detectar URLs externas e usar proxy quando necessário
  const isExternalUrl = (url?: string | null) => !!url && /^https?:\/\//i.test(url)
  
  const toProxiedUrl = (url?: string | null) => {
    if (!url) return url ?? undefined
    return isExternalUrl(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url
  }

  // Função para traduzir status de pagamento
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'PENDENTE',
      'PENDING': 'PENDENTE',
      'processing': 'PROCESSANDO',
      'PROCESSING': 'PROCESSANDO',
      'completed': 'CONCLUÍDO',
      'COMPLETED': 'CONCLUÍDO',
      'failed': 'FALHOU',
      'FAILED': 'FALHOU',
      'cancelled': 'CANCELADO',
      'CANCELLED': 'CANCELADO',
      'rejected': 'REJEITADO',
      'REJECTED': 'REJEITADO'
    }
    return statusMap[status] || status
  }

  // Limpar dados quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      setPixLoading(false)
      setDebugInfo('')
      setPixData(null)
      setPaymentStatus('pending')
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current)
        statusCheckIntervalRef.current = null
      }
    }
  }, [isOpen])

  // Limpar intervalo quando componente for desmontado
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current)
      }
    }
  }, [])

  // Validar CPF
  const isValidCpf = (cpf: string): boolean => {
    if (!cpf) return false
    const numbers = cpf.replace(/\D/g, '')
    return numbers.length === 11 && !/^(\d)\1{10}$/.test(numbers)
  }

  // Validar telefone para padrão Pagar.me (DDD + número com 10 ou 11 dígitos)
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return false
    const numbers = phone.replace(/\D/g, '')
    // Deve ter 10 ou 11 dígitos (DDD + número)
    return numbers.length >= 10 && numbers.length <= 11
  }

  // Verificar se usuário tem CPF e telefone válidos
  const checkUserData = (): boolean => {
    const hasCpf = isValidCpf(user?.cpf || user?.documentNumber || '')
    const hasPhone = isValidPhone(user?.phone || '')
    
    return hasCpf && hasPhone
  }

  // Handler para iniciar processo de pagamento
  const handleGeneratePix = () => {
    if (!checkUserData()) {
      // Abrir modal para coletar dados
      setUserCpf(user?.cpf || user?.documentNumber || '')
      setUserPhone(user?.phone || '')
      setShowCpfPhoneModal(true)
    } else {
      // Dados válidos, prosseguir com pagamento
      generatePixPayment(user?.cpf || user?.documentNumber || '', user?.phone || '')
    }
  }

  // Handler para quando usuário enviar dados do modal
  const handleCpfPhoneSubmit = (data: { cpf: string; phone: string }) => {
    setUserCpf(data.cpf)
    setUserPhone(data.phone)
    setShowCpfPhoneModal(false)
    // Gerar PIX com os novos dados
    generatePixPayment(data.cpf, data.phone)
  }

  const generatePixPayment = async (cpf: string, phone: string) => {
    setPixLoading(true)
    setPixData(null)
    setPaymentStatus('pending')
    console.log('Gerando PIX:', title)

    setDebugInfo('Criando cobrança PIX...')

    try {
      // Preparar dados para a API da PagarMe
      const pagarmeRequestBody = {
        valor: amount,
        descricao: description,
        expiracaoSegundos: requestBody.expiracaoSegundos || 3600, // 1 hora
        quantity: requestBody.quantity || 1,
        packageId: requestBody.packageId,
        informacoesAdicionais: requestBody.informacoesAdicionais || [],
        // Enviar CPF e telefone
        cpf: cpf,
        phone: phone
      }

      console.log('Dados para PagarMe:', pagarmeRequestBody)

      // Usar a API da PagarMe para criar PIX
      const response = await fetch('/api/pagarme/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pagarmeRequestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cobrança PIX via PagarMe')
      }

      if (data.success && data.data) {
        console.log('Cobrança PIX via PagarMe criada com sucesso:', data.data)
        setDebugInfo('✅ QR Code PIX gerado via PagarMe!')
        
        setPixData({
          qrCodeImage: data.data.qrCodeImage,
          pixCopiaCola: data.data.pixCopiaCola,
          correlationID: data.data.correlationID,
          pixKey: data.data.pixKey || undefined,
          expiresAt: data.data.expiresAt
        })

        // Iniciar verificação do status do pagamento
        startPaymentStatusCheck(data.data.correlationID)
      } else {
        throw new Error('Dados inválidos retornados pela API da PagarMe')
      }
    } catch (error) {
      console.error('Erro ao criar cobrança PIX:', error)
      setDebugInfo(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      toast.error('Erro ao gerar PIX', {
        description: 'Tente novamente ou entre em contato com o suporte.',
        icon: <XCircle className="w-5 h-5" />
      })
    } finally {
      setPixLoading(false)
    }
  }

  const startPaymentStatusCheck = useCallback((correlationID: string) => {
    console.log('Iniciando verificação de status do pagamento:', correlationID)
    
    // Limpar intervalo anterior se existir
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
    }
    
    const checkStatus = async () => {
      try {
        console.log('Verificando status da cobrança:', correlationID)
        setDebugInfo(`🔍 Verificando pagamento... (ID: ${correlationID})`)
        
        const response = await fetch(`/api/pagarme/charge?correlationID=${correlationID}`)
        const data = await response.json()

        if (response.ok && data.success && data.data) {
          setDebugInfo(`📊 Status: ${translateStatus(data.data.status)}`)
          
          if (data.data.status === 'COMPLETED') {
            console.log('Pagamento confirmado!')
            setDebugInfo('✅ Pagamento confirmado!')
            setPaymentStatus('COMPLETED')
            
            // Limpar intervalo
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current)
              statusCheckIntervalRef.current = null
            }
            
            toast.success('Pagamento confirmado!', {
              description: 'Sua compra foi processada com sucesso. Redirecionando...',
              icon: <CheckCircle className="w-5 h-5" />
            })
            
            // Aguardar um pouco antes de redirecionar
            setTimeout(() => {
              onSuccess()
              onClose()
              router.push('/dashboard')
            }, 2000)
            
            return
          } else if (data.data.status === 'pending' || data.data.status === 'processing') {
            // Continuar verificando se ainda está pendente
            setDebugInfo(`⏳ Aguardando confirmação... (Status: ${translateStatus(data.data.status)})`)
          } else {
            setDebugInfo(`❌ Pagamento não confirmado (Status: ${translateStatus(data.data.status)})`)
            setPaymentStatus('failed')
            
            // Limpar intervalo
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current)
              statusCheckIntervalRef.current = null
            }
            return
          }
        } else {
          setDebugInfo(`❌ Erro na consulta: ${data.error || 'Cobrança não encontrada'}`)
        }
      } catch (error) {
        setDebugInfo(`❌ Erro na verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    // Executar verificação imediatamente
    checkStatus()
    
    // Configurar verificação a cada 10 segundos
    const interval = setInterval(checkStatus, 10000)
    statusCheckIntervalRef.current = interval
  }, [onSuccess, onClose, router])

  const copyPixCode = () => {
    if (pixData?.pixCopiaCola) {
      navigator.clipboard.writeText(pixData.pixCopiaCola)
      toast.success('Código PIX copiado!', {
        description: 'Código PIX copiado para a área de transferência.',
        icon: <CheckCircle className="w-5 h-5" />
      })
    }
  }

  const copyPixKey = () => {
    if (pixData?.pixKey) {
      navigator.clipboard.writeText(pixData.pixKey)
      toast.success('Chave PIX copiada!', {
        description: 'Chave PIX copiada para a área de transferência.',
        icon: <CheckCircle className="w-5 h-5" />
      })
    }
  }

  const handleCloseModal = () => {
    // Limpar intervalo se existir
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
      statusCheckIntervalRef.current = null
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Modal CPF/Phone */}
      <CpfPhoneModal
        isOpen={showCpfPhoneModal}
        onClose={() => setShowCpfPhoneModal(false)}
        onSubmit={handleCpfPhoneSubmit}
        initialCpf={userCpf}
        initialPhone={userPhone}
      />

      {/* Modal PIX */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden">
          {/* Header Compacto */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 relative flex-shrink-0">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white/80 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <XCircle className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3 pr-8">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{title}</h3>
                <p className="text-xs sm:text-sm text-blue-100">Valor: R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Coluna Esquerda - Resumo */}
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    Resumo da Compra
                  </h4>
                  
                  {items.length > 0 ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start py-1.5 border-b border-gray-200 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-800 truncate">{item.name}</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">
                              Qtd: {item.quantity} × R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-green-600 ml-2">
                            R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-between items-center pt-2 mt-1.5 sm:mt-2 border-t-2 border-gray-300">
                        <span className="text-xs sm:text-sm font-bold text-gray-800">Total</span>
                        <span className="text-base sm:text-lg font-bold text-green-600">
                          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 sm:py-3">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1">Valor Total</div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status e Debug - Compacto */}
                {paymentStatus === 'COMPLETED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Pagamento confirmado!</span>
                    </div>
                  </div>
                )}

                {debugInfo && paymentStatus !== 'COMPLETED' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="text-[10px] sm:text-xs text-gray-600 font-mono break-all">{debugInfo}</div>
                  </div>
                )}
              </div>

              {/* Coluna Direita - PIX */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                  Pagamento PIX
                </h4>

                {pixLoading && (
                  <div className="text-center py-4 sm:py-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Gerando PIX...</p>
                  </div>
                )}
                
                {!pixLoading && !pixData && (
                  <div className="text-center py-4 sm:py-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-gray-200 rounded-full flex items-center justify-center">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Gere o código PIX para pagar</p>
                    <button
                      onClick={handleGeneratePix}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                      Gerar PIX
                    </button>
                  </div>
                )}

                {pixData && (
                  <div className="space-y-2 sm:space-y-3">
                    {/* QR Code Compacto */}
                    {pixData.qrCodeImage && (
                      <div className="flex justify-center">
                        <div className="bg-white p-1.5 sm:p-2 rounded-lg shadow-md border border-gray-200">
                          <Image 
                            src={toProxiedUrl(pixData.qrCodeImage)!} 
                            alt="QR Code PIX" 
                            width={120}
                            height={120}
                            className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[10px] sm:text-xs text-center text-gray-600">Escaneie o QR Code ou use o código</p>
                    
                    {/* Botão Copiar PIX - Destaque */}
                    {pixData.pixCopiaCola && (
                      <button
                        onClick={copyPixCode}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Copiar Código PIX
                      </button>
                    )}

                    {/* Info Compacta */}
                    <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                      {pixData.correlationID && (
                        <div className="bg-white border border-gray-200 rounded p-1.5 sm:p-2">
                          <div className="text-gray-500 mb-0.5">ID da Transação</div>
                          <div className="text-gray-700 font-mono truncate">{pixData.correlationID}</div>
                        </div>
                      )}

                      {pixData.expiresAt && (
                        <div className="bg-white border border-gray-200 rounded p-1.5 sm:p-2">
                          <div className="text-gray-500 mb-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Expira em
                          </div>
                          <div className="text-gray-700">
                            {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Footer Compacto */}
          <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
              <span>Pagamento seguro via PIX</span>
            </div>
            
            <button
              onClick={handleCloseModal}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 
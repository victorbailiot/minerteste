'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, Copy, Loader2, XCircle, QrCode, CreditCard, Clock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'
import CpfPhoneModal from '../CpfPhoneModal'

interface PixPaymentModalLojaProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orderId: string
  orderNumber: string
  total: number
  shipping?: number
  items?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  user?: {
    id?: string
    name?: string
    email?: string
    cpf?: string
    documentNumber?: string
    phone?: string
  }
}

export default function PixPaymentModalLoja({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  orderNumber,
  total,
  shipping = 0,
  items = [],
  user
}: PixPaymentModalLojaProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
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
    return numbers.length >= 10 && numbers.length <= 11
  }

  // Verificar se usuário tem CPF e telefone válidos
  const checkUserData = (): boolean => {
    const finalUser = user || authUser
    const hasCpf = isValidCpf(finalUser?.cpf || finalUser?.documentNumber || '')
    const hasPhone = isValidPhone(finalUser?.phone || '')
    
    return hasCpf && hasPhone
  }

  // Handler para iniciar processo de pagamento
  const handleGeneratePix = () => {
    if (!checkUserData()) {
      const finalUser = user || authUser
      setUserCpf(finalUser?.cpf || finalUser?.documentNumber || '')
      setUserPhone(finalUser?.phone || '')
      setShowCpfPhoneModal(true)
    } else {
      const finalUser = user || authUser
      generatePixPayment(finalUser?.cpf || finalUser?.documentNumber || '', finalUser?.phone || '')
    }
  }

  // Handler para quando usuário enviar dados do modal
  const handleCpfPhoneSubmit = (data: { cpf: string; phone: string }) => {
    setUserCpf(data.cpf)
    setUserPhone(data.phone)
    setShowCpfPhoneModal(false)
    generatePixPayment(data.cpf, data.phone)
  }

  const generatePixPayment = async (cpf: string, phone: string) => {
    setPixLoading(true)
    setPixData(null)
    setPaymentStatus('pending')
    console.log('Gerando PIX para pedido:', orderNumber)

    setDebugInfo('Criando cobrança PIX...')

    try {
      const finalUser = user || authUser
      
      // Converter total para número (pode vir como string do banco)
      const totalValue = typeof total === 'string' ? parseFloat(total) : Number(total)
      
      if (isNaN(totalValue) || totalValue <= 0) {
        throw new Error('Valor total inválido')
      }
      
      // Preparar dados para a API da PagarMe
      // A API espera informacoesAdicionais como array, não metadata como objeto
      const pagarmeRequestBody = {
        valor: totalValue,
        descricao: `Pedido #${orderNumber} - Loja TectonMiner`,
        expiracaoSegundos: 3600, // 1 hora
        cpf: cpf,
        phone: phone,
        // Informações adicionais no formato esperado pela API
        informacoesAdicionais: [
          {
            chave: 'tipo_compra',
            valor: 'loja'
          },
          {
            chave: 'order_id',
            valor: orderId
          },
          {
            chave: 'order_number',
            valor: orderNumber
          },
          {
            chave: 'user_id',
            valor: finalUser?.id?.toString() || ''
          }
        ]
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
    console.log('🔄 Iniciando verificação de status do pagamento no banco:', correlationID)
    
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
    }
    
    const checkStatus = async () => {
      try {
        console.log('🔍 Verificando status da transação no banco:', correlationID)
        setDebugInfo(`🔍 Verificando pagamento no banco... (ID: ${correlationID})`)
        
        // Buscar status da transação diretamente no banco de dados
        const response = await fetch(`/api/pagarme/charge?correlationID=${correlationID}`)
        const data = await response.json()

        if (response.ok && data.success && data.data) {
          const transactionStatus = data.data.status // Status do banco de dados
          console.log('📊 Status da transação no banco:', transactionStatus)
          setDebugInfo(`📊 Status no banco: ${translateStatus(transactionStatus)}`)
          
          // Verificar se o status é COMPLETED (atualizado pelo webhook)
          if (transactionStatus === 'COMPLETED') {
            console.log('✅ Pagamento confirmado no banco! Webhook processou o pagamento.')
            setDebugInfo('✅ Pagamento confirmado!')
            setPaymentStatus('COMPLETED')
            
            // Parar a verificação
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current)
              statusCheckIntervalRef.current = null
            }
            
            toast.success('Pagamento confirmado!', {
              description: 'Seu pedido foi processado com sucesso. Redirecionando...',
              icon: <CheckCircle className="w-5 h-5" />
            })
            
            // Aguardar um pouco antes de redirecionar para garantir que o usuário veja a mensagem
            setTimeout(() => {
              onSuccess()
              onClose()
              router.push('/dashboard/pedidos')
            }, 2000)
            
            return
          } else if (transactionStatus === 'PENDING' || transactionStatus === 'pending') {
            // Ainda aguardando pagamento
            setDebugInfo(`⏳ Aguardando confirmação do pagamento... (Status: ${translateStatus(transactionStatus)})`)
            console.log('⏳ Transação ainda pendente, continuando verificação...')
          } else if (transactionStatus === 'REJECTED' || transactionStatus === 'rejected' || transactionStatus === 'FAILED' || transactionStatus === 'failed') {
            // Pagamento rejeitado ou falhou
            setDebugInfo(`❌ Pagamento não confirmado (Status: ${translateStatus(transactionStatus)})`)
            setPaymentStatus('failed')
            console.log('❌ Pagamento rejeitado ou falhou')
            
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current)
              statusCheckIntervalRef.current = null
            }
            return
          } else {
            // Outros status
            setDebugInfo(`⏳ Status: ${translateStatus(transactionStatus)}`)
            console.log('📊 Status da transação:', transactionStatus)
          }
        } else {
          const errorMsg = data.error || 'Cobrança não encontrada'
          console.error('❌ Erro ao consultar transação:', errorMsg)
          setDebugInfo(`❌ Erro na consulta: ${errorMsg}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('❌ Erro na verificação de status:', errorMessage)
        setDebugInfo(`❌ Erro na verificação: ${errorMessage}`)
      }
    }

    // Executar verificação imediatamente
    checkStatus()
    
    // Verificar a cada 5 segundos (mais frequente para detectar webhook mais rápido)
    const interval = setInterval(checkStatus, 5000)
    statusCheckIntervalRef.current = interval
    
    console.log('✅ Verificação de status iniciada (intervalo: 5s)')
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

  const handleCloseModal = () => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
      statusCheckIntervalRef.current = null
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <CpfPhoneModal
        isOpen={showCpfPhoneModal}
        onClose={() => setShowCpfPhoneModal(false)}
        onSubmit={handleCpfPhoneSubmit}
        initialCpf={userCpf}
        initialPhone={userPhone}
      />

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden">
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
                <h3 className="text-base sm:text-lg font-bold text-white truncate">Pedido #{orderNumber}</h3>
                <p className="text-xs sm:text-sm text-blue-100">Valor: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
                        {shipping > 0 && (
                          <div className="flex justify-between items-center py-1.5 border-b border-gray-200">
                            <span className="text-xs sm:text-sm font-medium text-gray-800">Frete</span>
                            <span className="text-xs sm:text-sm font-bold text-green-600">
                              R$ {Number(shipping).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-1.5 sm:mt-2 border-t-2 border-gray-300">
                          <span className="text-xs sm:text-sm font-bold text-gray-800">Total</span>
                          <span className="text-base sm:text-lg font-bold text-green-600">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 sm:space-y-2 py-2 sm:py-3">
                        {shipping > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-600">Frete</span>
                            <span className="text-xs sm:text-sm font-semibold text-green-600">
                              R$ {Number(shipping).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                          <span className="text-xs sm:text-sm font-bold text-gray-800">Total</span>
                          <span className="text-xl sm:text-2xl font-bold text-green-600">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {paymentStatus === 'COMPLETED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-medium">Pagamento confirmado!</span>
                      </div>
                    </div>
                  )}

                </div>

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
                      
                      {pixData.pixCopiaCola && (
                        <button
                          onClick={copyPixCode}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Copiar Código PIX
                        </button>
                      )}

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
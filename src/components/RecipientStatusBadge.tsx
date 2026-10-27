'use client'

import { useState, useEffect } from 'react'
import { translateRecipientStatus, getRecipientStatusClasses, type RecipientStatus } from '@/lib/recipientStatusTranslator'

// Hook para detectar se é mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

interface RecipientStatusBadgeProps {
  status: string
  showDescription?: boolean
  showPermissions?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showKycButton?: boolean
}

interface KycData {
  url: string
  base64_qrcode: string
  expiresAt: string
}

export default function RecipientStatusBadge({ 
  status, 
  showDescription = false, 
  showPermissions = false,
  size = 'md',
  className = '',
  showKycButton = false
}: RecipientStatusBadgeProps) {
  const statusInfo = translateRecipientStatus(status)
  const isMobile = useIsMobile()
  const [kycData, setKycData] = useState<KycData | null>(null)
  const [isGeneratingKyc, setIsGeneratingKyc] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isKycExpired, setIsKycExpired] = useState(false)
  const [kycError, setKycError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  // Função para gerar link de KYC
  const generateKycLink = async () => {
    setIsGeneratingKyc(true)
    setKycError(null)
    setErrorType(null)
    
    try {
      const response = await fetch('/api/bank-account/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setKycError(data.error || 'Erro ao gerar link de validação')
        setErrorType(data.needsActivation ? 'activation' : 
                   data.needsProcessing ? 'processing' :
                   data.needsApproval ? 'approval' :
                   data.needsDataUpdate ? 'data' : 'unknown')
        return
      }

      if (data.success) {
        console.log('****Dados KYC recebidos:', data)
        console.log('****URL:', data.url)
        console.log('****QR Code:', data.base64_qrcode ? 'Presente' : 'Ausente')
        console.log('****QR Code length:', data.qrcode?.length || 0)
        console.log('****QR Code type: SVG base64')
        
        setKycData(data)
        
        // Calcular tempo restante (4 minutos = 240 segundos)
        setTimeLeft(240)
        setIsKycExpired(false)
        setKycError(null)
        setErrorType(null)
      }
    } catch (error) {
      console.error('Erro ao gerar link KYC:', error)
      setKycError('Erro de conexão. Tente novamente.')
      setErrorType('connection')
    } finally {
      setIsGeneratingKyc(false)
    }
  }

  // Função para abrir link de KYC
  const openKycLink = () => {
    if (kycData?.url) {
      window.open(kycData.url, '_blank')
    }
  }

  // Função para copiar URL
  const copyUrl = async () => {
    if (kycData?.url) {
      try {
        await navigator.clipboard.writeText(kycData.url)
        setUrlCopied(true)
        setTimeout(() => setUrlCopied(false), 2000)
      } catch (error) {
        console.error('Erro ao copiar URL:', error)
        // Fallback para navegadores que não suportam clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = kycData.url
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setUrlCopied(true)
        setTimeout(() => setUrlCopied(false), 2000)
      }
    }
  }

  // Temporizador
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && kycData) {
      setIsKycExpired(true)
    }
  }, [timeLeft, kycData])

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }
  
  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Badge do Status */}
      <span className={`inline-flex items-center font-medium rounded-full border ${getRecipientStatusClasses(status)} ${sizeClasses[size]}`}>
        <span className={`mr-1 ${iconSizes[size]}`}>{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
      
      {/* Descrição (opcional) */}
      {showDescription && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-gray-700 text-sm">
            {statusInfo.description}
          </p>
        </div>
      )}
      
      {/* Permissões (opcional) */}
      {showPermissions && (
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            statusInfo.canTransact 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {statusInfo.canTransact ? '✅' : '❌'} 
            Transações
          </span>
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
            statusInfo.canWithdraw 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {statusInfo.canWithdraw ? '✅' : '❌'} 
            Saques
          </span>
        </div>
      )}

      {/* Botão KYC para status de afiliação */}
      {showKycButton && status === 'affiliation' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            {!kycData && !kycError ? (
              <button
                onClick={generateKycLink}
                disabled={isGeneratingKyc}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isGeneratingKyc ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Gerando...
                  </span>
                ) : (
                  'Validar Conta'
                )}
              </button>
            ) : kycError ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  errorType === 'activation' ? 'bg-yellow-50 border border-yellow-200' :
                  errorType === 'processing' ? 'bg-blue-50 border border-blue-200' :
                  errorType === 'approval' ? 'bg-orange-50 border border-orange-200' :
                  errorType === 'data' ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    errorType === 'activation' ? 'text-yellow-800' :
                    errorType === 'processing' ? 'text-blue-800' :
                    errorType === 'approval' ? 'text-orange-800' :
                    errorType === 'data' ? 'text-red-800' :
                    'text-gray-800'
                  }`}>
                    {errorType === 'activation' && '⏳ Aguardando Ativação'}
                    {errorType === 'processing' && '🔄 Processando Dados'}
                    {errorType === 'approval' && '📋 Aguardando Aprovação'}
                    {errorType === 'data' && '❌ Dados Incompletos'}
                    {errorType === 'connection' && '🌐 Erro de Conexão'}
                    {errorType === 'unknown' && '❓ Erro Desconhecido'}
                  </p>
                  <p className="text-xs mt-1 text-gray-600">
                    {kycError}
                  </p>
                </div>
                
                <button
                  onClick={generateKycLink}
                  disabled={isGeneratingKyc}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isGeneratingKyc ? 'Tentando...' : 'Tentar Novamente'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">                
                {/* QR Code */}
                {kycData?.base64_qrcode ? (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <div className="w-48 h-48 mx-auto flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`data:image/svg+xml;base64,${kycData.base64_qrcode}`} 
                          alt="QR Code para validação KYC"
                          className="max-w-full max-h-full"
                          onLoad={() => console.log('QR Code carregado com sucesso!')}
                          onError={(e) => {
                            console.error('Erro ao carregar QR Code:', e)
                            console.log('QR Code data:', kycData.base64_qrcode?.substring(0, 100) + '...')
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-200 w-48 h-48 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <div className="text-4xl mb-2">📱</div>
                        <div className="text-sm">QR Code não disponível</div>
                        <div className="text-xs mt-1">Use o botão abaixo</div>
                        <div className="text-xs mt-1 text-red-500">
                          Debug: {kycData ? 'Dados presentes' : 'Sem dados'} | 
                          QR: {kycData?.base64_qrcode ? 'Sim' : 'Não'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botões baseados no dispositivo */}
                {isMobile ? (
                  // Mobile: Botão "Iniciar Validação" abaixo do QR Code
                  <div className="space-y-3">
                    <button
                      onClick={openKycLink}
                      disabled={isKycExpired}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Iniciar Validação
                    </button>
                    
                    {timeLeft > 0 && !isKycExpired && (
                      <div className="text-sm text-gray-600 text-center">
                        <p>Link válido por:</p>
                        <p className="font-mono text-lg font-bold text-red-600">
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop: Botão para copiar URL e instruções
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium mb-2">
                        📱 Abra este link no seu celular para continuar a validação
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={copyUrl}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {urlCopied ? '✅ URL Copiada!' : '📋 Copiar Link'}
                        </button>
                        <button
                          onClick={openKycLink}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          🔗 Abrir Link
                        </button>
                      </div>
                    </div>
                    
                    {timeLeft > 0 && !isKycExpired && (
                      <div className="text-sm text-gray-600 text-center">
                        <p>Link válido por:</p>
                        <p className="font-mono text-lg font-bold text-red-600">
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {isKycExpired && (
                  <div className="text-sm text-red-600 text-center">
                    <p>Link expirado. Gere um novo link para continuar.</p>
                    <button
                      onClick={generateKycLink}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Gerar Novo Link
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Componente simplificado apenas com o badge
export function RecipientStatusBadgeSimple({ 
  status, 
  size = 'md',
  className = '',
  showKycButton = false
}: Omit<RecipientStatusBadgeProps, 'showDescription' | 'showPermissions'>) {
  return (
    <RecipientStatusBadge 
      status={status} 
      size={size} 
      className={className}
      showKycButton={showKycButton}
    />
  )
}

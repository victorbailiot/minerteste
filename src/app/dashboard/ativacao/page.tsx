'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Clock, CreditCard, Wallet, History, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react'
import { toast } from 'sonner'
import PixActivationModal from '@/components/pagamento/PixActivationModal'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'

interface ActivationData {
  isActive: boolean
  expiresAt: string | null
  daysRemaining: number
  canActivate: boolean
  totalBonusAccumulated: number
  requiredBonusForActivation: number
  availableBalance: number
  bonusConversionPercent: number
  reactivationAmount: number
}

interface ActivationHistory {
  id: number
  type: 'PIX' | 'BONUS_CONVERSION'
  amount: number
  bonusUsed?: number
  conversionPercent?: number
  activatedAt: string
  expiresAt: string
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
}

export default function ActivacaoPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  const [history, setHistory] = useState<ActivationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [autoActivation, setAutoActivation] = useState(false)
  const [autoActivationLoading, setAutoActivationLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchActivationData()
      fetchHistory()
      fetchAutoActivationStatus()
    }
  }, [isAuthenticated, user])

  const fetchActivationData = async () => {
    try {
      const response = await fetch('/api/activation/status')
      const result = await response.json()
      
      if (result.success) {
        setActivationData(result.data)
      } else {
        toast.error(result.error || 'Erro ao carregar dados de ativação')
      }
    } catch (error) {
      console.error('Erro ao carregar dados de ativação:', error)
      toast.error('Erro ao carregar dados de ativação')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/activation/history')
      const result = await response.json()
      
      if (result.success) {
        setHistory(result.data.history)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  const fetchAutoActivationStatus = async () => {
    try {
      const response = await fetch('/api/auth/auto-activation')
      const result = await response.json()
      
      if (response.ok) {
        setAutoActivation(result.autoActivation)
      }
    } catch (error) {
      console.error('Erro ao carregar status de ativação automática:', error)
    }
  }

  const handleAutoActivationToggle = async (enabled: boolean) => {
    setAutoActivationLoading(true)
    try {
      const response = await fetch('/api/auth/auto-activation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ autoActivation: enabled })
      })
      const result = await response.json()
      
      if (response.ok) {
        setAutoActivation(enabled)
        toast.success(result.message)
      } else {
        toast.error(result.error || 'Erro ao alterar ativação automática')
      }
    } catch (error) {
      console.error('Erro ao alterar ativação automática:', error)
      toast.error('Erro ao alterar ativação automática')
    } finally {
      setAutoActivationLoading(false)
    }
  }

  const handlePixActivation = () => {
    setShowPixModal(true)
  }

  const handlePixSuccess = async () => {
    // Recarregar dados quando PIX for pago
    await fetchActivationData()
    await fetchHistory()
  }

  const handleBonusConversion = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/activation/convert', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        toast.success('Ativação via conversão de bônus realizada!')
        await fetchActivationData()
        await fetchHistory()
      } else {
        toast.error(result.error || 'Erro ao converter bônus')
      }
    } catch (error) {
      console.error('Erro ao converter bônus:', error)
      toast.error('Erro ao converter bônus')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500 text-green-800'
      case 'EXPIRED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'EXPIRED':
        return <XCircle className="w-4 h-4" />
      case 'CANCELLED':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  // Se ainda está carregando a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não está autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ativação Mensal</h1>
        <Badge variant={activationData?.isActive ? 'default' : 'secondary'}>
          {activationData?.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Status atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Status da Ativação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activationData?.isActive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-lg font-semibold text-green-700">
                  Ativação Válida
                </span>
              </div>
              {activationData.expiresAt && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Expira em</p>
                  <p className="text-lg font-semibold">
                    {activationData.expiresAt ? formatDate(activationData.expiresAt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dias restantes</p>
                  <p className="text-lg font-semibold">
                    {activationData.daysRemaining} dias
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-lg font-semibold text-red-700">
                  Ativação Expirada
                </span>
              </div>
              <p className="text-gray-600">
                Você precisa realizar uma nova ativação para continuar recebendo bônus.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Ativação Automática 
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Ativação Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Renovação automática</p>
              <p className="text-sm text-gray-600">
                Quando habilitada, sua ativação será renovada automaticamente 1 dia antes do vencimento usando {activationData?.bonusConversionPercent}% do seu saldo de bônus
              </p>
            </div>
            <Switch
              checked={autoActivation}
              onCheckedChange={handleAutoActivationToggle}
              disabled={autoActivationLoading}
            />
          </div>
          
          {autoActivation && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Ativação automática habilitada
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                O sistema verificará diariamente se sua ativação precisa ser renovada
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      */}

      {/* Opções de ativação */}
      {activationData?.canActivate && (
        <div className="grid md:grid-cols-1 gap-6">
          {/* Ativação via PIX */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Ativação via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(activationData?.reactivationAmount || 100)}
                </p>
                <p className="text-sm text-gray-600">
                  Pagamento único para 30 dias
                </p>
              </div>
              <Button
                onClick={handlePixActivation}
                className="w-full"
              >
                Gerar PIX
              </Button>
            </CardContent>
          </Card>

          {/* Ativação via conversão de bônus 
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Conversão de Bônus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bônus acumulado:</span>
                  <span className="font-semibold">
                    {formatCurrency(activationData?.totalBonusAccumulated || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor para ativação ({activationData?.bonusConversionPercent}%):</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(activationData?.requiredBonusForActivation || 0)}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleBonusConversion}
                disabled={processing || (activationData?.totalBonusAccumulated || 0) <= 0}
                variant="outline"
                className="w-full"
              >
                {processing ? 'Convertendo...' : 'Converter Bônus'}
              </Button>
            </CardContent>
          </Card>
          */}
        </div>
      )}

      {/* Mensagem quando não pode ativar por falta de saldo */}
      {!activationData?.isActive && !activationData?.canActivate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Saldo Insuficiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Para realizar ativação via conversão de bônus, você precisa ter pelo menos {formatCurrency(activationData?.reactivationAmount || 100)} em {activationData?.bonusConversionPercent}% do seu saldo disponível.
              </p>
              <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Saldo disponível:</p>
                  <p className="font-semibold">
                    {formatCurrency(activationData?.availableBalance || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{activationData?.bonusConversionPercent}% do saldo:</p>
                  <p className="font-semibold">
                    {formatCurrency(activationData?.requiredBonusForActivation || 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Opções disponíveis:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Pagar via PIX por {formatCurrency(activationData?.reactivationAmount || 100)}</li>
                  <li>• Acumular mais bônus até atingir o valor mínimo</li>
                </ul>
              </div>
              {/* Botão PIX sempre disponível */}
              <Button
                onClick={handlePixActivation}
                disabled={processing}
                className="w-full"
              >
                Pagar via PIX - {formatCurrency(activationData?.reactivationAmount || 100)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de ativações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Ativações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma ativação realizada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'PIX' ? (
                      <CreditCard className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Wallet className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {item.type === 'PIX' ? 'PIX' : 'Conversão de Bônus'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(item.activatedAt)} - {formatDate(item.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(item.amount)}
                    </p>
                    <Badge className={getStatusColor(item.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal PIX */}
      <PixActivationModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        onSuccess={handlePixSuccess}
        reactivationAmount={activationData?.reactivationAmount}
      />
    </div>
  )
} 
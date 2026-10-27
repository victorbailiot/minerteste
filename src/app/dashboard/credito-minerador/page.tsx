'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PayVoucherCard from '@/components/vouchers/PayVoucherCard'
import ConfirmationModal from '@/components/modals/ConfirmationModal'
import { Gift, Wallet, History, Copy, Check, Clock, User, Users, XCircle } from 'lucide-react'

interface Voucher {
  id: string
  code: string
  amount: number
  quantity: number
  description: string | null
  status: string
  expiresAt: string
  paidAt: string | null
  createdAt: string
  isCreator: boolean
  isPayer: boolean
  isExpired: boolean
  isValid: boolean
  beneficiary: {
    id: string
    name: string
    email: string
  } | null
  payer: {
    id: string
    name: string
    email: string
  } | null
  package: {
    id: string
    name: string
    price: number
  } | null
}

interface VoucherStats {
  total: number
  pending: number
  completed: number
  expired: number
  cancelled: number
  created: number
  paid: number
}

const CreditoMineradorPage: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [stats, setStats] = useState<VoucherStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pagar')
  const [expiringCode, setExpiringCode] = useState<string | null>(null)
  const [isExpireModalOpen, setIsExpireModalOpen] = useState(false)
  const [voucherCodeToExpire, setVoucherCodeToExpire] = useState<string | null>(null)

  useEffect(() => {
    loadVouchers()
  }, [])

  // Sincroniza a aba ativa com o hash da URL (#pagar | #historico)
  useEffect(() => {
    const applyFromHash = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '').toLowerCase() : ''
      if (hash === 'historico' || hash === 'pagar') {
        setActiveTab(hash)
      }
    }

    applyFromHash()
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', applyFromHash)
      return () => window.removeEventListener('hashchange', applyFromHash)
    }
  }, [])

  const loadVouchers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vouchers/my-vouchers')
      const data = await response.json()

      if (data.success) {
        setVouchers(data.vouchers)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar vouchers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
      }
    } catch (err) {
      console.error('Erro ao copiar:', err)
      alert('Não foi possível copiar. Código: ' + code)
    }
  }

  const handleExpireVoucher = (code: string) => {
    setVoucherCodeToExpire(code)
    setIsExpireModalOpen(true)
  }

  const confirmExpireVoucher = async () => {
    if (!voucherCodeToExpire) return

    try {
      setExpiringCode(voucherCodeToExpire)
      const response = await fetch('/api/vouchers/expire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: voucherCodeToExpire })
      })

      const data = await response.json()

      if (data.success) {
        setIsExpireModalOpen(false)
        setVoucherCodeToExpire(null)
        // Atualiza a lista de vouchers
        await loadVouchers()
      } else {
        alert(data.error || 'Erro ao expirar voucher')
      }
    } catch (error) {
      console.error('Erro ao expirar voucher:', error)
      alert('Erro ao expirar voucher')
    } finally {
      setExpiringCode(null)
    }
  }

  const cancelExpireVoucher = () => {
    setIsExpireModalOpen(false)
    setVoucherCodeToExpire(null)
  }

  const getStatusBadge = (voucher: Voucher) => {
    if (voucher.status === 'COMPLETED') {
      return <Badge className="bg-green-500">Pago</Badge>
    }
    if (voucher.status === 'CANCELLED') {
      return <Badge variant="destructive">Cancelado</Badge>
    }
    if (voucher.isExpired) {
      return <Badge variant="secondary">Expirado</Badge>
    }
    return <Badge className="bg-blue-500">Pendente</Badge>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-orange-600" />
            Crédito Minerador
          </h1>
          <p className="text-gray-600 mt-2">
            Pague pacotes de outros mineradores ou receba pagamentos usando saldo de bônus
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vouchers Criados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{stats.created}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pagamentos Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navegação por Tabs */}
      <div className="space-y-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'pagar' ? 'default' : 'ghost'}
            onClick={() => {
              // Atualiza a URL para permitir link direto
              if (typeof window !== 'undefined') window.location.hash = 'pagar'
              setActiveTab('pagar')
            }}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Pagar Voucher
          </Button>
          <Button
            variant={activeTab === 'historico' ? 'default' : 'ghost'}
            onClick={() => {
              // Atualiza a URL para permitir link direto
              if (typeof window !== 'undefined') window.location.hash = 'historico'
              setActiveTab('historico')
            }}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Histórico
          </Button>
        </div>

        {/* Aba: Pagar Voucher */}
        {activeTab === 'pagar' && (
          <div className="space-y-6">
            <PayVoucherCard />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regras do Crédito Minerador</CardTitle>
                <CardDescription>Como funciona o pagamento de cotas com saldo de bônus</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>O beneficiário gera um código (MINER-XXXX-XXXX) para a cota e a mineradora escolhidas.</li>
                  <li>O código vale por 48 horas e pode ser usado uma única vez.</li>
                  <li>O pagamento é feito somente com o seu saldo de bônus; o valor da cota é descontado integralmente.</li>
                  <li>Não é possível pagar o próprio código.</li>
                  <li>A confirmação exige a sua senha financeira.</li>
                  <li>Após o pagamento, a cota é ativada para o beneficiário e o crédito aparece no Histórico.</li>
                  <li>Códigos não pagos dentro do prazo expiram automaticamente; o beneficiário também pode expirá-los.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba: Histórico */}
        {activeTab === 'historico' && (
          <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando histórico...</p>
                </div>
              </CardContent>
            </Card>
          ) : vouchers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-600 text-center">
                  Nenhum voucher encontrado.<br />
                  Crie ou pague vouchers para vê-los aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {vouchers.map((voucher) => (
                <Card key={voucher.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm font-semibold">
                            {voucher.code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCode(voucher.code)}
                            className="h-7 px-2"
                          >
                            {copiedCode === voucher.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          {getStatusBadge(voucher)}
                          {voucher.isCreator && (
                            <Badge variant="outline" className="bg-orange-50">
                              Criado por você
                            </Badge>
                          )}
                          {voucher.isPayer && (
                            <Badge variant="outline" className="bg-green-50">
                              Pago por você
                            </Badge>
                          )}
                          {voucher.isCreator && voucher.status === 'PENDING' && !voucher.isExpired && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExpireVoucher(voucher.code)}
                              disabled={expiringCode === voucher.code}
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {expiringCode === voucher.code ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                  Expirando...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Expirar
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Pacote:</span>
                            <span className="font-semibold">
                              {voucher.package?.name}
                              {voucher.quantity > 1 && ` (${voucher.quantity}x)`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Valor:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(voucher.package ? voucher.package.price * voucher.quantity : voucher.amount)}
                            </span>
                            {voucher.quantity > 1 && voucher.package && (
                              <span className="text-xs text-gray-500">
                                ({formatCurrency(voucher.package.price)} cada)
                              </span>
                            )}
                          </div>

                          {voucher.beneficiary && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Beneficiário:</span>
                              <span className="font-semibold">{voucher.beneficiary.name}</span>
                            </div>
                          )}

                          {voucher.payer && (
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Pagador:</span>
                              <span className="font-semibold">{voucher.payer.name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Criado:</span>
                            <span className="text-sm">{formatDate(voucher.createdAt)}</span>
                          </div>

                          {voucher.paidAt && (
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-gray-600">Pago:</span>
                              <span className="text-sm">{formatDate(voucher.paidAt)}</span>
                            </div>
                          )}

                          {!voucher.paidAt && voucher.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="text-gray-600">Expira:</span>
                              <span className="text-sm">{formatDate(voucher.expiresAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={loadVouchers}
              variant="outline"
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação para Expirar Voucher */}
      <ConfirmationModal
        isOpen={isExpireModalOpen}
        onClose={cancelExpireVoucher}
        onConfirm={confirmExpireVoucher}
        title="Expirar Voucher"
        message="Tem certeza que deseja expirar este voucher? Esta ação não pode ser desfeita e o voucher ficará indisponível para pagamento."
        confirmText="Sim, Expirar"
        cancelText="Cancelar"
        type="danger"
        isLoading={expiringCode !== null}
      />
    </div>
  )
}

export default CreditoMineradorPage

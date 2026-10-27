'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Save,
  Loader2,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { formatCurrency, formatStorePaymentStatus } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import Loading from '@/components/Loading'
import { PermissionGate } from '@/components/PermissionGate'

interface OrderDetails {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  subtotal: number
  shippingCost: number
  discount: number
  trackingCode: string | null
  shippingMethod?: string | null
  notes: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  user: {
    id: string
    name: string
    email: string
    cpf: string | null
  }
  items: Array<{
    id: string
    name: string
    sku: string
    quantity: number
    unitPrice: number
    subtotal: number
    imageUrl: string | null
  }>
  shippingAddress: {
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
    zipCode: string
  } | null
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: 'yellow' },
  { value: 'CONFIRMED', label: 'Confirmado', color: 'blue' },
  { value: 'PROCESSING', label: 'Processando', color: 'purple' },
  { value: 'SHIPPED', label: 'Enviado', color: 'indigo' },
  { value: 'DELIVERED', label: 'Entregue', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'red' },
  { value: 'REFUNDED', label: 'Reembolsado', color: 'gray' }
]

export default function DetalhePedidoPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { isLoading: authLoading } = useAuth()
  const { permissionKeys, loading: permLoading } = usePermissions()
  const canRead = permissionKeys.includes('store.orders.read')
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  const [newStatus, setNewStatus] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [notes, setNotes] = useState('')

  const getTrackingUrl = (code: string, shippingMethod?: string | null): string => {
    const normalizedCode = code.trim()
    const normalizedMethod = (shippingMethod || '').toLowerCase()

    if (normalizedMethod.includes('correios')) {
      return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(normalizedCode)}`
    }

    // Fallback genérico para transportadoras sem URL oficial configurada.
    return `https://www.google.com/search?q=${encodeURIComponent(`rastrear encomenda ${normalizedCode}`)}`
  }

  const handleTrackShipment = () => {
    if (!order?.trackingCode) {
      toast.error('Informe um código de rastreio para acompanhar o envio')
      return
    }

    const trackingUrl = getTrackingUrl(order.trackingCode, order.shippingMethod || null)
    window.open(trackingUrl, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (permLoading) return
    if (!canRead) {
      setLoading(false)
      return
    }
    fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permLoading, canRead, orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/admin/store/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Pedido não encontrado')
      }
      
      const data = await response.json()
      setOrder(data)
      setNewStatus(data.status)
      setTrackingCode(data.trackingCode || '')
      setNotes(data.notes || '')
    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      toast.error('Erro ao carregar pedido')
      router.push('/admin/loja/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const canChangeStatus = order?.paymentStatus === 'PAID'

  const handleUpdate = async () => {
    if (!order) return

    setUpdating(true)
    try {
      const body: { status?: string; trackingCode?: string; notes?: string } = {
        trackingCode: trackingCode.trim() !== (order.trackingCode || '') ? trackingCode.trim().toUpperCase() : undefined,
        notes: notes !== (order.notes || '') ? notes : undefined
      }
      if (canChangeStatus && newStatus !== order.status) {
        body.status = newStatus
      }

      const response = await fetch(`/api/admin/store/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar pedido')
      }

      toast.success('Pedido atualizado com sucesso!')
      fetchOrder()
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar pedido')
    } finally {
      setUpdating(false)
    }
  }

  if (authLoading || permLoading || loading) {
    return <Loading />
  }

  if (!canRead) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-xl">Acesso negado</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-xl">Pedido não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/loja/pedidos"
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Pedido {order.orderNumber}
              </h1>
              <p className="text-gray-600">
                Criado em {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total do Pedido</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(order.total)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itens do Pedido */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Itens do Pedido
            </h2>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity}x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete:</span>
                <span>{formatCurrency(order.shippingCost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Cliente
            </h2>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Nome:</span>
                <p className="font-medium text-gray-900">{order.user.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p className="font-medium text-gray-900">{order.user.email}</p>
              </div>
              {order.user.cpf && (
                <div>
                  <span className="text-sm text-gray-500">CPF:</span>
                  <p className="font-medium text-gray-900">{order.user.cpf}</p>
                </div>
              )}
            </div>
          </div>

          {/* Endereço de Entrega */}
          {order.shippingAddress && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Endereço de Entrega
              </h2>
              
              <div className="text-gray-700">
                <p>{order.shippingAddress.street}, {order.shippingAddress.number}</p>
                {order.shippingAddress.complement && (
                  <p>{order.shippingAddress.complement}</p>
                )}
                <p>{order.shippingAddress.neighborhood}</p>
                <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
                <p>CEP: {order.shippingAddress.zipCode}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Atualizar Status */}
          <PermissionGate permission="store.orders.update">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Gerenciar Pedido
            </h2>
            
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status do Pedido
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={!canChangeStatus}
                  aria-label="Status do pedido"
                  aria-describedby={!canChangeStatus ? 'status-helper' : undefined}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!canChangeStatus && (
                  <p id="status-helper" className="mt-1 text-sm text-amber-600">
                    Só é possível alterar o status quando o pagamento estiver concluído (Pago).
                  </p>
                )}
              </div>

              {/* Código de Rastreio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Rastreio
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: BR123456789BR"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                />
              </div>

              {/* Acompanhar Envio */}
              {order.trackingCode && (
                <button
                  type="button"
                  onClick={handleTrackShipment}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Truck className="w-5 h-5 mr-2" />
                  Rastrear Envio
                  <ExternalLink className="w-4 h-4 ml-2" />
                </button>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações Internas
                </label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Adicione observações sobre o pedido..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Botão Salvar */}
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
          </PermissionGate>

          {/* Informações do Pagamento */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Pagamento
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Método:</span>
                <p className="font-medium text-gray-900">
                  {order.paymentMethod === 'PIX' ? 'PIX' :
                   order.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' :
                   order.paymentMethod === 'BALANCE' ? 'Saldo' : order.paymentMethod}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <p className="font-medium text-gray-900">{formatStorePaymentStatus(order.paymentStatus)}</p>
              </div>
              {order.paidAt && (
                <div>
                  <span className="text-sm text-gray-500">Pago em:</span>
                  <p className="font-medium text-gray-900">
                    {format(new Date(order.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Timeline
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Pedido Criado</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              {order.paidAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pagamento Confirmado</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              {order.shippedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pedido Enviado</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.shippedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              {order.deliveredAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Pedido Entregue</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.deliveredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

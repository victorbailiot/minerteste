'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Package,
  MapPin,
  CreditCard,
  Truck,
  Calendar,
  Copy,
  CheckCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import Loading from '@/components/Loading'

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
  shippingMethod: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
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

const STATUS_INFO: Record<string, { 
  label: string
  color: string
  description: string
  icon: string 
}> = {
  PENDING: { 
    label: 'Aguardando Pagamento', 
    color: 'yellow',
    description: 'Estamos aguardando a confirmação do seu pagamento',
    icon: '⏳'
  },
  CONFIRMED: { 
    label: 'Pagamento Confirmado', 
    color: 'blue',
    description: 'Seu pagamento foi confirmado e o pedido está sendo preparado',
    icon: '✅'
  },
  PROCESSING: { 
    label: 'Em Processamento', 
    color: 'purple',
    description: 'Estamos preparando seu pedido para envio',
    icon: '⚙️'
  },
  SHIPPED: { 
    label: 'Enviado', 
    color: 'indigo',
    description: 'Seu pedido está a caminho!',
    icon: '🚚'
  },
  DELIVERED: { 
    label: 'Entregue', 
    color: 'green',
    description: 'Seu pedido foi entregue com sucesso',
    icon: '📦'
  },
  CANCELLED: { 
    label: 'Cancelado', 
    color: 'red',
    description: 'Este pedido foi cancelado',
    icon: '❌'
  },
  REFUNDED: { 
    label: 'Reembolsado', 
    color: 'gray',
    description: 'O valor do pedido foi reembolsado',
    icon: '💰'
  }
}

export default function DetalhePedidoClientePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrder()
    }
  }, [isAuthenticated, orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/store/orders/${orderId}`)
      if (!response.ok) {
        throw new Error('Pedido não encontrado')
      }
      
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      toast.error('Erro ao carregar pedido')
      router.push('/dashboard/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const copyTrackingCode = () => {
    if (order?.trackingCode) {
      navigator.clipboard.writeText(order.trackingCode)
      toast.success('Código de rastreio copiado!')
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-xl">Por favor, faça login para ver seu pedido</p>
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

  const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.PENDING

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/dashboard/pedidos"
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Pedido {order.orderNumber}
            </h1>
            <p className="text-gray-600">
              Realizado em {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(order.total)}
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className={`bg-${statusInfo.color}-50 border border-${statusInfo.color}-200 rounded-lg p-4`}>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{statusInfo.icon}</div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold text-${statusInfo.color}-900`}>
                {statusInfo.label}
              </h3>
              <p className={`text-sm text-${statusInfo.color}-700`}>
                {statusInfo.description}
              </p>
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
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-1">SKU: {item.sku}</p>
                    <p className="text-sm text-gray-600">
                      Quantidade: {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
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
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          {order.shippingAddress && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Endereço de Entrega
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 text-gray-700">
                <p className="font-medium">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
                {order.shippingAddress.complement && (
                  <p>{order.shippingAddress.complement}</p>
                )}
                <p>{order.shippingAddress.neighborhood}</p>
                <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
                <p className="mt-2 text-sm">CEP: {order.shippingAddress.zipCode}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rastreamento */}
          {order.trackingCode && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Rastreamento
              </h2>
              
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-700 font-medium">Código:</span>
                    <button
                      onClick={copyTrackingCode}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Copiar código"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-mono text-sm font-semibold text-blue-900 break-all">
                    {order.trackingCode}
                  </p>
                </div>
                
                {order.shippingMethod && (
                  <div>
                    <span className="text-sm text-gray-500">Transportadora:</span>
                    <p className="font-medium text-gray-900">{order.shippingMethod}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Pagamento
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Método:</span>
                <p className="font-medium text-gray-900">
                  {order.paymentMethod === 'PIX' ? '💳 PIX' :
                   order.paymentMethod === 'CREDIT_CARD' ? '💳 Cartão de Crédito' :
                   order.paymentMethod === 'BALANCE' ? '💰 Saldo' : order.paymentMethod}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <p className={`font-medium inline-flex items-center ${
                  order.paymentStatus === 'PAID' ? 'text-green-600' :
                  order.paymentStatus === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {order.paymentStatus === 'PAID' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {order.paymentStatus === 'PAID' ? 'Pago' :
                   order.paymentStatus === 'PENDING' ? 'Pendente' :
                   order.paymentStatus === 'FAILED' ? 'Falhou' : order.paymentStatus}
                </p>
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
              Histórico
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Pedido Realizado</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              {order.paidAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Pagamento Confirmado</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              {order.shippedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Pedido Enviado</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.shippedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              {order.deliveredAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-green-600 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Pedido Entregue</p>
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

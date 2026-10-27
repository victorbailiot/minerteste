'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Package, 
  Eye, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Calendar,
  MapPin,
  CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import Loading from '@/components/Loading'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  createdAt: string
  items: Array<{
    id: string
    name: string
    quantity: number
    unitPrice: number
    imageUrl: string | null
  }>
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳' },
  CONFIRMED: { label: 'Pagamento Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '✅' },
  PROCESSING: { label: 'Em Processamento', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '⚙️' },
  SHIPPED: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: '🚚' },
  DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200', icon: '📦' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200', icon: '❌' },
  REFUNDED: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '💰' }
}

export default function MeusPedidosPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', '10')

      const response = await fetch(`/api/store/orders?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Falha ao buscar pedidos')
      }

      const data = await response.json()
      setOrders(data.orders)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
      toast.error('Erro ao carregar seus pedidos')
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated, fetchOrders])

  if (authLoading) {
    return <Loading />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-xl">Por favor, faça login para ver seus pedidos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShoppingBag className="w-8 h-8 mr-3 text-blue-600" />
              Meus Pedidos
            </h1>
            <p className="text-gray-600">Acompanhe o status dos seus pedidos</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total de Pedidos</div>
            <div className="text-2xl font-bold text-blue-600">{total}</div>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum pedido ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Você ainda não fez nenhuma compra na nossa loja
            </p>
            <Link
              href="/dashboard/loja"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Ir para Loja
            </Link>
          </div>
        ) : (
          <>
            {/* Cards de Pedidos */}
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  {/* Header do Pedido */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.orderNumber}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_LABELS[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {STATUS_LABELS[order.status]?.icon} {STATUS_LABELS[order.status]?.label || order.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                        <div className="flex items-center">
                          <Package className="w-4 h-4 mr-1" />
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-1" />
                          {order.paymentMethod === 'PIX' ? 'PIX' :
                           order.paymentMethod === 'CREDIT_CARD' ? 'Cartão' :
                           order.paymentMethod === 'BALANCE' ? 'Saldo' : order.paymentMethod}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(order.total)}
                      </div>
                      <Link
                        href={`/dashboard/pedidos/${order.id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>

                  {/* Prévia dos Itens */}
                  <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                    {order.items.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                      >
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          +{order.items.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Página <span className="font-medium">{currentPage}</span> de{' '}
                    <span className="font-medium">{totalPages}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

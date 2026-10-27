'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Package } from 'lucide-react'
import { StoreProduct } from '@/model/store'
import { toast } from 'sonner'
import ConfirmationModal from '@/components/modals/ConfirmationModal'
import { PermissionGate } from '@/components/PermissionGate'
import { usePermissions } from '@/lib/hooks/usePermissions'
import Loading from '@/components/Loading'

export default function AdminProdutosPage() {
  const { permissionKeys, loading: permissionsLoading } = usePermissions()
  const canRead = permissionKeys.includes('store.products.read')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (permissionsLoading) return
    if (!canRead) {
      setLoading(false)
      return
    }
    loadProducts()
  }, [permissionsLoading, canRead])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/store/products?${params.toString()}`)
      
      // Verificar se a resposta está OK antes de fazer parse do JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
        } else {
          // Se não for JSON, provavelmente é HTML (página de erro)
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      const data = await response.json()

      if (data.success) {
        setProducts(data.products || [])
      } else {
        toast.error(data.error || 'Erro ao carregar produtos')
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar produtos'
      toast.error(errorMessage)
      setProducts([]) // Garantir que a lista seja limpa em caso de erro
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDeleteModal = (productId: string, productName: string) => {
    setProductToDelete({ id: productId, name: productName })
  }

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setProductToDelete(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/store/products/${productToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        toast.success('Produto excluído com sucesso')
        setProducts((prev) => prev.filter((p) => String(p.id) !== String(productToDelete.id)))
        setProductToDelete(null)
      } else {
        toast.error(data.error || 'Erro ao excluir produto')
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir produto'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/store/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      // Verificar se a resposta está OK antes de fazer parse do JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      const data = await response.json()

      if (data.success) {
        toast.success('Status atualizado com sucesso')
        loadProducts()
      } else {
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar status'
      toast.error(errorMessage)
    }
  }

  if (permissionsLoading) {
    return <Loading />
  }

  if (!canRead) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-xl">Acesso negado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produtos da Loja</h1>
              <p className="text-gray-600">Gerencie o catálogo de produtos</p>
            </div>
          </div>
          <PermissionGate permission="store.products.create">
            <Link
              href="/admin/loja/produtos/novo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Produto
            </Link>
          </PermissionGate>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar produtos por nome, SKU ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadProducts}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.mainImage && (
                          <img
                            src={product.mainImage}
                            alt={product.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.category?.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {Number(product.price).toFixed(2)}
                      </div>
                      {product.comparePrice && (
                        <div className="text-xs text-gray-500 line-through">
                          R$ {Number(product.comparePrice).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.stock > product.lowStockAlert
                            ? 'bg-green-100 text-green-800'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock} un.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PermissionGate permission="store.products.update">
                      <button
                        onClick={() => handleToggleStatus(product.id, product.isActive)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {product.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Ativo
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Inativo
                          </>
                        )}
                      </button>
                      </PermissionGate>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate permission="store.products.update">
                          <Link
                            href={`/admin/loja/produtos/editar/${product.id}`}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </PermissionGate>
                        <PermissionGate permission="store.products.delete">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleOpenDeleteModal(product.id, product.name)
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          aria-label={`Excluir produto ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      <ConfirmationModal
        isOpen={!!productToDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Excluir produto"
        message={
          productToDelete
            ? `Deseja realmente excluir o produto "${productToDelete.name}"? Esta ação irá desativar o produto.`
            : ''
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

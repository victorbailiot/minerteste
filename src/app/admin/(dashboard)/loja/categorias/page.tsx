'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { PermissionGate } from '@/components/PermissionGate'
import { usePermissions } from '@/lib/hooks/usePermissions'
import Loading from '@/components/Loading'
import { generateSlug } from '@/lib/validations/store'

interface Category {
  id: number
  name: string
  description: string | null
  productCount: number
  createdAt: string
}

const CategoriesPage = () => {
  const { permissionKeys, loading: permissionsLoading } = usePermissions()
  const canRead = permissionKeys.includes('store.categories.read')
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (permissionsLoading) return
    if (!canRead) {
      setIsLoading(false)
      return
    }
    fetchCategories()
  }, [permissionsLoading, canRead])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/store/categories')
      if (!response.ok) throw new Error('Erro ao carregar categorias')
      const data = await response.json()
      
      // Transformar dados da API para o formato esperado
      const transformedCategories = (data.categories || []).map((cat: any) => ({
        id: parseInt(cat.id),
        name: cat.name,
        description: cat.description,
        productCount: cat.productsCount || 0,
        createdAt: new Date().toISOString()
      }))
      
      setCategories(transformedCategories)
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCategory
        ? `/api/admin/store/categories/${editingCategory.id}`
        : '/api/admin/store/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          slug: generateSlug(formData.name)
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar categoria')

      await fetchCategories()
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      alert('Erro ao salvar categoria. Tente novamente.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const response = await fetch(`/api/admin/store/categories/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao excluir categoria')
      }

      await fetchCategories()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      alert(error instanceof Error ? error.message : 'Erro ao excluir categoria. Tente novamente.')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || ''
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      description: ''
    })
  }

  if (permissionsLoading || isLoading) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Categorias</h1>
        <PermissionGate permission="store.categories.create">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Categoria
          </button>
        </PermissionGate>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Nenhuma categoria cadastrada
          </h2>
          <p className="text-gray-500 mb-4">
            Comece criando sua primeira categoria
          </p>
          <PermissionGate permission="store.categories.create">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Categoria
            </button>
          </PermissionGate>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-800">
                  {category.name}
                </h3>
                <div className="flex gap-2">
                  <PermissionGate permission="store.categories.update">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Editar categoria"
                      tabIndex={0}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="store.categories.delete">
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Excluir categoria"
                      tabIndex={0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
              
              {category.description && (
                <p className="text-gray-600 text-sm mb-3">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Package className="w-4 h-4" />
                <span>
                  {category.productCount} {category.productCount === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  tabIndex={0}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  tabIndex={0}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  tabIndex={0}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  tabIndex={0}
                >
                  {editingCategory ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesPage

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Plus, Edit2, Trash2, Search, Filter, ToggleLeft, ToggleRight } from 'lucide-react'

interface Parameter {
  id: string
  key: string
  value: string
  type: 'PERCENTUAL' | 'INTEIRO' | 'BOOLEANO' | 'JSON'
  description: string
  status: 'ATIVO' | 'INATIVO'
  createdAt: string
  updatedAt: string
}

interface ParameterFormData {
  key: string
  value: string
  type: 'PERCENTUAL' | 'INTEIRO' | 'BOOLEANO' | 'JSON'
  description: string
  status: 'ATIVO' | 'INATIVO'
}

export default function ParametersPage() {
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [filteredParameters, setFilteredParameters] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null)
  const [formData, setFormData] = useState<ParameterFormData>({
    key: '',
    value: '',
    type: 'PERCENTUAL',
    description: '',
    status: 'ATIVO'
  })
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const fetchParameters = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/parameters')
      const result = await response.json()
      
      if (result.success) {
        setParameters(result.data)
      } else {
        showNotification('Erro ao carregar parâmetros', 'error')
      }
    } catch (error) {
      showNotification('Erro ao conectar com o servidor', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const filterParameters = useCallback(() => {
    let filtered = parameters

    // Filtrar por status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(param => param.status === statusFilter)
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(param =>
        param.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        param.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredParameters(filtered)
  }, [parameters, statusFilter, searchTerm])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  useEffect(() => {
    filterParameters()
  }, [filterParameters])



  const handleEdit = (parameter: Parameter) => {
    setEditingParameter(parameter)
    setFormData({
      key: parameter.key,
      value: parameter.value,
      type: parameter.type,
      description: parameter.description,
      status: parameter.status
    })
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingParameter(null)
    setFormData({
      key: '',
      value: '',
      type: 'PERCENTUAL',
      description: '',
      status: 'ATIVO'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingParameter 
        ? `/api/admin/parameters/${encodeURIComponent(editingParameter.key)}`
        : '/api/admin/parameters'
      
      const method = editingParameter ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        showNotification(
          editingParameter ? 'Parâmetro atualizado com sucesso' : 'Parâmetro criado com sucesso',
          'success'
        )
        setShowModal(false)
        fetchParameters()
      } else {
        showNotification(result.error || 'Erro ao salvar parâmetro', 'error')
      }
    } catch (error) {
      showNotification('Erro ao conectar com o servidor', 'error')
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm('Tem certeza que deseja deletar este parâmetro?')) return
    
    try {
      const response = await fetch(`/api/admin/parameters/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        showNotification('Parâmetro deletado com sucesso', 'success')
        fetchParameters()
      } else {
        showNotification(result.error || 'Erro ao deletar parâmetro', 'error')
      }
    } catch (error) {
      showNotification('Erro ao conectar com o servidor', 'error')
    }
  }

  const toggleStatus = async (parameter: Parameter) => {
    try {
      const newStatus = parameter.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'
      
      const response = await fetch(`/api/admin/parameters/${encodeURIComponent(parameter.key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...parameter,
          status: newStatus
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        showNotification(`Parâmetro ${newStatus.toLowerCase()}`, 'success')
        fetchParameters()
      } else {
        showNotification(result.error || 'Erro ao alterar status', 'error')
      }
    } catch (error) {
      showNotification('Erro ao conectar com o servidor', 'error')
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const formatValue = (value: string, type: string) => {
    switch (type) {
      case 'PERCENTUAL':
        return `${value}%`
      case 'BOOLEANO':
        return value === 'true' ? 'Sim' : 'Não'
      case 'JSON':
        try {
          return JSON.stringify(JSON.parse(value), null, 2)
        } catch {
          return value
        }
      default:
        return value
    }
  }

  const renderValueInput = () => {
    switch (formData.type) {
      case 'PERCENTUAL':
        return (
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              placeholder="0.00"
              required
            />
            <span className="absolute right-3 top-3 text-gray-500">%</span>
          </div>
        )
      case 'INTEIRO':
        return (
          <input
            type="number"
            min="0"
            step="1"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            required
          />
        )
      case 'BOOLEANO':
        return (
          <select
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        )
      case 'JSON':
        return (
          <textarea
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-24 font-mono text-sm"
            placeholder='{"key": "value"}'
            required
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parâmetros do Sistema</h1>
            <p className="text-gray-600">Gerencie as configurações de bonificação e regras de negócio</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Parâmetro
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar parâmetros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">Todos</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>
      </div>

      {/* Parameters Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Atualização
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParameters.map((parameter) => (
                <tr key={parameter.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{parameter.key}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-32 truncate">
                      {formatValue(parameter.value, parameter.type)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      parameter.type === 'PERCENTUAL' ? 'bg-blue-100 text-blue-800' :
                      parameter.type === 'INTEIRO' ? 'bg-green-100 text-green-800' :
                      parameter.type === 'BOOLEANO' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {parameter.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs break-words">
                      {parameter.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleStatus(parameter)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                        parameter.status === 'ATIVO'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {parameter.status === 'ATIVO' ? (
                        <ToggleRight className="h-3 w-3" />
                      ) : (
                        <ToggleLeft className="h-3 w-3" />
                      )}
                      {parameter.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(parameter.updatedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(parameter)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(parameter.key)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredParameters.length === 0 && (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum parâmetro encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingParameter ? 'Editar Parâmetro' : 'Novo Parâmetro'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex: direct_commission_percentage"
                  required
                  disabled={!!editingParameter}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="PERCENTUAL">Percentual</option>
                  <option value="INTEIRO">Inteiro</option>
                  <option value="BOOLEANO">Booleano</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                {renderValueInput()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descreva o que este parâmetro controla..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingParameter ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
} 
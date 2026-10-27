'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  Package,
  RefreshCw,
  Plus
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  photoUrl: string | null
  status: 'active' | 'inactive' | 'banned'
  package: string | null
  registeredAt: string
  role: string
  isActive: boolean
  lastLogin: string | null
  referralCode: string
  position: string
  sponsorId: number | null
  parentId: number | null
  packages: Array<{
    id: number
    name: string
    price: number
    isActive: boolean
    activatedAt: string
  }>
}

interface Package {
  id: number
  name: string
  description: string | null
  price: number
  points: number
  isActive: boolean
  cycleBonus: number
  totalCycles: number
  profitSharePercent: number
  createdAt: string
  updatedAt: string
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export default function UsuariosPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('') // Estado local do input
  const [searchTerm, setSearchTerm] = useState('') // Estado do filtro aplicado
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  })


  const fetchPackages = useCallback(async () => {
    try {
      setPackagesLoading(true)
      const response = await fetch('/api/packages?isActive=true')
      const data = await response.json()

      if (data.success) {
        setPackages(data.data)
      } else {
        console.error('Erro ao buscar pacotes:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error)
    } finally {
      setPackagesLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        package: packageFilter
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.data)
        setPagination(data.pagination)
      } else {
        console.error('Erro ao buscar usuários:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.currentPage, pagination.itemsPerPage, searchTerm, statusFilter, packageFilter])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
  }

  const applySearch = () => {
    setSearchTerm(searchInput)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePackageFilter = (value: string) => {
    setPackageFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handleUserAction = async (userId: number, action: string) => {
    try {
      let response
      
      switch (action) {
        case 'ban':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false })
          })
          break
        case 'activate':
          response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: true })
          })
          break
        case 'delete':
          if (confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
            response = await fetch(`/api/admin/users?userId=${userId}`, {
              method: 'DELETE'
            })
          } else {
            return
          }
          break
        default:
          return
      }

      if (response?.ok) {
        fetchUsers() // Recarregar lista
      } else {
        console.error('Erro ao executar ação:', action)
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      banned: 'Banido'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPackageBadge = (packageName: string | null) => {
    if (!packageName) return <span className="text-gray-400 text-sm">Nenhum</span>
    
    const styles: Record<string, string> = {
      'AdCentral': 'bg-blue-100 text-blue-800',
      'FAMILY': 'bg-purple-100 text-purple-800',
      'T-BUILD': 'bg-orange-100 text-orange-800',
      'Átomo': 'bg-cyan-100 text-cyan-800',
      'Núcleo': 'bg-indigo-100 text-indigo-800',
      'Tecton': 'bg-amber-100 text-amber-800'
    }

    const style = styles[packageName] || 'bg-gray-100 text-gray-800'

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style}`}>
        {packageName}
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-red-100 text-red-800',
      USER: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[role as keyof typeof styles]}`}>
        {role}
      </span>
    )
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-gray-700 flex-shrink-0" />
              <span className="truncate">Gerenciamento de Usuários</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Visualize e gerencie todos os usuários da plataforma</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button 
              onClick={fetchUsers}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
            >
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="space-y-4">
          {/* Seção de Busca */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <h3 className="text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">Busca por Texto</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="CPF, nome, email, telefone ou código de indicação..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applySearch()
                    }
                  }}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={applySearch}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span>Buscar</span>
                </button>
                <button
                  onClick={clearSearch}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              </div>
            </div>
            {searchTerm && (
              <div className="mt-2">
                <span className="text-xs md:text-sm text-gray-600">
                  Buscando por: <span className="font-medium text-gray-900">&ldquo;{searchTerm}&rdquo;</span>
                </span>
              </div>
            )}
          </div>

          {/* Filtros Rápidos */}
          <div>
            <h3 className="text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">Filtros Rápidos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">

              {/* Filtro por Status */}
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="banned">Banido</option>
              </select>

              {/* Filtro por Pacote */}
              <select
                value={packageFilter}
                onChange={(e) => handlePackageFilter(e.target.value)}
                className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm md:text-base"
                disabled={packagesLoading}
              >
                <option value="all">Todos os Pacotes</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} - {formatCurrency(pkg.price)}
                  </option>
                ))}
              </select>

              {/* Botão de Filtros Avançados */}
              <button className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base sm:col-span-2 lg:col-span-1">
                <Filter className="w-4 h-4 flex-shrink-0" />
                Filtros Avançados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">Total de Usuários</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{pagination.totalItems}</p>
            </div>
            <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">Usuários Ativos</p>
              <p className="text-lg md:text-2xl font-bold text-green-600 truncate">{users.filter(u => u.status === 'active').length}</p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 truncate">Com Pacotes</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 truncate">{users.filter(u => u.package).length}</p>
            </div>
            <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            Lista de Usuários ({users.length} de {pagination.totalItems})
          </h2>
        </div>
        
        {/* Versão Desktop - Tabela */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex-shrink-0 h-12 w-12">
                      {user.photoUrl ? (
                        <Image
                          src={user.photoUrl}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Link 
                        href={`/admin/usuarios/${user.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {user.name}
                      </Link>
                      <div className="text-xs text-gray-400">
                        Desde {formatDate(user.registeredAt)}
                        {user.lastLogin && (
                          <span className="ml-2">• Último login: {formatDate(user.lastLogin)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(user.role)}
                        <span className="text-xs text-gray-500">Código: {user.referralCode}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPackageBadge(user.package)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile e Tablet - Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50">
              {/* Header do Card */}
              <div className="flex items-start gap-3 mb-3">
                {/* Foto do Usuário */}
                <div className="flex-shrink-0">
                  {user.photoUrl ? (
                    <Image
                      src={user.photoUrl}
                      alt={user.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Informações do Usuário */}
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link 
                      href={`/admin/usuarios/${user.id}`}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-900 hover:underline truncate"
                    >
                      {user.name}
                    </Link>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Código: {user.referralCode}</p>
                </div>

                {/* Botão Ver Detalhes */}
                <button 
                  onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                  className="flex-shrink-0 text-blue-600 hover:text-blue-900 p-2 cursor-pointer"
                  title="Ver detalhes"
                  aria-label="Ver detalhes do usuário"
                  tabIndex={0}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              {/* Status e Pacote */}
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(user.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pacote</p>
                  {getPackageBadge(user.package)}
                </div>
              </div>

              {/* Datas */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Desde {formatDate(user.registeredAt)}
                  {user.lastLogin && (
                    <span className="ml-2">• Último login: {formatDate(user.lastLogin)}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8 md:py-12 px-4">
            <Users className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" />
            <p className="text-sm md:text-base text-gray-500">Nenhum usuário encontrado com os filtros aplicados</p>
          </div>
        )}

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs md:text-sm text-gray-700 text-center sm:text-left">
                <span className="hidden sm:inline">
                  Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de {pagination.totalItems} resultados
                </span>
                <span className="sm:hidden">
                  {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de {pagination.totalItems}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  aria-label="Página anterior"
                  tabIndex={0}
                >
                  <span className="hidden sm:inline">Anterior</span>
                  <span className="sm:hidden">←</span>
                </button>
                <span className="text-xs md:text-sm text-gray-700 px-2">
                  <span className="hidden sm:inline">Página </span>
                  {pagination.currentPage} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  aria-label="Próxima página"
                  tabIndex={0}
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      
    </div>
  )
} 
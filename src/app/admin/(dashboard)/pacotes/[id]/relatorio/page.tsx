'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Package, 
  Users, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  UserCheck,
  PackageCheck,
  Filter,
  RefreshCw,
  CircleArrowUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { usePermissions } from '@/lib/hooks/usePermissions'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

interface PackageInfo {
  id: number
  name: string
  slug: string | null
  description: string | null
  price: number
  points: number
  isActive: boolean
  createdAt: string
}

interface Statistics {
  totalPackages: number
  activePackages: number
  inactivePackages: number
  uniqueUsers: number
  activeUniqueUsers: number
  totalCyclesCompleted: number
  avgCyclesPerPackage: number
  packagesLast7Days: number
  packagesLast30Days: number
  uniqueUsersLast7Days: number
  uniqueUsersLast30Days: number
  expiredPackages: number
  packagesExpiringSoon: number
  usersWithOnePackage: number
  usersWithMultiplePackages: number
  maxPackagesPerUser: number
  usersWithMultiplePackagesList: Array<{
    userId: string
    userName: string
    userEmail: string
    packagesCount: number
  }>
  usersWithOnePackageList: Array<{
    userId: string
    userName: string
    userEmail: string
    packagesCount: number
  }>
}

interface ReportData {
  package: PackageInfo
  statistics: Statistics
}

interface InactivePackage {
  id: number
  userId: string
  userName: string
  userEmail: string
  createdAt: string
  expiresAt: string | null
  isActive: boolean
  isUnilevel: boolean
  completedCycles: number
}

interface GroupedInactiveUser {
  userId: string
  userName: string
  userEmail: string
  packagesCount: number
  packages: Array<{
    id: number
    createdAt: string
    expiresAt: string | null
    isActive: boolean
    isUnilevel: boolean
    completedCycles: number
  }>
}

export default function PackageReportPage() {
  const params = useParams()
  const router = useRouter()
  const packageId = params.id as string
  const { isSuperAdmin } = usePermissions()

  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'one' | 'multiple' | null>(null)
  
  // Estados para filtros de pacotes inativos
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [inactivePackages, setInactivePackages] = useState<InactivePackage[]>([])
  const [groupedInactiveUsers, setGroupedInactiveUsers] = useState<GroupedInactiveUser[]>([])
  const [loadingInactive, setLoadingInactive] = useState(false)
  const [syncingCoupons, setSyncingCoupons] = useState<Record<string, boolean>>({})
  const [upgradingToPluton, setUpgradingToPluton] = useState<Record<string, boolean>>({})

  const loadReport = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/packages/${packageId}/report`)
      const result = await response.json()

      if (result.success) {
        setReportData(result.data)
      } else {
        toast.error(result.error || 'Erro ao carregar relatório')
        router.push('/admin/pacotes')
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      toast.error('Erro ao carregar relatório')
      router.push('/admin/pacotes')
    } finally {
      setLoading(false)
    }
  }, [packageId, router])

  const loadInactivePackages = useCallback(async () => {
    try {
      setLoadingInactive(true)
      
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
      
      const response = await fetch(`/api/admin/packages/${packageId}/inactive-list?${queryParams.toString()}`)
      const result = await response.json()

      if (result.success) {
        // A API agora retorna usuários agrupados
        setGroupedInactiveUsers(result.data.users || [])
        // Manter compatibilidade com formato antigo se necessário
        if (result.data.packages) {
          setInactivePackages(result.data.packages)
        } else {
          setInactivePackages([])
        }
      } else {
        toast.error(result.error || 'Erro ao carregar pacotes inativos')
      }
    } catch (error) {
      console.error('Erro ao carregar pacotes inativos:', error)
      toast.error('Erro ao carregar pacotes inativos')
    } finally {
      setLoadingInactive(false)
    }
  }, [packageId, startDate, endDate])

  const handleSyncCoupons = useCallback(async (userId: string) => {
    try {
      setSyncingCoupons(prev => ({ ...prev, [userId]: true }))
      
      const response = await fetch(`/api/admin/packages/${packageId}/sync-coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message || 'Cupons sincronizados com sucesso')
      } else {
        toast.error(result.error || 'Erro ao sincronizar cupons')
      }
    } catch (error) {
      console.error('Erro ao sincronizar cupons:', error)
      toast.error('Erro ao sincronizar cupons')
    } finally {
      setSyncingCoupons(prev => ({ ...prev, [userId]: false }))
    }
  }, [packageId])

  const handleUpgradeToPluton = useCallback(async (userId: string) => {
    try {
      setUpgradingToPluton(prev => ({ ...prev, [userId]: true }))

      const response = await fetch(`/api/admin/packages/${packageId}/upgrade-to-pluton`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message || 'Upgrade realizado com sucesso')
        await loadReport()
      } else {
        toast.error(result.error || 'Erro ao realizar upgrade')
      }
    } catch (error) {
      console.error('Erro ao realizar upgrade para Pluton:', error)
      toast.error('Erro ao realizar upgrade')
    } finally {
      setUpgradingToPluton(prev => ({ ...prev, [userId]: false }))
    }
  }, [packageId, loadReport])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    loadInactivePackages()
  }, [loadInactivePackages])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return null
  }

  const { package: pkg, statistics: stats } = reportData

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pacotes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatório Detalhado</h1>
            <p className="text-gray-600 mt-1">{pkg.name}</p>
          </div>
        </div>
        <Badge variant={pkg.isActive ? "default" : "secondary"}>
          {pkg.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Informações do Pacote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Informações do Pacote</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Preço</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(pkg.price)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pontos</p>
              <p className="text-xl font-bold text-green-600">{pkg.points.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Criado em</p>
              <p className="text-xl font-bold text-gray-700">
                {dayjs(pkg.createdAt).format('DD/MM/YYYY')}
              </p>
            </div>
          </div>
          {pkg.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Descrição</p>
              <p className="text-gray-800">{pkg.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Usuários Únicos</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.activeUniqueUsers} com pacotes ativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PackageCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Pacotes Ativos</p>
                <p className="text-2xl font-bold">{stats.activePackages}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.inactivePackages} inativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total de Pacotes</p>
                <p className="text-2xl font-bold">{stats.totalPackages}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.maxPackagesPerUser} máximo por usuário
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Ciclos Completados</p>
                <p className="text-2xl font-bold">{stats.totalCyclesCompleted}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.avgCyclesPerPackage.toFixed(1)} média/pacote
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Temporais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Atividade Recente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Últimos 7 dias</p>
                <p className="text-lg font-bold">{stats.packagesLast7Days} pacotes</p>
                <p className="text-xs text-gray-500">{stats.uniqueUsersLast7Days} usuários únicos</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Últimos 30 dias</p>
                <p className="text-lg font-bold">{stats.packagesLast30Days} pacotes</p>
                <p className="text-xs text-gray-500">{stats.uniqueUsersLast30Days} usuários únicos</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Status de Expiração</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.expiredPackages > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Pacotes Expirados</p>
                  <p className="text-lg font-bold text-red-600">{stats.expiredPackages}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            )}
            {stats.packagesExpiringSoon > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Expirando em 30 dias</p>
                  <p className="text-lg font-bold text-yellow-600">{stats.packagesExpiringSoon}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            )}
            {stats.expiredPackages === 0 && stats.packagesExpiringSoon === 0 && (
              <div className="flex items-center justify-center p-6 text-gray-500">
                <CheckCircle className="h-8 w-8 mr-2" />
                <span>Nenhum pacote expirando em breve</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Distribuição de Pacotes por Usuário</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div 
              className={`text-center p-4 rounded-lg cursor-pointer transition-all ${
                filterType === 'one' 
                  ? 'bg-blue-200 ring-2 ring-blue-500' 
                  : 'bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={() => setFilterType(filterType === 'one' ? null : 'one')}
              tabIndex={0}
              role="button"
              aria-label="Filtrar usuários com 1 pacote"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setFilterType(filterType === 'one' ? null : 'one')
                }
              }}
            >
              <p className="text-sm text-gray-600">Usuários com 1 pacote</p>
              <p className="text-2xl font-bold text-blue-600">{stats.usersWithOnePackage}</p>
            </div>
            <div 
              className={`text-center p-4 rounded-lg cursor-pointer transition-all ${
                filterType === 'multiple' 
                  ? 'bg-purple-200 ring-2 ring-purple-500' 
                  : 'bg-purple-50 hover:bg-purple-100'
              }`}
              onClick={() => setFilterType(filterType === 'multiple' ? null : 'multiple')}
              tabIndex={0}
              role="button"
              aria-label="Filtrar usuários com múltiplos pacotes"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setFilterType(filterType === 'multiple' ? null : 'multiple')
                }
              }}
            >
              <p className="text-sm text-gray-600">Usuários com múltiplos pacotes</p>
              <p className="text-2xl font-bold text-purple-600">{stats.usersWithMultiplePackages}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Máximo de pacotes</p>
              <p className="text-2xl font-bold text-green-600">{stats.maxPackagesPerUser}</p>
              <p className="text-xs text-gray-500 mt-1">por um único usuário</p>
            </div>
          </div>

          {(() => {
            let usersList: Array<{
              userId: string
              userName: string
              userEmail: string
              packagesCount: number
            }> = []
            let listTitle = ''

            if (filterType === 'one') {
              usersList = stats.usersWithOnePackageList
              listTitle = 'Usuários com 1 Pacote'
            } else if (filterType === 'multiple') {
              usersList = stats.usersWithMultiplePackagesList
              listTitle = 'Usuários com Múltiplos Pacotes'
            }

            if (filterType && usersList.length > 0) {
              // Tecton: cada 5 pacotes do mesmo grupo podem virar 1 Pluton
              const isTectonPackage = reportData?.package.slug === 'tecton'
              return (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{listTitle}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-left">Usuário</th>
                          <th className="border p-2 text-center">Quantidade de Pacotes</th>
                          {isTectonPackage && (
                            <th className="border p-2 text-center">Upgrade para Pluton</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((user, index) => (
                          <tr key={user.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border p-2">
                              <a
                                href={`/admin/usuarios/${user.userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                {user.userName}
                              </a>
                            </td>
                            <td className="border p-2 text-center">
                              <Badge variant="default">{user.packagesCount}</Badge>
                            </td>
                            {isTectonPackage && (
                              <td className="border p-2 text-center">
                                {user.packagesCount >= 5 ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpgradeToPluton(user.userId)}
                                    disabled={upgradingToPluton[user.userId] || false}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                  >
                                    {upgradingToPluton[user.userId] ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Processando...
                                      </>
                                    ) : (
                                      <>
                                        <CircleArrowUp className="h-4 w-4 mr-2" />
                                        Upgrade → Pluton
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-gray-500">
                                    Mínimo 5 Tecton
                                  </Badge>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }

            if (filterType && usersList.length === 0) {
              return (
                <div className="text-center p-8 text-gray-500">
                  <p>Nenhum usuário encontrado para este filtro.</p>
                </div>
              )
            }

            return null
          })()}
        </CardContent>
      </Card>

      {/* Lista de Pacotes Inativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <span>Pacotes Inativos</span>
            <Badge variant="secondary">{stats.inactivePackages} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={loadInactivePackages}
                  disabled={loadingInactive}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingInactive ? 'animate-spin' : ''}`} />
                  Aplicar Filtros
                </Button>
              </div>
            </div>
            {(startDate || endDate) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {startDate && endDate && `Mostrando de ${dayjs(startDate).format('DD/MM/YYYY')} até ${dayjs(endDate).format('DD/MM/YYYY')}`}
                  {startDate && !endDate && `Mostrando a partir de ${dayjs(startDate).format('DD/MM/YYYY')}`}
                  {!startDate && endDate && `Mostrando até ${dayjs(endDate).format('DD/MM/YYYY')}`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          {/* Tabela de Pacotes Inativos Agrupados por Usuário */}
          {loadingInactive ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando pacotes inativos...</p>
            </div>
          ) : groupedInactiveUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Usuário</th>
                    <th className="border p-2 text-center">Quantidade de Pacotes</th>
                    <th className="border p-2 text-center">Data de Criação (Primeiro Pacote)</th>
                    {isSuperAdmin() && (
                      <th className="border p-2 text-center">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groupedInactiveUsers.map((user, index) => {
                    const firstPackage = user.packages[0]
                    const isSyncing = syncingCoupons[user.userId] || false
                    
                    return (
                      <tr key={user.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border p-2">
                          <a
                            href={`/admin/usuarios/${user.userId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {user.userName}
                          </a>
                          <p className="text-xs text-gray-500">{user.userEmail}</p>
                        </td>
                        <td className="border p-2 text-center">
                          <Badge variant="default" className="text-lg px-3 py-1">
                            {user.packagesCount}
                          </Badge>
                        </td>
                        <td className="border p-2 text-center">
                          {firstPackage && (
                            <span className="text-sm">
                              {dayjs(firstPackage.createdAt).format('DD/MM/YYYY HH:mm')}
                            </span>
                          )}
                        </td>
                        {isSuperAdmin() && (
                          <td className="border p-2 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleSyncCoupons(user.userId)}
                              disabled={isSyncing}
                              variant="outline"
                            >
                              {isSyncing ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sincronizando...
                                </>
                              ) : (
                                <>
                                  <PackageCheck className="h-4 w-4 mr-2" />
                                  Sincronizar Cupons
                                </>
                              )}
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-600">
                Mostrando {groupedInactiveUsers.length} usuário{groupedInactiveUsers.length !== 1 ? 's' : ''} com pacotes inativos
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <XCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum pacote inativo encontrado</p>
              {(startDate || endDate) && (
                <p className="text-sm mt-2">Tente ajustar os filtros de data</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Eye, EyeOff, Package, Users, DollarSign, Target, TrendingUp, Filter, Percent, Gift, RefreshCw, Shield, CreditCard, Building2, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Package {
  id: number
  name: string
  description: string | null
  price: number
  points: number
  isActive: boolean
  isUnilevel?: boolean
  slug?: string | null
  cycleBonus: number
  dailyCycles: number
  totalCycles: number
  profitSharePercent: number
  percentExtra: number
  directBonus: number
  reactivationAmount: number
  reactivationBonus: number
  maxQuantity: number
  maxInstallments: number
  generatesCouponOnPurchase: boolean
  visibleOnlyForActiveUsers: boolean
  clube300Eligible: boolean
  clube300Cotas: number
  clube300CashbackPercent: number
  binaryBonusPercent: number
  binaryBonusDailyLimit: number
  createdAt: string
  updatedAt: string
  activeUsersCount?: number
  miners?: Array<{
    id: number
    name: string
  }>
}

interface MinerOption {
  id: number
  name: string
}

const DEFAULT_FORM = {
  name: '',
  description: '',
  price: 0,
  points: 0,
  profitSharePercent: 0,
  percentExtra: 0,
  directBonus: 0,
  reactivationAmount: 0,
  reactivationBonus: 0,
  maxQuantity: 50,
  maxInstallments: 6,
  generatesCouponOnPurchase: false,
  visibleOnlyForActiveUsers: false,
  clube300Eligible: false,
  clube300Cotas: 0,
  clube300CashbackPercent: 0,
  minerIds: [] as number[],
  slug: '',
  isActive: true
}

export default function AdminPacotesPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loadingMiners, setLoadingMiners] = useState(false)
  const [formData, setFormData] = useState(DEFAULT_FORM)

  // Carregar pacotes
  const loadPackages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/packages?includeUserCount=true')
      const result = await response.json()
      
      if (result.success) {
        setPackages(result.data)
      } else {
        toast.error('Erro ao carregar pacotes')
      }
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error)
      toast.error('Erro ao carregar pacotes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [])

  const loadMiners = useCallback(async () => {
    try {
      setLoadingMiners(true)
      const response = await fetch('/api/miners')
      const result = await response.json()

      if (response.ok && result.success) {
        setMiners(result.data.map((miner: { id: string; name: string }) => ({
          id: Number(miner.id),
          name: miner.name
        })))
      } else {
        toast.error(result.error || 'Erro ao carregar mineradoras')
      }
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setLoadingMiners(false)
    }
  }, [])

  useEffect(() => {
    loadMiners()
  }, [loadMiners])

  const handleOpenCreate = () => {
    setEditingPackage(null)
    setFormData(DEFAULT_FORM)
    loadMiners()
    setIsEditDialogOpen(true)
  }

  const handleOpenEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      points: pkg.points,
      profitSharePercent: pkg.profitSharePercent,
      percentExtra: pkg.percentExtra ?? 0,
      directBonus: pkg.directBonus ?? 0,
      reactivationAmount: pkg.reactivationAmount ?? 0,
      reactivationBonus: pkg.reactivationBonus ?? 0,
      maxQuantity: pkg.maxQuantity ?? 50,
      maxInstallments: pkg.maxInstallments ?? 6,
      generatesCouponOnPurchase: pkg.generatesCouponOnPurchase ?? false,
      visibleOnlyForActiveUsers: pkg.visibleOnlyForActiveUsers ?? false,
      clube300Eligible: pkg.clube300Eligible ?? false,
      clube300Cotas: pkg.clube300Cotas ?? 0,
      clube300CashbackPercent: pkg.clube300CashbackPercent ?? 0,
      minerIds: pkg.miners?.map((miner) => miner.id) ?? [],
      slug: pkg.slug || '',
      isActive: pkg.isActive
    })
    loadMiners()
    setIsEditDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsEditDialogOpen(false)
    setEditingPackage(null)
    setFormData(DEFAULT_FORM)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do pacote é obrigatório')
      return
    }
    if (formData.price <= 0) {
      toast.error('Preço deve ser maior que zero')
      return
    }
    if (formData.points <= 0) {
      toast.error('Pontos devem ser maiores que zero')
      return
    }

    try {
      setSaving(true)

      const isEdit = editingPackage !== null
      const response = await fetch('/api/admin/packages', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingPackage.id, ...formData } : formData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(isEdit ? 'Pacote atualizado com sucesso!' : 'Pacote criado com sucesso!')
        handleCloseDialog()
        loadPackages()
      } else {
        toast.error(result.error || (isEdit ? 'Erro ao atualizar pacote' : 'Erro ao criar pacote'))
      }
    } catch (error) {
      console.error('Erro ao salvar pacote:', error)
      toast.error('Erro ao salvar pacote')
    } finally {
      setSaving(false)
    }
  }

  // Alternar status ativo/inativo
  const handleToggleStatus = async (pkg: Package) => {
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: pkg.id,
          isActive: !pkg.isActive
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Pacote R${!pkg.isActive ? 'ativado' : 'desativado'} com sucesso!`)
        loadPackages()
      } else {
        toast.error(result.error || 'Erro ao alterar status do pacote')
      }
    } catch (error) {
      console.error('Erro ao alterar status do pacote:', error)
      toast.error('Erro ao alterar status do pacote')
    }
  }



  const filteredPackages = packages.filter((pkg) => {
    if (statusFilter === 'active') return pkg.isActive
    if (statusFilter === 'inactive') return !pkg.isActive
    return true
  })

  // Formatar percentual
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const toggleMinerSelection = (minerId: number) => {
    setFormData((prev) => {
      const isSelected = prev.minerIds.includes(minerId)
      return {
        ...prev,
        minerIds: isSelected
          ? prev.minerIds.filter((id) => id !== minerId)
          : [...prev.minerIds, minerId]
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pacotes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Pacotes</h1>
          <p className="text-gray-600 mt-2">Gerencie os pacotes disponíveis na plataforma</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'active' | 'inactive' | 'all')}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-500" />
            <span className="text-sm text-gray-500">
              {filteredPackages.length} de {packages.length} pacote{packages.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total de Pacotes</p>
                <p className="text-2xl font-bold">{packages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Pacotes Ativos</p>
                <p className="text-2xl font-bold">{packages.filter(p => p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <EyeOff className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Pacotes Inativos</p>
                <p className="text-2xl font-bold">{packages.filter(p => !p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold">
                  {packages.reduce((total, pkg) => total + (pkg.activeUsersCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pacotes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPackages.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhum pacote encontrado</p>
            <p className="text-sm mt-1">Tente alterar o filtro de status</p>
          </div>
        )}
        {filteredPackages.map((pkg) => (
          <Card key={pkg.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{pkg.name}</CardTitle>
                <Badge variant={pkg.isActive ? "default" : "secondary"}>
                  {pkg.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {pkg.description && (
                <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Preço e Pontos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Preço</p>
                  <p className="font-bold text-blue-600">{formatCurrency(pkg.price)}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Pontos</p>
                  <p className="font-bold text-green-600">{pkg.points.toLocaleString()}</p>
                </div>
              </div>

              {/* Bonificações Unilevel */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-emerald-50 rounded">
                  <Gift className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Bônus Direto</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(pkg.directBonus ?? 0)}</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <TrendingUp className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">% Lucros</p>
                  <p className="font-semibold text-orange-600">{formatPercent(pkg.profitSharePercent)}</p>
                </div>
              </div>

              {/* Reativação */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-violet-50 rounded">
                  <RefreshCw className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Reativação</p>
                  <p className="font-semibold text-violet-600">{formatCurrency(pkg.reactivationAmount ?? 0)}</p>
                </div>
                <div className="text-center p-2 bg-violet-50 rounded">
                  <RefreshCw className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Bônus Reativ.</p>
                  <p className="font-semibold text-violet-600">{formatCurrency(pkg.reactivationBonus ?? 0)}</p>
                </div>
              </div>

              {/* Percentual Extra */}
              {(pkg.percentExtra ?? 0) > 0 && (
                <div className="text-center p-2 bg-amber-50 rounded">
                  <Percent className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">% Extra 1ª Divisão</p>
                  <p className="font-semibold text-amber-600">{formatPercent(pkg.percentExtra ?? 0)}</p>
                </div>
              )}

              {/* Configurações */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-slate-50 rounded">
                  <p className="text-xs text-gray-600">Qtd. Máx.</p>
                  <p className="font-semibold text-slate-700">{pkg.maxQuantity ?? 50}</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded">
                  <CreditCard className="h-4 w-4 text-slate-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Parcelas</p>
                  <p className="font-semibold text-slate-700">{pkg.maxInstallments ?? 6}x</p>
                </div>
              </div>

              {/* Clube 300 */}
              {pkg.clube300Eligible && (
                <div className="text-center p-2 bg-cyan-50 rounded">
                  <Shield className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Clube 300</p>
                  <p className="font-semibold text-cyan-600">
                    {pkg.clube300Cotas ?? 0} cota(s) • {(pkg.clube300CashbackPercent ?? 0)}% cashback
                  </p>
                </div>
              )}

              {/* Slug e modelo */}
              <div className="flex flex-wrap gap-2">
                {pkg.slug && (
                  <Badge variant="outline" className="text-xs">
                    {pkg.slug}
                  </Badge>
                )}
                {pkg.isUnilevel && (
                  <Badge variant="outline" className="text-xs">
                    Unilevel
                  </Badge>
                )}
                {pkg.generatesCouponOnPurchase && (
                  <Badge variant="outline" className="text-xs">
                    Gera cupom
                  </Badge>
                )}
                {(pkg.miners?.length ?? 0) > 0 && (
                  pkg.miners?.map((miner) => (
                    <Badge key={miner.id} variant="outline" className="text-xs">
                      {miner.name}
                    </Badge>
                  ))
                )}
              </div>

              {/* Usuários Ativos */}
              {pkg.activeUsersCount !== undefined && (
                <div 
                  className="text-center p-2 bg-yellow-50 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => router.push(`/admin/pacotes/${pkg.id}/relatorio`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push(`/admin/pacotes/${pkg.id}/relatorio`)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver relatório detalhado de usuários do pacote ${pkg.name}`}
                >
                  <Users className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Usuários Ativos</p>
                  <p className="font-semibold text-yellow-600">{pkg.activeUsersCount}</p>
                  <p className="text-xs text-yellow-600 mt-1">Clique para ver relatório</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(pkg)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant={pkg.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleToggleStatus(pkg)}
                  className="flex-1"
                >
                  {pkg.isActive ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? `Editar Pacote: ${editingPackage.name}` : 'Novo Pacote'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Pacote *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: AdCentral"
                />
              </div>
              
              <div>
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="100.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do pacote..."
                rows={3}
              />
            </div>

            {/* Pontuação */}
            <div>
              <Label htmlFor="points">Pontos *</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                placeholder="5000"
              />
            </div>

            {/* Bonificações Unilevel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="directBonus">Bônus Direto (R$)</Label>
                <Input
                  id="directBonus"
                  type="number"
                  step="0.01"
                  value={formData.directBonus}
                  onChange={(e) => setFormData({ ...formData, directBonus: parseFloat(e.target.value) || 0 })}
                  placeholder="200.00"
                />
              </div>
              <div>
                <Label htmlFor="reactivationAmount">Reativação (R$)</Label>
                <Input
                  id="reactivationAmount"
                  type="number"
                  step="0.01"
                  value={formData.reactivationAmount}
                  onChange={(e) => setFormData({ ...formData, reactivationAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="69.90"
                />
              </div>
              <div>
                <Label htmlFor="reactivationBonus">Bônus Reativação (R$)</Label>
                <Input
                  id="reactivationBonus"
                  type="number"
                  step="0.01"
                  value={formData.reactivationBonus}
                  onChange={(e) => setFormData({ ...formData, reactivationBonus: parseFloat(e.target.value) || 0 })}
                  placeholder="3.00"
                />
              </div>
            </div>

            {/* Percentuais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profitSharePercent">Participação de Lucro (%)</Label>
                <Input
                  id="profitSharePercent"
                  type="number"
                  step="0.01"
                  value={formData.profitSharePercent}
                  onChange={(e) => setFormData({ ...formData, profitSharePercent: parseFloat(e.target.value) || 0 })}
                  placeholder="5.00"
                />
              </div>
              <div>
                <Label htmlFor="percentExtra">Percentual Extra 1ª Divisão (%)</Label>
                <Input
                  id="percentExtra"
                  type="number"
                  step="0.01"
                  value={formData.percentExtra}
                  onChange={(e) => setFormData({ ...formData, percentExtra: parseFloat(e.target.value) || 0 })}
                  placeholder="13.00"
                />
              </div>
            </div>

            {/* Configurações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxQuantity">Quantidade Máxima</Label>
                <Input
                  id="maxQuantity"
                  type="number"
                  value={formData.maxQuantity}
                  onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1 })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="maxInstallments">Parcelas Máximas</Label>
                <Input
                  id="maxInstallments"
                  type="number"
                  value={formData.maxInstallments}
                  onChange={(e) => setFormData({ ...formData, maxInstallments: parseInt(e.target.value) || 6 })}
                  placeholder="12"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="nucleo"
              />
            </div>

            {/* Mineradoras disponíveis */}
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Mineradoras disponíveis para este pacote
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadMiners()}
                    disabled={loadingMiners}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingMiners ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button type="button" size="sm" onClick={() => router.push('/admin/mineradoras')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Cadastrar mineradora
                  </Button>
                </div>
              </div>
              {loadingMiners ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Carregando mineradoras...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {miners.length === 0 && (
                    <div className="col-span-full space-y-2">
                      <p className="text-sm text-gray-500">
                        Nenhuma mineradora cadastrada.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/admin/mineradoras')}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Ir para Mineradoras e cadastrar
                      </Button>
                    </div>
                  )}
                  {miners.map((miner) => {
                    const checked = formData.minerIds.includes(miner.id)
                    return (
                      <label
                        key={miner.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMinerSelection(miner.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-gray-700">{miner.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Clube 300 */}
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <p className="text-sm font-medium text-slate-700">Clube 300</p>
              <div className="flex items-center space-x-2">
                <Switch
                  id="clube300Eligible"
                  checked={formData.clube300Eligible}
                  onCheckedChange={(checked) => setFormData({ ...formData, clube300Eligible: checked })}
                />
                <Label htmlFor="clube300Eligible">Elegível ao Clube 300</Label>
              </div>
              {formData.clube300Eligible && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="clube300Cotas">Cotas</Label>
                    <Input
                      id="clube300Cotas"
                      type="number"
                      value={formData.clube300Cotas}
                      onChange={(e) => setFormData({ ...formData, clube300Cotas: parseInt(e.target.value) || 0 })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clube300CashbackPercent">Cashback (%)</Label>
                    <Input
                      id="clube300CashbackPercent"
                      type="number"
                      step="0.01"
                      value={formData.clube300CashbackPercent}
                      onChange={(e) => setFormData({ ...formData, clube300CashbackPercent: parseFloat(e.target.value) || 0 })}
                      placeholder="2.50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Gera cupom */}
            <div className="flex items-center space-x-2">
              <Switch
                id="generatesCouponOnPurchase"
                checked={formData.generatesCouponOnPurchase}
                onCheckedChange={(checked) => setFormData({ ...formData, generatesCouponOnPurchase: checked })}
              />
              <Label htmlFor="generatesCouponOnPurchase">Gera cupom na compra</Label>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Pacote Ativo</Label>
            </div>

            {/* Visibilidade restrita */}
            <div className="flex items-center space-x-2">
              <Switch
                id="visibleOnlyForActiveUsers"
                checked={formData.visibleOnlyForActiveUsers}
                onCheckedChange={(checked) => setFormData({ ...formData, visibleOnlyForActiveUsers: checked })}
              />
              <Label htmlFor="visibleOnlyForActiveUsers">
                Visível somente para usuários com pacote ativo
              </Label>
            </div>

            {/* Ações */}
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={saving}
              >
                {saving
                  ? 'Salvando...'
                  : editingPackage
                    ? 'Salvar Alterações'
                    : 'Criar Pacote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
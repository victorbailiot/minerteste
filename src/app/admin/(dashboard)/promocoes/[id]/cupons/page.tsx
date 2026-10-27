'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Ticket, Search, Download, Sparkles, Trophy, Plus, X, User, ShieldCheck } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface Coupon {
  id: string
  promotionId: string
  userId: string
  luckyNumber: number
  isWinner: boolean
  wonAt: string | null
  sourceType: string
  notes: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Promotion {
  id: string
  title: string
}

interface UserSearchResult {
  id: number
  name: string
  email: string
  referralCode: string
}

export default function AdminPromocaoCuponsPage() {
  const params = useParams()
  const router = useRouter()
  const promotionId = params.id as string
  const { hasPermission } = usePermissions()

  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyWinner, setShowOnlyWinner] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  })

  // Estados do modal de concessão de cupons
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [quantity, setQuantity] = useState<string>('1')
  const [notes, setNotes] = useState('')
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isGeneratingCoupons, setIsGeneratingCoupons] = useState(false)

  const loadPromotion = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/promotions/${promotionId}`)
      const result = await response.json()

      if (result.success) {
        setPromotion(result.data)
      } else {
        toast.error('Erro ao carregar promoção')
        router.push('/admin/promocoes')
      }
    } catch (error) {
      console.error('Erro ao carregar promoção:', error)
      toast.error('Erro ao carregar promoção')
    }
  }, [promotionId, router])

  const loadCoupons = useCallback(async (page: number = 1, search: string = '', onlyWinner: boolean = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      if (onlyWinner) {
        params.append('showOnlyWinner', 'true')
      }

      const response = await fetch(`/api/admin/promotions/${promotionId}/coupons?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setCoupons(result.data)
        setPagination(result.pagination)
      } else {
        toast.error('Erro ao carregar cupons')
      }
    } catch (error) {
      console.error('Erro ao carregar cupons:', error)
      toast.error('Erro ao carregar cupons')
    } finally {
      setLoading(false)
    }
  }, [promotionId])

  const handleSearch = () => {
    setIsSearching(true)
    loadCoupons(1, searchTerm, showOnlyWinner).finally(() => {
      setIsSearching(false)
    })
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setShowOnlyWinner(false)
    loadCoupons(1, '', false)
  }

  const handleToggleWinner = () => {
    const newValue = !showOnlyWinner
    setShowOnlyWinner(newValue)
    loadCoupons(1, searchTerm, newValue)
  }

  useEffect(() => {
    loadPromotion()
    loadCoupons()
  }, [loadPromotion, loadCoupons])

  // Buscar usuários com debounce
  useEffect(() => {
    if (!isGenerateModalOpen || userSearchQuery.trim().length < 2) {
      setUserSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchUsers(userSearchQuery.trim())
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [userSearchQuery, isGenerateModalOpen])

  const searchUsers = async (query: string) => {
    try {
      setIsSearchingUsers(true)
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(query)}`)
      const result = await response.json()

      if (result.success) {
        setUserSearchResults(result.data || [])
      } else {
        toast.error('Erro ao buscar usuários')
        setUserSearchResults([])
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      toast.error('Erro ao buscar usuários')
      setUserSearchResults([])
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const handleClearUserSelection = () => {
    setSelectedUser(null)
    setUserSearchQuery('')
    setUserSearchResults([])
    setNotes('')
  }

  const handleGenerateCoupons = async () => {
    if (!selectedUser) {
      toast.error('Selecione um usuário')
      return
    }

    const qtyNum = parseInt(quantity)
    if (!quantity || isNaN(qtyNum) || qtyNum < 1 || qtyNum > 100) {
      toast.error('Selecione uma quantidade válida entre 1 e 100')
      return
    }

    try {
      setIsGeneratingCoupons(true)
      const response = await fetch(`/api/admin/promotions/${promotionId}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id.toString(),
          quantity: qtyNum,
          notes: notes.trim() || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || `${qtyNum} número(s) da sorte gerado(s) com sucesso!`)
        setIsGenerateModalOpen(false)
        handleClearUserSelection()
        setQuantity('1')
        loadCoupons(pagination.page, searchTerm, showOnlyWinner)
      } else {
        toast.error(result.error || 'Erro ao gerar cupons')
      }
    } catch (error) {
      console.error('Erro ao gerar cupons:', error)
      toast.error('Erro ao gerar cupons')
    } finally {
      setIsGeneratingCoupons(false)
    }
  }

  const handleCloseModal = () => {
    setIsGenerateModalOpen(false)
    handleClearUserSelection()
    setQuantity('1')
  }

  // Exportar lista para Sorteador Externo em formato CSV
  const handleExportCSV = async () => {
    try {
      toast.info('Gerando arquivo CSV para o sorteador...')
      window.open(`/api/admin/promotions/${promotionId}/coupons?exportCsv=true`, '_blank')
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
      toast.error('Erro ao baixar arquivo de cupons')
    }
  }

  const renderSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'AUTOMATIC_UPGRADE':
        return <Badge className="bg-amber-600 hover:bg-amber-700">Upgrade Automático</Badge>
      case 'AUTOMATIC_PURCHASE':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Compra Automática</Badge>
      case 'MANUAL_ADMIN':
        return <Badge className="bg-slate-700 hover:bg-slate-800">Atribuição Manual</Badge>
      default:
        return <Badge variant="outline">Automático</Badge>
    }
  }

  if (loading && !promotion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/promocoes')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Promoções
        </Button>
        <h1 className="text-3xl font-bold">Gerenciamento de Cupons - {promotion?.title}</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-gray-600">Total Emitido: <strong className="text-gray-900">{pagination.total}</strong> números da sorte</p>
          {coupons.some(c => c.isWinner) && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
              <Trophy className="h-4 w-4 text-green-600" />
              Sorteio Realizado
            </div>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>Números da Sorte Registrados</CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch()
                    }}
                    className="pl-10 pr-4 w-64"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || loading} variant="default" className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Button>
                {(searchTerm.trim() || showOnlyWinner) && (
                  <Button onClick={handleClearSearch} variant="outline" className="gap-2" disabled={isSearching || loading}>
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>

              <Button
                onClick={handleToggleWinner}
                variant={showOnlyWinner ? "default" : "outline"}
                className={`gap-2 ${showOnlyWinner ? 'bg-green-600 hover:bg-green-700' : ''}`}
                disabled={isSearching || loading}
              >
                <Trophy className="h-4 w-4" />
                {showOnlyWinner ? 'Mostrar Todos' : 'Apenas Ganhadores'}
              </Button>

              <Button onClick={handleExportCSV} variant="outline" className="gap-2 border-green-600 text-green-700 hover:bg-green-50">
                <Download className="h-4 w-4 text-green-600" />
                Exportar CSV para Sorteio
              </Button>

              <Button
                onClick={() => setIsGenerateModalOpen(true)}
                variant="default"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Atribuir Números Manualmente
              </Button>

              {hasPermission('promotions.draw') && (
                <Button
                  onClick={() => router.push(`/admin/promocoes/${promotionId}/sorteio`)}
                  className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Painel de Sorteio
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm.trim() || showOnlyWinner
                  ? 'Nenhum número da sorte encontrado com os filtros aplicados'
                  : 'Nenhum número da sorte emitido nesta promoção ainda'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      <th className="text-left p-3">Número da Sorte</th>
                      <th className="text-left p-3">Usuário / Participante</th>
                      <th className="text-left p-3">Origem da Emissão</th>
                      <th className="text-left p-3">Data de Emissão</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr
                        key={coupon.id}
                        className={`border-b transition-colors ${
                          coupon.isWinner
                            ? 'bg-green-50 hover:bg-green-100 border-green-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-3">
                          <Badge
                            variant="default"
                            className={`text-base font-mono font-bold px-3 py-1 ${
                              coupon.isWinner
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-900'
                            }`}
                          >
                            #{coupon.luckyNumber}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div>
                            <Link
                              href={`/admin/usuarios/${coupon.user.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-semibold hover:underline ${
                                coupon.isWinner
                                  ? 'text-green-800'
                                  : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              {coupon.user.name}
                            </Link>
                            <p className="text-xs text-gray-500">{coupon.user.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {renderSourceBadge(coupon.sourceType)}
                            {coupon.notes && (
                              <p className="text-xs text-gray-500 italic max-w-xs truncate" title={coupon.notes}>
                                {coupon.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(coupon.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-3 text-center">
                          {coupon.isWinner ? (
                            <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                              <Trophy className="h-3 w-3" />
                              GANHADOR
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Elegível
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadCoupons(pagination.page - 1, searchTerm, showOnlyWinner)}
                    disabled={!pagination.hasPrev || loading}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} cupons)
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => loadCoupons(pagination.page + 1, searchTerm, showOnlyWinner)}
                    disabled={!pagination.hasNext || loading}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Concessão Manual de Números da Sorte */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-600" />
              Atribuir Números da Sorte Manualmente
            </DialogTitle>
            <DialogDescription>
              Selecione um participante e a quantidade de números da sorte a serem emitidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Usuário *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  id="user-search"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Digite nome, e-mail ou código de indicação..."
                  className="pl-9 pr-9"
                  disabled={isSearchingUsers || !!selectedUser || isGeneratingCoupons}
                  autoComplete="off"
                />
                {selectedUser && (
                  <button
                    type="button"
                    onClick={handleClearUserSelection}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isGeneratingCoupons}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!selectedUser && userSearchQuery.length >= 2 && (
                <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
                  {isSearchingUsers ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Buscando usuários...
                    </div>
                  ) : userSearchResults.length > 0 ? (
                    <div className="divide-y">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="w-full p-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
                          disabled={isGeneratingCoupons}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum usuário encontrado.
                    </div>
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-xs text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Números da Sorte a Gerar *
              </label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isGeneratingCoupons}
                required
              />
              <p className="text-xs text-gray-500 mt-1">O sistema irá gerar números únicos automaticamente.</p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Observação / Motivo da Concessão (opcional)
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Concessão por migração manual realizada em evento presencial"
                rows={2}
                disabled={isGeneratingCoupons}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={isGeneratingCoupons}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateCoupons}
              disabled={!selectedUser || !quantity || isGeneratingCoupons}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGeneratingCoupons ? 'Gerando Números...' : 'Confirmar e Emitir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

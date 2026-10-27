'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Ticket, Calendar, Shield, Image as ImageIcon } from 'lucide-react'
import PromotionForm from '@/components/admin/PromotionForm'
import PromotionsPermissionsGuide from '@/components/admin/PromotionsPermissionsGuide'

interface Promotion {
  id: string
  title: string
  description: string | null
  image: string | null
  startDate: string
  endDate: string
  isActive: boolean
  maxCoupons: number | null
  triggerType?: 'MANUAL' | 'PACKAGE_UPGRADE' | 'PACKAGE_PURCHASE'
  fromPackageId?: string | null
  toPackageId?: string | null
  upgradeRules?: Array<{ fromPackageId?: string | null; toPackageId: string }> | null
  sponsorExtraBonusPercent?: number
  sponsorPrizeDescription?: string | null
  prizesDescription?: string | null
  couponsPerAction?: number
  createdAt: string
  updatedAt: string
  couponsCount?: number
}

export default function AdminPromocoesPage() {
  const router = useRouter()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/promotions?includeCoupons=true')
      const result = await response.json()
      
      if (result.success) {
        setPromotions(result.data)
      } else {
        toast.error('Erro ao carregar promoções')
      }
    } catch (error) {
      console.error('Erro ao carregar promoções:', error)
      toast.error('Erro ao carregar promoções')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  const handleCreate = () => {
    setEditingPromotion(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta promoção? Todos os cupons associados serão deletados.')) {
      return
    }

    try {
      setDeletingId(id)
      const response = await fetch(`/api/admin/promotions/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Promoção deletada com sucesso')
        loadPromotions()
      } else {
        toast.error(result.error || 'Erro ao deletar promoção')
      }
    } catch (error) {
      console.error('Erro ao deletar promoção:', error)
      toast.error('Erro ao deletar promoção')
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewCoupons = (id: string) => {
    router.push(`/admin/promocoes/${id}/cupons`)
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingPromotion(null)
    loadPromotions()
  }

  const isActive = (promotion: Promotion) => {
    const now = new Date()
    const startDate = new Date(promotion.startDate)
    const endDate = new Date(promotion.endDate)
    return promotion.isActive && now >= startDate && now <= endDate
  }

  const getStatusBadge = (promotion: Promotion) => {
    if (!promotion.isActive) {
      return <Badge variant="secondary">Inativa</Badge>
    }

    const now = new Date()
    const startDate = new Date(promotion.startDate)
    const endDate = new Date(promotion.endDate)

    if (now < startDate) {
      return <Badge variant="outline">Agendada</Badge>
    }
    if (now > endDate) {
      return <Badge variant="destructive">Expirada</Badge>
    }
    return <Badge variant="default" className="bg-green-500">Ativa</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando promoções...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Promoções</h1>
          <p className="text-gray-600 mt-1">Gerencie promoções e cupons de sorteio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsGuideOpen(true)} 
            className="gap-2 text-slate-700 hover:text-slate-900 border-slate-200"
          >
            <Shield className="h-4 w-4 text-slate-500" />
            Permissões
          </Button>
          <Button onClick={handleCreate} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium">
            <Plus className="h-4 w-4" />
            Nova Promoção
          </Button>
        </div>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhuma promoção cadastrada</p>
            <Button onClick={handleCreate} variant="outline">
              Criar primeira promoção
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{promotion.title}</CardTitle>
                  {getStatusBadge(promotion)}
                </div>
              </CardHeader>
              <CardContent>
                {promotion.image && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={promotion.image}
                      alt={promotion.title}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                
                {promotion.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {promotion.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {new Date(promotion.startDate).toLocaleDateString('pt-BR')} - {new Date(promotion.endDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Ticket className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {promotion.couponsCount || 0} cupons gerados
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewCoupons(promotion.id)}
                    className="flex-1"
                  >
                    Ver Cupons
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(promotion)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(promotion.id)}
                    disabled={deletingId === promotion.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
      >
        <DialogContent className="w-full max-h-[92vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure os dados da campanha, gatilhos de pontuação e prêmios.
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <PromotionForm
              promotion={editingPromotion}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Guia de Permissões */}
      <PromotionsPermissionsGuide 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </div>
  )
}


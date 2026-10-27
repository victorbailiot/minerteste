'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  X, 
  Image as ImageIcon, 
  Gift, 
  Award, 
  Zap, 
  Sparkles, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  ShoppingBag, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Info,
  Layers,
  Plus,
  Trash2
} from 'lucide-react'

export interface UpgradeRuleItem {
  id: string
  fromPackageId: string
  toPackageId: string
}

interface PackageOption {
  id: string
  name: string
  price: number
}

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
}

interface PromotionFormProps {
  promotion: Promotion | null
  onSuccess: () => void
  onCancel: () => void
}

export default function PromotionForm({ promotion, onSuccess, onCancel }: PromotionFormProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [activeTab, setActiveTab] = useState<'general' | 'triggers' | 'rewards'>('general')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [upgradeRules, setUpgradeRules] = useState<UpgradeRuleItem[]>([
    { id: '1', fromPackageId: 'ALL', toPackageId: '' }
  ])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    startDate: '',
    endDate: '',
    isActive: true,
    maxCoupons: '' as string | number,
    triggerType: 'MANUAL' as 'MANUAL' | 'PACKAGE_UPGRADE' | 'PACKAGE_PURCHASE',
    fromPackageId: '' as string,
    toPackageId: '' as string,
    sponsorExtraBonusPercent: 0 as number,
    sponsorPrizeDescription: '',
    prizesDescription: '',
    couponsPerAction: 1 as number
  })

  // Carregar lista de pacotes para seleções de gatilho
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/unilevel/packages?isActive=true')
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setPackages(result.data.map((pkg: any) => ({
            id: pkg.id.toString(),
            name: pkg.name,
            price: Number(pkg.price)
          })))
        }
      } catch (err) {
        console.error('Erro ao carregar pacotes para formulário de promoção:', err)
      }
    }
    fetchPackages()
  }, [])

  useEffect(() => {
    if (promotion) {
      const startDate = new Date(promotion.startDate)
      const endDate = new Date(promotion.endDate)

      setFormData({
        title: promotion.title,
        description: promotion.description || '',
        image: promotion.image || '',
        startDate: startDate.toISOString().slice(0, 16),
        endDate: endDate.toISOString().slice(0, 16),
        isActive: promotion.isActive,
        maxCoupons: promotion.maxCoupons || '',
        triggerType: promotion.triggerType || 'MANUAL',
        fromPackageId: promotion.fromPackageId || '',
        toPackageId: promotion.toPackageId || '',
        sponsorExtraBonusPercent: promotion.sponsorExtraBonusPercent || 0,
        sponsorPrizeDescription: promotion.sponsorPrizeDescription || '',
        prizesDescription: promotion.prizesDescription || '',
        couponsPerAction: promotion.couponsPerAction || 1
      })

      if (promotion.upgradeRules && Array.isArray(promotion.upgradeRules) && promotion.upgradeRules.length > 0) {
        setUpgradeRules(
          promotion.upgradeRules.map((r, idx) => ({
            id: `rule-${idx}-${Date.now()}`,
            fromPackageId: r.fromPackageId ? String(r.fromPackageId) : 'ALL',
            toPackageId: r.toPackageId ? String(r.toPackageId) : ''
          }))
        )
      } else if (promotion.toPackageId) {
        setUpgradeRules([
          {
            id: 'rule-initial',
            fromPackageId: promotion.fromPackageId ? String(promotion.fromPackageId) : 'ALL',
            toPackageId: String(promotion.toPackageId)
          }
        ])
      } else {
        setUpgradeRules([{ id: 'rule-default', fromPackageId: 'ALL', toPackageId: '' }])
      }

      if (promotion.image) {
        setImagePreview(promotion.image)
      }
    } else {
      const now = new Date()
      const endMonth = new Date(now)
      endMonth.setDate(endMonth.getDate() + 30)

      setFormData({
        title: '',
        description: '',
        image: '',
        startDate: now.toISOString().slice(0, 16),
        endDate: endMonth.toISOString().slice(0, 16),
        isActive: true,
        maxCoupons: '',
        triggerType: 'MANUAL',
        fromPackageId: '',
        toPackageId: '',
        sponsorExtraBonusPercent: 0,
        sponsorPrizeDescription: '',
        prizesDescription: '',
        couponsPerAction: 1
      })
      setUpgradeRules([{ id: 'rule-new-1', fromPackageId: 'ALL', toPackageId: '' }])
    }
  }, [promotion])

  const handleAddUpgradeRule = () => {
    setUpgradeRules(prev => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fromPackageId: 'ALL',
        toPackageId: ''
      }
    ])
  }

  const handleRemoveUpgradeRule = (id: string) => {
    if (upgradeRules.length <= 1) {
      setUpgradeRules([{ id: 'rule-reset', fromPackageId: 'ALL', toPackageId: '' }])
      return
    }
    setUpgradeRules(prev => prev.filter(rule => rule.id !== id))
  }

  const handleUpdateUpgradeRule = (
    id: string,
    field: 'fromPackageId' | 'toPackageId',
    value: string
  ) => {
    setUpgradeRules(prev =>
      prev.map(rule => (rule.id === id ? { ...rule, [field]: value } : rule))
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo deve ser uma imagem')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadImage = async (): Promise<string | null> => {
    if (!selectedFile) {
      return formData.image || null
    }

    try {
      setUploadingImage(true)
      const uploadFormData = new FormData()
      uploadFormData.append('image', selectedFile)

      const response = await fetch('/api/admin/promotions/upload-image', {
        method: 'POST',
        body: uploadFormData
      })

      const result = await response.json()
      if (result.success) {
        return result.data.url
      } else {
        toast.error(result.error || 'Erro ao fazer upload da imagem')
        return null
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao fazer upload da imagem')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setActiveTab('general')
      toast.error('O título da promoção é obrigatório')
      return
    }

    if (!formData.startDate || !formData.endDate) {
      setActiveTab('general')
      toast.error('As datas de início e término são obrigatórias')
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)

    if (endDate <= startDate) {
      setActiveTab('general')
      toast.error('A data de término deve ser posterior à data de início')
      return
    }

    if (formData.triggerType === 'PACKAGE_UPGRADE') {
      if (upgradeRules.length === 0 || upgradeRules.some(r => !r.toPackageId)) {
        setActiveTab('triggers')
        toast.error('Selecione o pacote de destino em todas as regras de upgrade')
        return
      }
      const hasSamePackage = upgradeRules.some(
        r => r.fromPackageId && r.fromPackageId !== 'ALL' && r.fromPackageId === r.toPackageId
      )
      if (hasSamePackage) {
        setActiveTab('triggers')
        toast.error('O pacote de origem não pode ser igual ao pacote de destino em uma regra de upgrade')
        return
      }
    }

    if (formData.triggerType === 'PACKAGE_PURCHASE' && !formData.toPackageId) {
      setActiveTab('triggers')
      toast.error('Selecione o pacote adquirido para a promoção de compra')
      return
    }

    try {
      setLoading(true)

      let imageUrl = formData.image
      if (selectedFile) {
        const uploadedUrl = await handleUploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          setLoading(false)
          return
        }
      }

      const formattedUpgradeRules = formData.triggerType === 'PACKAGE_UPGRADE'
        ? upgradeRules.map(r => ({
            fromPackageId: r.fromPackageId && r.fromPackageId !== 'ALL' ? r.fromPackageId : null,
            toPackageId: r.toPackageId
          }))
        : null

      const firstUpgrade = formattedUpgradeRules?.[0]

      const url = promotion
        ? `/api/admin/promotions/${promotion.id}`
        : '/api/admin/promotions'

      const method = promotion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          image: imageUrl || null,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          maxCoupons: formData.maxCoupons === '' ? null : Number(formData.maxCoupons),
          fromPackageId: formData.triggerType === 'PACKAGE_UPGRADE'
            ? (firstUpgrade?.fromPackageId || null)
            : (formData.fromPackageId && formData.fromPackageId !== 'ALL' ? formData.fromPackageId : null),
          toPackageId: formData.triggerType === 'PACKAGE_UPGRADE'
            ? (firstUpgrade?.toPackageId || null)
            : (formData.toPackageId && formData.toPackageId !== 'ALL' ? formData.toPackageId : null),
          upgradeRules: formattedUpgradeRules
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(promotion ? 'Promoção atualizada com sucesso!' : 'Promoção criada com sucesso!')
        onSuccess()
      } else {
        toast.error(result.error || 'Erro ao salvar promoção')
      }
    } catch (error) {
      console.error('Erro ao salvar promoção:', error)
      toast.error('Erro ao salvar promoção')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* NAVEGAÇÃO POR ABAS COM DESIGN REFINADO */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <div className="border-b border-slate-100 pb-4">
          <TabsList className="grid grid-cols-3 w-full bg-slate-100/80 p-1 rounded-xl h-11 border border-slate-200/60">
            <TabsTrigger
              value="general"
              className="flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Geral & Mídia</span>
            </TabsTrigger>

            <TabsTrigger
              value="triggers"
              className="flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Gatilhos de Entrada</span>
            </TabsTrigger>

            <TabsTrigger
              value="rewards"
              className="flex items-center justify-center gap-2 rounded-lg font-medium text-xs sm:text-sm text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all cursor-pointer"
            >
              <Gift className="w-4 h-4 text-amber-500" />
              <span>Prêmios & Bônus</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ÁREA DE CONTEÚDO COM SCROLL SUAVE */}
        <div className="py-5 space-y-6">
          {/* Aba 1: Dados Gerais e Midia */}
          <TabsContent value="general" className="mt-0 space-y-5 focus-visible:outline-none">
            {/* Titulo */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Título da Campanha <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Campanha de Upgrade - 1º Trimestre"
                className="h-10 text-sm font-medium border-slate-200 focus-visible:ring-amber-500"
                required
              />
            </div>

            {/* Vigência (Datas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data de Início <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-10 text-sm border-slate-200 focus-visible:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data de Término <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-10 text-sm border-slate-200 focus-visible:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Status Ativo */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <Label htmlFor="isActive" className="text-sm font-semibold text-slate-900 cursor-pointer">
                  Promoção Ativa
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Habilita a exibição da campanha e a emissão de cupons.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Regulamento / Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Regulamento e Descrição
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Regulamento, condições de elegibilidade e orientações aos participantes..."
                rows={3}
                className="text-sm border-slate-200 focus-visible:ring-amber-500"
              />
            </div>

            {/* BANNER PROMOCIONAL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Banner da Campanha (Mídia)
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm group">
                  <img
                    src={imagePreview}
                    alt="Preview do banner"
                    className="w-full h-44 object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 cursor-pointer text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Substituir
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="gap-1.5 cursor-pointer text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-400 group-hover:text-amber-600 flex items-center justify-center mx-auto mb-2.5 transition-colors">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Clique para selecionar a imagem do banner
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos recomendados: PNG, JPG ou WEBP de até 5MB
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba 2: Gatilhos de Entrada */}
          <TabsContent value="triggers" className="mt-0 space-y-5 focus-visible:outline-none">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">Critério de Acionamento</h4>
              </div>
              <p className="text-xs text-slate-500">
                Defina como os números da sorte serão gerados para os participantes.
              </p>
            </div>

            {/* Cards de Seleção de Gatilho */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Manual */}
              <div
                onClick={() => setFormData({ ...formData, triggerType: 'MANUAL' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.triggerType === 'MANUAL'
                    ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    {formData.triggerType === 'MANUAL' && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-900">Manual</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Emissão manual pelo painel administrativo.
                  </p>
                </div>
              </div>

              {/* Card 2: Upgrade */}
              <div
                onClick={() => setFormData({ ...formData, triggerType: 'PACKAGE_UPGRADE' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.triggerType === 'PACKAGE_UPGRADE'
                    ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    {formData.triggerType === 'PACKAGE_UPGRADE' && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-900">Upgrade de Plano</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Disparado ao concluir upgrade de pacote.
                  </p>
                </div>
              </div>

              {/* Card 3: Compra */}
              <div
                onClick={() => setFormData({ ...formData, triggerType: 'PACKAGE_PURCHASE' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.triggerType === 'PACKAGE_PURCHASE'
                    ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    {formData.triggerType === 'PACKAGE_PURCHASE' && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-900">Adesão / Compra</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Disparado ao contratar um pacote elegível.
                  </p>
                </div>
              </div>
            </div>

            {/* Parâmetros de Upgrade (Múltiplos Pares) */}
            {formData.triggerType === 'PACKAGE_UPGRADE' && (
              <div className="p-4 sm:p-5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Regras de Upgrade
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selecione os pacotes de origem e destino elegíveis para a promoção.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs font-medium bg-white text-slate-700 border-slate-300">
                    {upgradeRules.length} {upgradeRules.length === 1 ? 'par configurado' : 'pares configurados'}
                  </Badge>
                </div>

                {/* Lista dinâmica de pares */}
                <div className="space-y-3">
                  {upgradeRules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-xs transition-all hover:border-slate-300 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/70">
                          Regra #{index + 1}
                        </span>

                        {upgradeRules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUpgradeRule(rule.id)}
                            className="h-7 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Remover</span>
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-3">
                        {/* Pacote de Origem */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                            Pacote de Origem
                          </Label>
                          <Select
                            value={rule.fromPackageId || 'ALL'}
                            onValueChange={(val) => handleUpdateUpgradeRule(rule.id, 'fromPackageId', val)}
                          >
                            <SelectTrigger className="bg-white border-slate-200 text-xs">
                              <SelectValue placeholder="Qualquer pacote ou escolha" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Qualquer Pacote (Qualquer Origem)</SelectItem>
                              {packages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id} className="text-xs">
                                  {pkg.name} (R$ {pkg.price.toFixed(2)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Seta Divisória no Desktop */}
                        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 mt-5 shrink-0">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        {/* Pacote de Destino */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                            Pacote de Destino (Novo Nível) <span className="text-rose-500">*</span>
                          </Label>
                          <Select
                            value={rule.toPackageId || undefined}
                            onValueChange={(val) => handleUpdateUpgradeRule(rule.id, 'toPackageId', val)}
                          >
                            <SelectTrigger className={`bg-white text-xs ${!rule.toPackageId ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
                              <SelectValue placeholder="Selecione o pacote promovido" />
                            </SelectTrigger>
                            <SelectContent>
                              {packages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id} className="text-xs">
                                  {pkg.name} (R$ {pkg.price.toFixed(2)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão Adicionar Par */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddUpgradeRule}
                  className="w-full py-2.5 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/70 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  Adicionar outro par de upgrade
                </Button>

                {/* Nota explicativa sucinta */}
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200/70">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Ao confirmar uma migração entre os pacotes configurados, os cupons são emitidos automaticamente.
                  </span>
                </div>
              </div>
            )}

            {/* Parâmetros de Compra Direta */}
            {formData.triggerType === 'PACKAGE_PURCHASE' && (
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="toPackageId" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Pacote Elegível para a Promoção <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.toPackageId || undefined}
                    onValueChange={(val) => setFormData({ ...formData, toPackageId: val })}
                  >
                    <SelectTrigger id="toPackageId" className="bg-white border-slate-200">
                      <SelectValue placeholder="Selecione o pacote comprado" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} (R$ {pkg.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Quantidade de Cupons */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="couponsPerAction" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Cupons por Operação
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="couponsPerAction"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.couponsPerAction}
                  onChange={(e) => setFormData({ ...formData, couponsPerAction: parseInt(e.target.value) || 1 })}
                  className="w-32 h-10 border-slate-200 font-bold"
                />
                <p className="text-xs text-slate-500">
                  Quantidade de números da sorte emitidos por transação elegível.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Aba 3: Premiação & Bônus do Patrocinador */}
          <TabsContent value="rewards" className="mt-0 space-y-5 focus-visible:outline-none">
            {/* Prêmios da Campanha */}
            <div className="space-y-1.5">
              <Label htmlFor="prizesDescription" className="text-xs font-semibold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-500" />
                Descrição dos Prêmios
              </Label>
              <Textarea
                id="prizesDescription"
                value={formData.prizesDescription}
                onChange={(e) => setFormData({ ...formData, prizesDescription: e.target.value })}
                placeholder="Ex: Premiação especial aos contemplados conforme regulamento"
                rows={3}
                className="text-sm border-slate-200 focus-visible:ring-amber-500"
              />
              <p className="text-xs text-slate-500">
                Texto exibido aos participantes na página da promoção.
              </p>
            </div>

            {/* Seção Bonificação Extra para Patrocinador */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Bonificação para o Indicador (Patrocinador)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sponsorExtraBonusPercent" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Bônus Adicional de Indicação (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="sponsorExtraBonusPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.sponsorExtraBonusPercent}
                      onChange={(e) => setFormData({ ...formData, sponsorExtraBonusPercent: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-10 pr-8 border-slate-200 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Percentual adicional creditado ao patrocinador direto.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sponsorPrizeDescription" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Prêmio do Patrocinador (Opcional)
                  </Label>
                  <Input
                    id="sponsorPrizeDescription"
                    value={formData.sponsorPrizeDescription}
                    onChange={(e) => setFormData({ ...formData, sponsorPrizeDescription: e.target.value })}
                    placeholder="Ex: Bonificação física ou brinde corporativo"
                    className="h-10 border-slate-200 font-medium"
                  />
                  <p className="text-xs text-slate-500">
                    Item ou premiação física destinada ao patrocinador.
                  </p>
                </div>
              </div>
            </div>

            {/* Limite Total de Cupons */}
            <div className="space-y-1.5">
              <Label htmlFor="maxCoupons" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Limite Máximo de Cupons (Opcional)
              </Label>
              <Input
                id="maxCoupons"
                type="number"
                min="1"
                value={formData.maxCoupons}
                onChange={(e) => setFormData({ ...formData, maxCoupons: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                placeholder="Deixe em branco para ilimitado"
                className="h-10 border-slate-200 text-sm max-w-sm"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* FOOTER FIXO COM AÇÕES */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto bg-white">
        <div className="flex items-center gap-2">
          {activeTab !== 'general' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'rewards') setActiveTab('triggers')
                else if (activeTab === 'triggers') setActiveTab('general')
              }}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>
          )}

          {activeTab !== 'rewards' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'general') setActiveTab('triggers')
                else if (activeTab === 'triggers') setActiveTab('rewards')
              }}
              className="gap-1.5 cursor-pointer text-xs"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading || uploadingImage}
            className="cursor-pointer text-xs text-slate-600"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={loading || uploadingImage}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-sm text-xs px-4"
          >
            {uploadingImage
              ? 'Enviando imagem...'
              : loading
              ? 'Salvando...'
              : promotion
              ? 'Salvar Alterações'
              : 'Criar Promoção'}
          </Button>
        </div>
      </div>
    </form>
  )
}

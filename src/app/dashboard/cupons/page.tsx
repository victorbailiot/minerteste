'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  FileText,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  HelpCircle,
  History,
  ShieldCheck,
  Layers,
  ChevronRight
} from 'lucide-react'

interface UserCoupon {
  id: string
  luckyNumber: number
  isWinner: boolean
  wonAt: string | null
  sourceType: string
  notes: string | null
  createdAt: string
}

interface PromotionHubItem {
  id: string
  title: string
  description: string | null
  image: string | null
  startDate: string
  endDate: string
  isActive: boolean
  isCurrentlyActive: boolean
  triggerType: string
  prizesDescription: string | null
  sponsorPrizeDescription: string | null
  sponsorExtraBonusPercent: number
  upgradeRules: any
  userCoupons: UserCoupon[]
  userCouponsCount: number
  totalCampaignCouponsCount: number
}

interface FlatCoupon extends UserCoupon {
  promotionId: string
  promotionTitle: string
  isPromotionActive: boolean
  promotionEndDate: string
}

interface HubData {
  summary: {
    totalUserCoupons: number
    totalWinningCoupons: number
    activeCampaignsCount: number
    endedCampaignsCount: number
  }
  activePromotions: PromotionHubItem[]
  endedPromotions: PromotionHubItem[]
  allUserCoupons: FlatCoupon[]
}

function CuponsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryId = searchParams.get('id') || searchParams.get('campanha')

  const [hubData, setHubData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'active' | 'ended' | 'all'>('active')
  const [selectedPromoId, setSelectedPromoId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadHubData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/promotions/hub')
      const json = await res.json()

      if (json.success && json.data) {
        setHubData(json.data)

        // Definir campanha selecionada inicial
        const allPromos = [...json.data.activePromotions, ...json.data.endedPromotions]
        if (queryId && allPromos.some(p => p.id === queryId)) {
          setSelectedPromoId(queryId)
          const isEnded = json.data.endedPromotions.some(p => p.id === queryId)
          if (isEnded) setMainTab('ended')
        } else if (json.data.activePromotions.length > 0) {
          setSelectedPromoId(json.data.activePromotions[0].id)
        } else if (json.data.endedPromotions.length > 0) {
          setSelectedPromoId(json.data.endedPromotions[0].id)
          setMainTab('ended')
        }
      } else {
        toast.error('Não foi possível carregar os cupons')
      }
    } catch (error) {
      console.error('Erro ao buscar hub de promoções:', error)
      toast.error('Erro de conexão ao carregar promoções')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHubData()
  }, [])

  useEffect(() => {
    if (queryId && hubData) {
      const allPromos = [...hubData.activePromotions, ...hubData.endedPromotions]
      if (allPromos.some(p => p.id === queryId)) {
        setSelectedPromoId(queryId)
        const isEnded = hubData.endedPromotions.some(p => p.id === queryId)
        if (isEnded) setMainTab('ended')
      }
    }
  }, [queryId, hubData])

  const currentPromotionList = mainTab === 'ended' 
    ? hubData?.endedPromotions || [] 
    : hubData?.activePromotions || []

  const activePromotion = useMemo(() => {
    if (!hubData) return null
    const list = mainTab === 'ended' ? hubData.endedPromotions : hubData.activePromotions
    const found = list.find(p => p.id === selectedPromoId)
    return found || list[0] || null
  }, [hubData, selectedPromoId, mainTab])

  const filteredAllCoupons = useMemo(() => {
    if (!hubData?.allUserCoupons) return []
    if (!searchTerm.trim()) return hubData.allUserCoupons

    const term = searchTerm.toLowerCase().trim().replace('#', '')
    return hubData.allUserCoupons.filter(c => 
      c.luckyNumber.toString().includes(term) ||
      c.promotionTitle.toLowerCase().includes(term) ||
      (c.sourceType && c.sourceType.toLowerCase().includes(term))
    )
  }, [hubData, searchTerm])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-gray-600">Carregando sua central de cupons e sorteios...</p>
      </div>
    )
  }

  const summary = hubData?.summary || {
    totalUserCoupons: 0,
    totalWinningCoupons: 0,
    activeCampaignsCount: 0,
    endedCampaignsCount: 0
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* ======================================================== */}
      {/* 1. CABEÇALHO PRINCIPAL & RESUMO EXECUTIVO (KPIs)         */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-medium px-2.5 py-0.5 text-xs">
                Sorteios & Premiações
              </Badge>
              {summary.totalWinningCoupons > 0 && (
                <Badge className="bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1">
                  <Award className="w-3 h-3" /> {summary.totalWinningCoupons} Contemplado(s)
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Central de Cupons e Promoções
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 max-w-2xl leading-relaxed">
              Consulte seus números da sorte acumulados, acompanhe as campanhas vigentes e confira os prêmios oficiais em disputa.
            </p>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-shrink-0">
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between min-w-[120px]">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Seus Números</span>
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                {summary.totalUserCoupons}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">Acumulados</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between min-w-[120px]">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium">Em Andamento</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {summary.activeCampaignsCount}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">Campanhas ativas</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between min-w-[120px] col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-medium">Histórico</span>
                <History className="w-4 h-4 text-gray-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-700">
                {summary.endedCampaignsCount}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">Encerradas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. NAVEGAÇÃO ENTRE ABAS PRINCIPAIS                      */}
      {/* ======================================================== */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px">
          <button
            onClick={() => {
              setMainTab('active')
              if (hubData?.activePromotions.length) {
                setSelectedPromoId(hubData.activePromotions[0].id)
              }
            }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              mainTab === 'active'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Campanhas Ativas
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              mainTab === 'active' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-gray-100 text-gray-600'
            }`}>
              {summary.activeCampaignsCount}
            </span>
          </button>

          <button
            onClick={() => {
              setMainTab('ended')
              if (hubData?.endedPromotions.length) {
                setSelectedPromoId(hubData.endedPromotions[0].id)
              }
            }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              mainTab === 'ended'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Campanhas Encerradas
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              mainTab === 'ended' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-gray-100 text-gray-600'
            }`}>
              {summary.endedCampaignsCount}
            </span>
          </button>

          <button
            onClick={() => setMainTab('all')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              mainTab === 'all'
                ? 'border-amber-600 text-amber-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Todos os Meus Números
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              mainTab === 'all' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-gray-100 text-gray-600'
            }`}>
              {summary.totalUserCoupons}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ABA: CAMPANHAS ATIVAS OU ENCERRADAS (VISÃO DE CAMPANHA)*/}
      {/* ======================================================== */}
      {(mainTab === 'active' || mainTab === 'ended') && (
        <div className="space-y-6">
          
          {/* Seletor de Campanhas (quando há mais de uma) */}
          {currentPromotionList.length > 1 && (
            <div className="bg-gray-100/80 p-2 rounded-xl flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 whitespace-nowrap">
                Campanhas:
              </span>
              {currentPromotionList.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPromoId(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activePromotion?.id === p.id
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <span>{p.title}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-gray-200 text-gray-700 font-mono">
                    {p.userCouponsCount} {p.userCouponsCount === 1 ? 'número' : 'números'}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Card Principal da Campanha Selecionada */}
          {!activePromotion ? (
            <Card className="border-dashed border-gray-300 bg-gray-50/50">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800">
                  {mainTab === 'active' ? 'Nenhuma campanha ativa no momento' : 'Nenhuma campanha encerrada com cupons'}
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  {mainTab === 'active'
                    ? 'Fique atento aos avisos oficiais para participar das próximas campanhas promocionais.'
                    : 'Suas participações anteriores em campanhas encerradas aparecerão aqui.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
              
              {/* Cabeçalho da Campanha */}
              <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
                
                {/* Imagem Oficial da Campanha (se houver) */}
                {activePromotion.image ? (
                  <div className="w-full lg:w-2/5 flex-shrink-0 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[220px] max-h-[320px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activePromotion.image}
                      alt={activePromotion.title}
                      className="w-full h-full object-contain max-h-[320px]"
                    />
                  </div>
                ) : null}

                {/* Detalhes da Campanha */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {activePromotion.isCurrentlyActive ? (
                      <Badge className="bg-emerald-600 text-white font-medium text-xs">
                        Em Andamento
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs">
                        Campanha Encerrada
                      </Badge>
                    )}

                    <div className="flex items-center text-xs text-gray-500 gap-1 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Vigência: {new Date(activePromotion.startDate).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(activePromotion.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                    {activePromotion.title}
                  </h2>

                  {activePromotion.description && (
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                      {activePromotion.description}
                    </p>
                  )}

                  {/* Caixa de Prêmios */}
                  {activePromotion.prizesDescription && (
                    <div className="bg-gradient-to-br from-amber-50 via-amber-50/50 to-orange-50/40 rounded-xl p-4 sm:p-5 border border-amber-200/90 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                        <Award className="w-5 h-5 text-amber-600" />
                        <span>Prêmios Oficiais desta Campanha</span>
                      </div>
                      <p className="text-sm text-amber-950 font-medium whitespace-pre-line leading-relaxed pl-7">
                        {activePromotion.prizesDescription}
                      </p>
                      
                      {activePromotion.sponsorPrizeDescription && (
                        <div className="pt-2 border-t border-amber-200/60 mt-2 pl-7 text-xs text-amber-900">
                          <span className="font-semibold">Bônus Especial de Patrocinador: </span>
                          {activePromotion.sponsorPrizeDescription}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ====================================================== */}
              {/* SEÇÃO: OS NÚMEROS DA SORTE DO USUÁRIO NESTA CAMPANHA   */}
              {/* ====================================================== */}
              <div className="bg-slate-950 rounded-2xl p-6 sm:p-7 text-white shadow-md border border-slate-800 space-y-5">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Seus Números da Sorte nesta Campanha
                      </h3>
                      <p className="text-xs text-slate-400">
                        Cada número concorre de forma individual aos sorteios oficiais.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total acumulado:</span>
                    <Badge className="bg-amber-400 text-slate-950 font-bold text-sm px-3 py-1 font-mono">
                      {activePromotion.userCouponsCount} {activePromotion.userCouponsCount === 1 ? 'Número' : 'Números'}
                    </Badge>
                  </div>
                </div>

                {/* Grade de Números ou Estado Vazio */}
                {activePromotion.userCouponsCount === 0 ? (
                  <div className="text-center py-8 px-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Você ainda não possui números da sorte nesta campanha
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Realize upgrades de pacote elegíveis ou as ações indicadas no regulamento para receber seus cupons automaticamente.
                      </p>
                    </div>
                    {activePromotion.isCurrentlyActive && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/dashboard/upgrade')}
                          className="bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 hover:text-amber-300 gap-1 text-xs"
                        >
                          Ver Opções de Upgrade
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
                    {activePromotion.userCoupons.map((c) => (
                      <div
                        key={c.id}
                        className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          c.isWinner
                            ? 'bg-gradient-to-b from-emerald-950/80 to-emerald-900/60 border-emerald-500/80 text-white shadow-emerald-500/20 shadow-md'
                            : 'bg-slate-900/90 border-slate-800 text-slate-100 hover:border-amber-500/40'
                        }`}
                      >
                        {/* Selo de Ganhador */}
                        {c.isWinner && (
                          <div className="absolute -top-2.5 right-3 bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Award className="w-3 h-3 text-slate-950" />
                            CONTEMPLADO
                          </div>
                        )}

                        <div>
                          <div className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
                            Número da Sorte
                          </div>
                          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-amber-400 my-1">
                            #{c.luckyNumber}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                          <span>
                            {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium">
                            {c.sourceType === 'MANUAL_ADMIN' ? 'Manual' : 'Automático'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. ABA: TODOS OS MEUS NÚMEROS (INVENTÁRIO & PESQUISA)     */}
      {/* ======================================================== */}
      {mainTab === 'all' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Inventário Geral de Números da Sorte
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Relação completa de todos os bilhetes emitidos para o seu usuário.
              </p>
            </div>

            {/* Campo de Pesquisa por Número */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por número (#927028)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          {filteredAllCoupons.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Nenhum cupom encontrado</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchTerm ? 'Tente buscar com outro número da sorte.' : 'Você ainda não possui números gerados no histórico.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredAllCoupons.map((c) => (
                <div
                  key={`${c.promotionId}-${c.id}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    c.isWinner
                      ? 'bg-emerald-950 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-100 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] text-slate-400 line-clamp-1 font-medium">
                      {c.promotionTitle}
                    </span>
                    {c.isPromotionActive ? (
                      <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-semibold px-1.5 py-0.5 rounded flex-shrink-0">
                        Ativa
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-1.5 py-0.5 rounded flex-shrink-0">
                        Encerrada
                      </span>
                    )}
                  </div>

                  <div className="my-2">
                    <div className="text-2xl font-bold font-mono text-amber-400 tracking-wider">
                      #{c.luckyNumber}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                    {c.isWinner && (
                      <Badge className="bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0 flex items-center gap-1">
                        <Award className="w-2.5 h-2.5" /> Ganhador
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SEÇÃO DIDÁTICA: COMO FUNCIONAM OS SORTEIOS            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Como Funcionam os Sorteios & Promoções
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Entenda os critérios de geração de números, segurança e apuração dos prêmios.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-amber-600 text-sm shadow-2xs font-mono">
              1
            </div>
            <h4 className="text-sm font-bold text-gray-900">Geração dos Números</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ao concluir um upgrade elegível de pacote ou realizar compras durante o período promocional, seus números são emitidos automaticamente.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-amber-600 text-sm shadow-2xs font-mono">
              2
            </div>
            <h4 className="text-sm font-bold text-gray-900">Auditoria & Unicidade</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Cada número da sorte é único em todo o sistema e fica intransferivelmente vinculado ao seu CPF e conta de usuário.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-amber-600 text-sm shadow-2xs font-mono">
              3
            </div>
            <h4 className="text-sm font-bold text-gray-900">Data & Apuração</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              O sorteio ocorre estritamente na data definida no regulamento de cada campanha, com registro e apuração transparente via painel.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-amber-600 text-sm shadow-2xs font-mono">
              4
            </div>
            <h4 className="text-sm font-bold text-gray-900">Entrega de Prêmios</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Os associados contemplados recebem a notificação em sua conta e a equipe de suporte entra em contato para o envio do prêmio.
            </p>
          </div>

        </div>

      </div>

    </div>
  )
}

export default function UserCouponsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-gray-600">Carregando...</p>
      </div>
    }>
      <CuponsContent />
    </Suspense>
  )
}

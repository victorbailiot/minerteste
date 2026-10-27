'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, Trophy, Crown, Star, Zap, AlertCircle } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'

interface Winner {
  id: string
  name: string
  email: string
  luckyNumber: number
  sponsor: {
    id: string
    name: string
    email: string
  } | null
}

interface Promotion {
  id: string
  title: string
}

interface DrawResult {
  promotion: Promotion
  winner: Winner
  totalCoupons: number
}

export default function SorteioPage() {
  const params = useParams()
  const router = useRouter()
  const promotionId = params.id as string
  const { hasPermission } = usePermissions()

  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [result, setResult] = useState<DrawResult | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const loadPromotion = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/promotions/${promotionId}`)
      const data = await response.json()
      
      if (data.success) {
        setPromotion(data.data)
      } else {
        toast.error('Erro ao carregar promoção')
        router.push('/admin/promocoes')
      }
    } catch (error) {
      console.error('Erro ao carregar promoção:', error)
      toast.error('Erro ao carregar promoção')
    } finally {
      setLoading(false)
    }
  }, [promotionId, router])

  useEffect(() => {
    loadPromotion()
  }, [loadPromotion])

  const handleDraw = async () => {
    setDrawing(true)
    setResult(null)
    setShowConfetti(false)

    try {
      // Aguardar 10 segundos para criar suspense
      await new Promise(resolve => setTimeout(resolve, 10000))

      const response = await fetch(`/api/admin/promotions/${promotionId}/draw`, {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        setShowConfetti(true)
        toast.success('Sorteio realizado com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao realizar sorteio')
      }
    } catch (error) {
      console.error('Erro ao realizar sorteio:', error)
      toast.error('Erro ao realizar sorteio')
    } finally {
      setDrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <Star
                className="text-yellow-400"
                style={{
                  width: `${10 + Math.random() * 20}px`,
                  height: `${10 + Math.random() * 20}px`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto py-8 px-4 relative z-10">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/promocoes/${promotionId}/cupons`)}
          className="mb-4 text-white hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-6 animate-pulse-slow">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in">
              {promotion?.title}
            </h1>
            <p className="text-2xl text-white/80 animate-fade-in animation-delay-500">
              Sorteio do Grande Vencedor
            </p>
          </div>

          {/* Main Content */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardContent className="p-12">
              {!drawing && !result && (
                <div className="text-center animate-fade-in">
                  {hasPermission('promotions.draw') ? (
                    <>
                      <div className="mb-8">
                        <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                        <p className="text-white text-xl mb-2">
                          Está pronto para descobrir o grande vencedor?
                        </p>
                        <p className="text-white/70">
                          Clique no botão abaixo para iniciar o sorteio
                        </p>
                      </div>
                      <Button
                        onClick={handleDraw}
                        size="lg"
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600 text-white font-bold text-2xl py-8 px-16 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 animate-pulse-slow"
                      >
                        <Zap className="w-8 h-8 mr-3" />
                        SORTEAR AGORA
                      </Button>
                    </>
                  ) : (
                    <div className="py-12">
                      <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                      <p className="text-white text-xl mb-2">
                        Sem Permissão para Sortear
                      </p>
                      <p className="text-white/70">
                        Você não tem permissão para realizar sorteios.
                      </p>
                      <p className="text-white/50 text-sm mt-4">
                        Entre em contato com um administrador para obter acesso.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {drawing && (
                <div className="text-center py-12 animate-fade-in">
                  <div className="relative">
                    {/* Spinning Wheel Effect */}
                    <div className="w-64 h-64 mx-auto mb-8 relative">
                      <div className="absolute inset-0 border-8 border-dashed border-yellow-400 rounded-full animate-spin-clockwise"></div>
                      <div className="absolute inset-4 border-8 border-dotted border-pink-400 rounded-full animate-spin-counter"></div>
                      <div className="absolute inset-8 border-8 border-dashed border-orange-400 rounded-full animate-spin-fast"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-24 h-24 text-white animate-pulse" />
                      </div>
                    </div>
                    
                    <h2 className="text-4xl font-bold text-white mb-4 animate-pulse">
                      Sorteando...
                    </h2>
                    <div className="flex justify-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce animation-delay-200"></div>
                      <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce animation-delay-400"></div>
                    </div>
                    <p className="text-white/80 text-xl">
                      Aguarde enquanto selecionamos o grande vencedor...
                    </p>
                  </div>
                </div>
              )}

              {result && (
                <div className="text-center animate-zoom-in">
                  <div className="mb-8">
                    <Crown className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-orange-400 mb-4 animate-gradient">
                      🎉 PARABÉNS! 🎉
                    </h2>
                    <p className="text-white/90 text-2xl mb-8">
                      Temos um grande vencedor!
                    </p>
                  </div>

                  <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 mb-6 transform hover:scale-105 transition-all duration-300">
                    {/* Lucky Number Display */}
                    <div className="mb-8 relative">
                      <div className="relative inline-block">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-full blur-2xl opacity-60 animate-pulse-slow"></div>
                        
                        {/* Rotating Stars */}
                        <div className="absolute inset-0 animate-spin-very-slow">
                          <Star className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 text-yellow-300" fill="currentColor" />
                          <Star className="absolute top-1/2 -right-4 transform -translate-y-1/2 w-5 h-5 text-pink-300" fill="currentColor" />
                          <Star className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-6 text-orange-300" fill="currentColor" />
                          <Star className="absolute top-1/2 -left-4 transform -translate-y-1/2 w-5 h-5 text-yellow-300" fill="currentColor" />
                        </div>
                        
                        {/* Main Circle */}
                        <div className="relative flex items-center justify-center w-40 h-40 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-full shadow-2xl animate-float">
                          <div className="absolute inset-2 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full"></div>
                          <div className="absolute inset-4 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full"></div>
                          <span className="relative text-6xl font-black text-white drop-shadow-2xl tracking-tight animate-number-pop">
                            {result.winner.luckyNumber}
                          </span>
                        </div>
                        
                        {/* Sparkles */}
                        <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300 animate-ping" />
                        <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-pink-300 animate-ping animation-delay-500" />
                      </div>
                      
                      <p className="text-white text-xl font-bold mt-6 mb-2 animate-fade-in animation-delay-300">
                        ⭐ Número da Sorte ⭐
                      </p>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-white/70 text-lg mb-2">🏆 Ganhador</p>
                      <p className="text-4xl font-bold text-white mb-2">
                        {result.winner.name}
                      </p>
                    </div>

                    {result.winner.sponsor && (
                      <div className="pt-6 border-t border-white/20">
                        <p className="text-white/70 text-lg mb-2">👥 Patrocinador</p>
                        <p className="text-2xl font-bold text-white mb-1">
                          {result.winner.sponsor.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-white/70 text-sm mb-8">
                    Sorteado entre {result.totalCoupons} cupons participantes
                  </div>

                  {hasPermission('promotions.draw') && (
                    <Button
                      onClick={() => {
                        setResult(null)
                        setShowConfetti(false)
                      }}
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                    >
                      Realizar Novo Sorteio
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        
        @keyframes spin-clockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-counter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-very-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        
        @keyframes number-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
        
        .animate-spin-clockwise {
          animation: spin-clockwise 3s linear infinite;
        }
        
        .animate-spin-counter {
          animation: spin-counter 2s linear infinite;
        }
        
        .animate-spin-fast {
          animation: spin-fast 1.5s linear infinite;
        }
        
        .animate-spin-very-slow {
          animation: spin-very-slow 8s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-number-pop {
          animation: number-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-zoom-in {
          animation: zoom-in 0.6s ease-out forwards;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}


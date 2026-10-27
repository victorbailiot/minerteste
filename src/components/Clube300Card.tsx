'use client'

import { useState, useEffect } from 'react'
import { Crown, Star, Gem, Trophy, Sparkles } from 'lucide-react'
import type { Clube300Membership } from '@/model/clube300'

interface Clube300CardProps {
  className?: string
}

export default function Clube300Card({ className = '' }: Clube300CardProps) {
  const [memberships, setMemberships] = useState<Clube300Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    const checkMembership = async () => {
      try {
        const response = await fetch('/api/clube300/check-membership')
        const data = await response.json()

        if (data.success) {
          setIsMember(data.isMember)
          if (data.isMember && data.memberships?.length) {
            setMemberships(data.memberships)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar membro do Clube 300:', error)
      } finally {
        setLoading(false)
      }
    }

    checkMembership()
  }, [])

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mr-3"></div>
          <span className="text-amber-700 text-sm">Verificando status...</span>
        </div>
      </div>
    )
  }

  if (!isMember || memberships.length === 0) {
    return null
  }

  const member = memberships[0]
  const hasMultipleMemberships = memberships.length > 1

  const getPackageIcon = (packageName: string) => {
    switch (packageName.toLowerCase()) {
      case 'núcleo':
        return <Gem className="w-6 h-6 text-white drop-shadow-lg" />
      case 'tecton':
        return <Crown className="w-6 h-6 text-white drop-shadow-lg" />
      default:
        return <Star className="w-6 h-6 text-white drop-shadow-lg" />
    }
  }

  const getPackageColor = (packageName: string) => {
    switch (packageName.toLowerCase()) {
      case 'núcleo':
        return 'from-blue-600 to-blue-700 shadow-lg'
      case 'tecton':
        return 'from-purple-600 to-purple-700 shadow-lg'
      default:
        return 'from-amber-500 to-amber-600 shadow-lg'
    }
  }

  const formatJoinDate = (dateString: string) => {
    try {
      if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'Data não disponível'
      }

      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Data não disponível'
      }

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return 'Data não disponível'
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 shadow-xl ${className}`}>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-400 to-yellow-400 transform rotate-12 scale-150"></div>
      </div>

      <div className="absolute top-4 right-4 text-amber-300 animate-pulse">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="absolute bottom-4 left-4 text-yellow-300 animate-bounce">
        <Star className="w-4 h-4" />
      </div>

      <div className="relative z-10 p-6">
        <div className="flex items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full bg-gradient-to-r ${getPackageColor(member.packageName)} shadow-lg`}>
              {getPackageIcon(member.packageName)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900">
                🏆 Clube dos 300
              </h3>
              <p className="text-sm text-amber-700 font-medium">
                Minerador Fundador
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-amber-900 mb-2">
              🎉 Parabéns, Pioneiro!
            </h2>
            <p className="text-amber-800 text-lg leading-relaxed">
              {hasMultipleMemberships ? (
                <>
                  Você faz parte de um grupo <span className="font-bold text-amber-900">exclusivo</span> de apenas 300 fundadores em cada mineradora em que está inscrito.
                </>
              ) : (
                <>
                  Você faz parte de um grupo <span className="font-bold text-amber-900">exclusivo</span> de apenas 300 fundadores que acreditaram no projeto desde o início!
                </>
              )}
            </p>
          </div>

          <div className="space-y-3">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-amber-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold">
                      Mineradora
                    </p>
                    <p className="font-bold text-amber-900 text-lg">
                      {membership.minerName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold">
                      Posição no clube
                    </p>
                    <div className="text-2xl font-bold text-amber-800">
                      #{membership.memberNumber}
                    </div>
                    <p className="text-xs text-amber-600">de 300</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-amber-200/80">
                  <div>
                    <p className="text-sm text-amber-600">Pacote Fundador</p>
                    <p className="font-bold text-amber-900">{membership.packageName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-600">Cotas</p>
                    <p className="font-bold text-amber-900">
                      {membership.cotas} cota{membership.cotas > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-600">Membro desde</p>
                    <p className="font-semibold text-amber-800">
                      {formatJoinDate(membership.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 border-2 border-purple-200">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Trophy className="w-6 h-6 text-purple-600" />
                <h4 className="text-lg font-bold text-purple-800">Benefício Exclusivo</h4>
              </div>
              <p className="text-sm text-purple-700 mb-1">
                <span className="font-bold text-lg">1% do lucro líquido</span>{' '}
                {hasMultipleMemberships ? 'de cada mineradora' : 'da mineradora'}
              </p>
              <p className="text-xs text-purple-600">
                {hasMultipleMemberships
                  ? 'Dividido exclusivamente entre os 300 membros fundadores de cada clube'
                  : 'Dividido exclusivamente entre os 300 membros fundadores'}
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-3 rounded-full shadow-lg">
              <Crown className="w-5 h-5" />
              <span className="font-bold">
                Status: Fundador Ativo
                {hasMultipleMemberships ? ` em ${memberships.length} mineradoras` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"></div>
    </div>
  )
}

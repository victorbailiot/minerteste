'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { 
  Network, 
  BarChart3, 
  Users, 
  Award, 
  Trophy,
  TrendingUp,
  ChevronRight,
  History
} from 'lucide-react'

interface BusinessCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
  borderColor: string
}

const businessCards: BusinessCard[] = [
  {
    id: 'my-network',
    title: 'Ver Rede',
    description: 'Navegue pela sua rede nível a nível, explorando cada membro',
    icon: Network,
    href: '/dashboard/minha-rede',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'team',
    title: 'Meus Diretos',
    description: 'Gerencie seus indicados diretos e acompanhe suas atividades',
    icon: Users,
    href: '/dashboard/diretos',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'stats',
    title: 'Minha Equipe',
    description: 'Gerencie toda a sua equipe e acompanhe o desempenho dos seus downlines',
    icon: BarChart3,
    href: '/dashboard/minha-equipe',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'career',
    title: 'Carreira',
    description: 'Acompanhe sua progressão no plano de carreira e níveis',
    icon: Trophy,
    href: '/dashboard/carreira',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  {
    id: 'team-graduations',
    title: 'Graduados',
    description: 'Veja as graduações alcançadas pelos membros da sua equipe',
    icon: Award,
    href: '/dashboard/graduados',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  {
    id: 'points-history',
    title: 'Histórico de Pontos',
    description: 'Visualize o histórico completo de pontos da sua rede',
    icon: History,
    href: '/dashboard/historico-pontos',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  }
]

export default function MeuNegocioPage() {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Se ainda está carregando a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não está autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Meu Negócio 💼
        </h1>
        <p className="text-gray-600">
          Gerencie sua rede, acompanhe seus ganhos e desenvolva seu negócio
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businessCards.map((card) => {
          const IconComponent = card.icon
          
          return (
            <Link
              key={card.id}
              href={card.href}
              className={`group block p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 ${card.bgColor} ${card.borderColor} hover:border-opacity-80`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${card.color}`}>
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
              
              {/* Arrow indicator */}
              <div className="mt-4 flex justify-end">
                <div className={`w-8 h-8 rounded-full ${card.bgColor} flex items-center justify-center group-hover:translate-x-1 transition-transform duration-200`}>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats 
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Indicados Diretos</p>
                <p className="text-2xl font-bold text-blue-900">0</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-1.7 2.26V15h-1.5v6H20z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Ganhos do Mês</p>
                <p className="text-2xl font-bold text-green-900">R$ 0,00</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Nível Atual</p>
                <p className="text-2xl font-bold text-purple-900">Iniciante</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>*/}
    </div>
  )
}


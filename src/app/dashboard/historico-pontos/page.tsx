'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'
import NetworkPointsHistory from '@/components/NetworkPointsHistory'

export default function HistoricoPontosPage() {
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
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/dashboard/meu-negocio"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-100 rounded-lg">
            <History className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Histórico de Pontos
            </h1>
            <p className="text-gray-600">
              Visualize o histórico completo de pontos da sua rede de indicações
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <NetworkPointsHistory userId={user.id} autoFetch={true} />
        </div>
      </div>
    </div>
  )
}

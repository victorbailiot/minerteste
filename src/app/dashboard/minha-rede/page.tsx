'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'

interface DirectReferral {
  id: number
  name: string
  email: string
  level: number // Nível em relação ao usuário logado
  packageName?: string
  directReferrals: number
  totalPoints: number
  isActive: boolean
  careerLevel?: string
}

interface BreadcrumbItem {
  id: number
  name: string
  email: string
  level: number
}

// Função para formatar nome: primeiro + último nome em MAIÚSCULAS
const formatShortName = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return fullName.toUpperCase()
  return `${parts[0]} ${parts[parts.length - 1]}`.toUpperCase()
}

export default function MinhaRedePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [directs, setDirects] = useState<DirectReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])

  const fetchDirects = useCallback(async (userId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/unilevel/directs?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }
        throw new Error('Erro ao carregar indicações diretas')
      }

      const data = await response.json()
      setDirects(data.directs || [])
    } catch (err) {
      console.error('❌ Erro ao buscar indicações diretas:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleUserClick = (clickedUser: DirectReferral) => {
    // Adicionar ao breadcrumb
    const newBreadcrumb = [...breadcrumb]
    
    // Se é a primeira navegação, adicionar o usuário logado como raiz
    if (newBreadcrumb.length === 0 && user?.id) {
      newBreadcrumb.push({
        id: Number(user.id),
        name: user.name || '',
        email: user.email || '',
        level: 0
      })
    }
    
    // Adicionar o usuário clicado
    newBreadcrumb.push({
      id: clickedUser.id,
      name: clickedUser.name,
      email: clickedUser.email,
      level: clickedUser.level
    })

    setBreadcrumb(newBreadcrumb)
    setCurrentUserId(clickedUser.id)
    fetchDirects(clickedUser.id)
  }

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumb[index]
    
    if (index === 0) {
      // Voltar para o início
      setBreadcrumb([])
      setCurrentUserId(null)
      if (user?.id) {
        fetchDirects(Number(user.id))
      }
    } else {
      // Navegar para o item do breadcrumb
      const newBreadcrumb = breadcrumb.slice(0, index + 1)
      setBreadcrumb(newBreadcrumb)
      setCurrentUserId(item.id)
      fetchDirects(item.id)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchDirects(Number(user.id))
    }
  }, [isAuthenticated, user, fetchDirects])

  // Loading inicial
  if (isLoading && !directs.length) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando sua rede...</p>
        </div>
      </div>
    )
  }

  // Não autenticado
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-500 text-xl">Usuário não autenticado</div>
      </div>
    )
  }

  // Calcular nível atual
  const currentLevel = breadcrumb.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Minha Rede</h1>
        <p className="text-gray-600">Navegue pela sua rede de indicações nível a nível</p>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center flex-wrap gap-2 text-sm">
            <span className="text-gray-600 font-medium">Você está em:</span>
            <button
              onClick={() => handleBreadcrumbClick(0)}
              className="text-blue-600 hover:text-blue-800 transition-colors font-medium cursor-pointer"
              title={breadcrumb[0].name}
            >
              🏠 {formatShortName(breadcrumb[0].name)}
            </button>
            {breadcrumb.slice(1).map((item, index) => (
              <div key={item.id} className="flex items-center space-x-2">
                <span className="text-gray-400">→</span>
                <button
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium cursor-pointer"
                  title={item.name}
                >
                  {formatShortName(item.name)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de Nível Atual */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-lg font-medium opacity-90">Nível Atual</p>
            <p className="text-4xl font-bold">Nível {currentLevel}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Total de Membros</p>
            <p className="text-3xl font-bold">{directs.length}</p>
          </div>
        </div>
        {/* Botão Voltar - mostra apenas se não estiver no nível inicial */}
        {breadcrumb.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex gap-2">
            {breadcrumb.length > 1 && (
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>←</span>
                <span>Voltar</span>
              </button>
            )}
            <button
              onClick={() => handleBreadcrumbClick(0)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🏠</span>
              <span>Início</span>
            </button>
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => currentUserId ? fetchDirects(currentUserId) : user?.id && fetchDirects(Number(user.id))}
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-white cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Lista de Indicações Diretas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {currentLevel === 0 
                ? 'Minhas Indicações Diretas' 
                : `Indicações Diretas de ${formatShortName(breadcrumb[breadcrumb.length - 1].name)}`
              }
            </h2>
            <button
              onClick={() => currentUserId ? fetchDirects(currentUserId) : user?.id && fetchDirects(Number(user.id))}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white cursor-pointer"
            >
              🔄 Atualizar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : directs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                {currentLevel === 0 ? 'Você ainda não tem indicações diretas.' : 'Este usuário ainda não tem indicações diretas.'}
              </p>
              {currentLevel === 0 && (
                <p className="text-gray-500 mt-2">Compartilhe seu link de indicação para começar a construir sua rede!</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {directs.map((direct) => (
                <div
                  key={direct.id}
                  onClick={() => handleUserClick(direct)}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-5 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg mb-1" title={direct.name}>
                        {formatShortName(direct.name)}
                      </h3>
                    </div>
                    {direct.isActive ? (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                        Ativo
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                        Inativo
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pacote:</span>
                      <span className="font-medium text-gray-900">{direct.packageName || 'Sem Pacote'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pontos:</span>
                      <span className="font-medium text-gray-900">{direct.totalPoints.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Diretos:</span>
                      <span className="font-medium text-blue-600">{direct.directReferrals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Carreira:</span>
                      <span className="font-medium text-purple-600">{direct.careerLevel || 'Iniciante'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Nível {direct.level} em relação a você</span>
                      <span className="text-blue-600 font-medium">Ver rede →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

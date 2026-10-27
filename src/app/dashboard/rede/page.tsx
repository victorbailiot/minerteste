'use client'

import { useState, useEffect, useCallback } from 'react'
import UnilevelListView from '@/components/UnilevelListView'
import UnilevelListViewMobile from '@/components/UnilevelListViewMobile'
import { useAuth } from '@/lib/hooks/useAuth'

interface UnilevelNodeData {
  id: number
  name: string
  email: string
  level: number
  levelFromRoot: number // Nível em relação ao usuário logado original
  isActive: boolean
  packageName?: string
  totalPoints: number
  networkPoints: number // Pontos da rede
  ownPoints: number // Pontos próprios
  teamVolume: number
  careerLevel?: string
  children: UnilevelNodeData[]
}

interface UnilevelNetworkStats {
  totalMembers: number
  directReferrals: number
  totalPoints: number
  totalTeamVolume: number
  levelBreakdown: {
    level1: number
    level2: number
    level3: number
    level4: number
    level5: number
  }
}

interface UnilevelNetworkData {
  tree: UnilevelNodeData
  stats: UnilevelNetworkStats
  metadata: {
    maxDepth: number
    rootUserId: string
    generatedAt: string
  }
}

interface BreadcrumbItem {
  id: number
  name: string
  email: string
}

export default function RedePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [networkData, setNetworkData] = useState<UnilevelNetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maxDepth] = useState(3) // Fixo em 5 níveis para drill-down
  const [currentRootUserId, setCurrentRootUserId] = useState<number | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])
  const [isMobile, setIsMobile] = useState(false)


  // Detectar se é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // Breakpoint md do Tailwind
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const fetchNetworkData = useCallback(async (rootUserId?: number, clickedUserLevel: number = 0) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        depth: maxDepth.toString()
      })

      if (rootUserId) {
        params.append('rootUserId', rootUserId.toString())
      }

      // Adicionar o nível do usuário clicado
      params.append('clickedUserLevel', clickedUserLevel.toString())

      const response = await fetch(`/api/unilevel/network?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }
        throw new Error('Erro ao carregar dados da rede')
      }

      const data = await response.json()

      setNetworkData(data)
      setError(null)

      // Atualizar o usuário raiz atual
      setCurrentRootUserId(rootUserId || null)

    } catch (err) {
      console.error('❌ Erro ao buscar dados da rede unilevel:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [maxDepth])

  // Função para lidar com cliques nos nós
  const handleNodeClick = async (nodeId: number) => {
    try {
      // Encontrar os dados do nó clicado para adicionar ao breadcrumb
      const findNodeInTree = (tree: UnilevelNodeData, targetId: number): UnilevelNodeData | null => {
        if (tree.id === targetId) return tree

        for (const child of tree.children) {
          const found = findNodeInTree(child, targetId)
          if (found) return found
        }

        return null
      }

      if (networkData?.tree) {
        const clickedNode = findNodeInTree(networkData.tree, nodeId)

        if (clickedNode) {

          // Adicionar ao breadcrumb se não for o primeiro item
          const newBreadcrumb = [...breadcrumb]

          // Se é a primeira vez navegando, adicionar a raiz atual
          if (newBreadcrumb.length === 0 && networkData.tree) {
            newBreadcrumb.push({
              id: networkData.tree.id,
              name: networkData.tree.name,
              email: networkData.tree.email
            })
          }

          // Adicionar o nó clicado
          newBreadcrumb.push({
            id: clickedNode.id,
            name: clickedNode.name,
            email: clickedNode.email
          })

          setBreadcrumb(newBreadcrumb)

          // Buscar nova árvore a partir do nó clicado, passando o nível do usuário clicado
          await fetchNetworkData(nodeId, clickedNode.levelFromRoot)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao navegar para o nó:', error)
    }
  }

  const handleBreadcrumbClick = async (index: number) => {
    const item = breadcrumb[index]

    if (index === 0) {
      // Voltar para a raiz original
      setBreadcrumb([])
      await fetchNetworkData()
    } else {
      // Navegar para o item do breadcrumb
      const newBreadcrumb = breadcrumb.slice(0, index + 1)
      setBreadcrumb(newBreadcrumb)
      
      // Calcular o nível do item do breadcrumb
      const breadcrumbLevel = index // O nível é baseado na posição no breadcrumb
      await fetchNetworkData(item.id, breadcrumbLevel)
    }
  }


  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNetworkData()
    }
  }, [isAuthenticated, user, fetchNetworkData])

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

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando rede unilevel...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen text-white">
        <div className="container mx-auto p-6">
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Erro</h2>
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchNetworkData()}
              className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🌐 Minha Rede</h1>
        <p className="text-gray-600">Explore e navegue pela sua árvore de indicações unilevel</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 pb-0">

          {/* Breadcrumb Navigation - RESPONSIVO */}
          {breadcrumb.length > 0 && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              {/* Layout Mobile: Breadcrumb vertical compacto */}
              <div className="sm:hidden">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 font-medium">Navegação:</span>
                    <button
                      onClick={() => handleBreadcrumbClick(0)}
                      className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm"
                    >
                      🏠 Minha Rede
                    </button>
                  </div>
                  
                  {/* Caminho de navegação em linhas separadas */}
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-2 ml-6">
                      <span className="text-gray-400 text-sm">→</span>
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm break-words"
                        title={`${item.name} (${item.email})`}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout Desktop: Breadcrumb horizontal tradicional */}
              <div className="hidden sm:block">
                <div className="flex items-center flex-wrap gap-2 text-sm">
                  <span className="text-gray-600 font-medium">Navegação:</span>
                  <button
                    onClick={() => handleBreadcrumbClick(0)}
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium whitespace-nowrap"
                  >
                    🏠 Minha Rede
                  </button>
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <span className="text-gray-400">→</span>
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium max-w-48 truncate"
                        title={`${item.name} (${item.email})`}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="space-y-4 mb-6">
            {/* Linha 1: Controles principais */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">Visualizando: 5 níveis</span>
                </div>
                <button
                  onClick={() => fetchNetworkData(currentRootUserId || undefined)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white w-full sm:w-auto"
                >
                  🔄 Atualizar
                </button>
                {breadcrumb.length > 0 && (
                  <button
                    onClick={() => {
                      setBreadcrumb([])
                      fetchNetworkData()
                    }}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white w-full sm:w-auto"
                  >
                    🏠 Voltar ao Início
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* Estatísticas */}
          {networkData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{networkData.stats.directReferrals}</div>
                <div className="text-sm text-gray-600 font-medium">Indicações Diretas</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{networkData.stats.levelBreakdown.level2}</div>
                <div className="text-sm text-gray-600 font-medium">Nível 2</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">{networkData.stats.levelBreakdown.level3}</div>
                <div className="text-sm text-gray-600 font-medium">Nível 3</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-teal-600">{networkData.stats.levelBreakdown.level4}</div>
                <div className="text-sm text-gray-600 font-medium">Nível 4</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-cyan-600">{networkData.stats.levelBreakdown.level5}</div>
                <div className="text-sm text-gray-600 font-medium">Nível 5</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{networkData.stats.totalMembers}</div>
                <div className="text-sm text-gray-600 font-medium">Total Membros</div>
              </div>
            </div>
          )}

          {/* Estatísticas adicionais 
          {networkData?.stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white shadow-sm">
                <div className="text-2xl font-bold">{networkData.stats.totalPoints.toLocaleString('pt-BR')}</div>
                <div className="text-sm opacity-90">Total de Pontos da Rede</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white shadow-sm">
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(networkData.stats.totalTeamVolume)}
                </div>
                <div className="text-sm opacity-90">Volume Total da Equipe</div>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-4 text-white shadow-sm">
                <div className="text-2xl font-bold">
                  {networkData.stats.totalMembers > 0 
                    ? Math.round(networkData.stats.totalPoints / networkData.stats.totalMembers)
                    : 0
                  }
                </div>
                <div className="text-sm opacity-90">Média de Pontos por Membro</div>
              </div>
            </div>
          )}*/}
        </div>

        {/* Visualização da Rede - Apenas Lista */}
        <div className={isMobile ? "p-2" : "p-6"}>
          {networkData?.tree && (
            isMobile ? (
              <UnilevelListViewMobile
                data={networkData.tree}
                onNodeClick={handleNodeClick}
                maxDepth={maxDepth}
                loggedInUserId={user?.id ? Number(user.id) : undefined}
              />
            ) : (
              <UnilevelListView
                data={networkData.tree}
                onNodeClick={handleNodeClick}
                maxDepth={maxDepth}
                loggedInUserId={user?.id ? Number(user.id) : undefined}
              />
            )
          )}
        </div>

        
      </div>
    </div>
  )
} 
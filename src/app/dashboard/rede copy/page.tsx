'use client'

import { useState, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NetworkNode from '@/components/NetworkNode'
import { useAuth } from '@/lib/hooks/useAuth'

interface NetworkNodeData {
  id: number
  name: string
  email: string
  position: 'LEFT' | 'RIGHT'
  leftPoints: number
  rightPoints: number
  level: number
  isActive: boolean
  left: NetworkNodeData | null
  right: NetworkNodeData | null
}

interface NetworkStats {
  leftPoints: number
  rightPoints: number
  totalLeftMembers: number
  totalRightMembers: number
  directReferrals: number
  totalMembers: number
}

interface NetworkData {
  tree: NetworkNodeData
  stats: NetworkStats
  metadata: {
    maxDepth: number
    rootUserId: string
    originalUserId: string
    generatedAt: string
  }
}

interface BreadcrumbItem {
  id: number
  name: string
  email: string
}

const nodeTypes = {
  networkNode: NetworkNode,
}

export default function RedePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maxDepth] = useState(5) // Fixo em 5 níveis para drill-down
  const [currentRootUserId, setCurrentRootUserId] = useState<number | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const fetchNetworkData = async (rootUserId?: number) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        depth: maxDepth.toString(),
        stats: 'true'
      })

      if (rootUserId) {
        params.append('rootUserId', rootUserId.toString())
      }

      console.log('🔍 Fazendo fetch da rede para rootUserId:', rootUserId || 'user atual')

      const response = await fetch(`/api/network/tree?${params}`, {
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
      console.log('✅ Dados da rede recebidos:', data)

      setNetworkData(data)
      setError(null)

      // Atualizar o usuário raiz atual
      setCurrentRootUserId(rootUserId || null)

    } catch (err) {
      console.error('❌ Erro ao buscar dados da rede:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Função para lidar com cliques nos nós
  const handleNodeClick = async (nodeId: number) => {
    try {
      console.log('🖱️ Node clicked:', nodeId)

      // Encontrar os dados do nó clicado para adicionar ao breadcrumb
      const findNodeInTree = (tree: NetworkNodeData, targetId: number): NetworkNodeData | null => {
        if (tree.id === targetId) return tree

        if (tree.left) {
          const found = findNodeInTree(tree.left, targetId)
          if (found) return found
        }

        if (tree.right) {
          const found = findNodeInTree(tree.right, targetId)
          if (found) return found
        }

        return null
      }

      if (networkData?.tree) {
        const clickedNode = findNodeInTree(networkData.tree, nodeId)

        if (clickedNode) {
          console.log('✅ Nó encontrado:', clickedNode.name)

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

          // Buscar nova árvore a partir do nó clicado
          await fetchNetworkData(nodeId)
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
      await fetchNetworkData(item.id)
    }
  }

  const convertToReactFlow = (tree: NetworkNodeData) => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    const nodeSpacing = 400
    const levelSpacing = 200

    const processNode = (
      node: NetworkNodeData,
      x: number,
      y: number,
      isRoot: boolean = false,
      parentId?: string
    ) => {
      const nodeId = `node-${node.id}`

      // Criar nó
      nodes.push({
        id: nodeId,
        type: 'networkNode',
        position: { x, y },
        data: {
          ...node,
          isRoot,
          onNodeClick: handleNodeClick
        },
        draggable: false,
      })

      // Criar edge se não for raiz
      if (parentId && node.position) {
        edges.push({
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          sourceHandle: node.position.toLowerCase(), // 'left' ou 'right'
          targetHandle: 'top',
          style: {
            stroke: node.position === 'LEFT' ? '#16a34a' : '#ea580c',
            strokeWidth: 3,
          },
          animated: true,
          type: 'smoothstep',
        })
      }

      // Processar filhos
      const childY = y + levelSpacing
      // Manter um espaçamento mínimo entre os nós, mesmo em níveis profundos
      const childSpacing = Math.max(nodeSpacing / Math.pow(1.8, node.level), 120)

      if (node.left) {
        const childX = x - childSpacing
        processNode(node.left, childX, childY, false, nodeId)
      }

      if (node.right) {
        const childX = x + childSpacing
        processNode(node.right, childX, childY, false, nodeId)
      }
    }

    // Começar com o nó raiz no centro
    processNode(tree, 0, 0, true)

    return { nodes, edges }
  }

  // Atualizar os nós quando os dados da rede mudarem
  useEffect(() => {
    if (networkData?.tree) {
      console.log('🔄 Convertendo árvore para React Flow...')
      const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(networkData.tree)
      console.log('✅ Gerados', flowNodes.length, 'nós e', flowEdges.length, 'arestas')

      // Verificar se os nós têm a função onNodeClick
      const firstNode = flowNodes[0]
      if (firstNode) {
        console.log('🔍 Primeiro nó:', {
          id: firstNode.id,
          hasOnNodeClick: !!firstNode.data.onNodeClick,
          isRoot: firstNode.data.isRoot
        })
      }

      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkData])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNetworkData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

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
      <div className="min-h-screen ">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando rede...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen  text-white">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🌳 Minha Rede Binária</h1>
        <p className="text-gray-600">Explore e navegue pela sua árvore de indicações</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 pb-0">

          {/* Breadcrumb Navigation */}
          {breadcrumb.length > 0 && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">Navegação:</span>
                <button
                  onClick={() => handleBreadcrumbClick(0)}
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  🏠 Minha Rede
                </button>
                {breadcrumb.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <span className="text-gray-400">→</span>
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="text-blue-600 hover:text-blue-800 transition-colors truncate max-w-32 font-medium"
                      title={`${item.name} (${item.email})`}
                    >
                      {item.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Visualizando: 5 níveis</span>
            </div>
            <button
              onClick={() => fetchNetworkData(currentRootUserId || undefined)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white"
            >
              🔄 Atualizar
            </button>
            {breadcrumb.length > 0 && (
              <button
                onClick={() => {
                  setBreadcrumb([])
                  fetchNetworkData()
                }}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white"
              >
                🏠 Voltar ao Início
              </button>
            )}
          </div>

          {/* Estatísticas */}
          {networkData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">              
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{networkData.stats.totalLeftMembers}</div>
                <div className="text-sm text-gray-600 font-medium">Membros Esquerda</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{networkData.stats.totalRightMembers}</div>
                <div className="text-sm text-gray-600 font-medium">Membros Direita</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-yellow-600">{networkData.stats.directReferrals}</div>
                <div className="text-sm text-gray-600 font-medium">Indicações Diretas</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{networkData.stats.totalMembers}</div>
                <div className="text-sm text-gray-600 font-medium">Total Membros</div>
              </div>
            </div>
          )}
        </div>

        {/* React Flow */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{
              padding: 0.2,
              includeHiddenNodes: false,
            }}
            className="bg-gray-900"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#374151"
            />
            <Controls
              className="bg-white border border-gray-300 text-gray-700 shadow-sm"
            />
            <MiniMap
              className="bg-white border border-gray-300 shadow-sm"
              nodeColor={(node) => {
                if (node.data.isRoot) return '#3b82f6'
                return node.data.position === 'LEFT' ? '#16a34a' : '#ea580c'
              }}
            />

            {/* Panel com informações */}
            <Panel position="top-left" className="bg-white border border-gray-300 rounded-lg p-3 text-gray-700 text-sm shadow-sm">
              <h3 className="font-bold mb-2">Controles:</h3>
              <div className="space-y-1 text-xs">
                <div>🖱️ Clique e arraste para mover</div>
                <div>⚡ Scroll para zoom</div>
                <div>👆 Clique em um usuário para explorar</div>
                <div>🎯 Use os controles para navegar</div>
                <div>🔍 MiniMap para visão geral</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Legenda */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-bold mb-4 text-gray-900">Legenda:</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
              <span className="text-gray-700">Raiz Atual</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-600 to-green-700 rounded"></div>
              <span className="text-gray-700">Lado Esquerdo (LEFT)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-orange-600 to-orange-700 rounded"></div>
              <span className="text-gray-700">Lado Direito (RIGHT)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-gray-700">Status Ativação</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-600 space-y-1">
            <p><strong className="text-gray-800">L:</strong> Pontos acumulados no lado esquerdo | <strong className="text-gray-800">R:</strong> Pontos acumulados no lado direito</p>
            <p><strong className="text-gray-800">Status:</strong> ✅ ATIVO = Usuário pode receber bônus | ❌ INATIVO = Usuário não pode receber bônus</p>
            <p><strong className="text-gray-800">Drill-down:</strong> Clique em qualquer usuário para explorar sua rede (5 níveis). Use o breadcrumb para navegar.</p>
            <p><strong className="text-gray-800">Interação:</strong> Use o mouse para navegar, zoom e explorar. As conexões são animadas e coloridas por lado.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
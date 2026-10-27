'use client'

import { useState } from 'react'

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

interface UnilevelListViewProps {
  data: UnilevelNodeData
  onNodeClick: (nodeId: number) => void
  maxDepth?: number
  loggedInUserId?: number // ID do usuário logado para identificar quando mostrar networkPoints
}

interface TreeNodeProps {
  node: UnilevelNodeData
  level: number
  onNodeClick: (nodeId: number) => void
  maxDepth: number
  loggedInUserId?: number // ID do usuário logado para identificar quando mostrar networkPoints
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, onNodeClick, maxDepth, loggedInUserId }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Expandir primeiros 2 níveis por padrão
  const hasChildren = node.children && node.children.length > 0
  const canExpand = level < maxDepth - 1

  const handleToggle = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleToggle() // Clique na linha expande/recolhe
  }

  const handleExploreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeClick(node.id) // Botão explorar navega
  }

  // Determinar qual pontos mostrar: se for o usuário logado, mostrar networkPoints, senão totalPoints
  const displayPoints = loggedInUserId && node.id === loggedInUserId ? node.networkPoints : node.totalPoints

  const getLevelColor = (level: number) => {
    const colors = [
      'text-blue-700',      // Nível 0 (Raiz)
      'text-green-700',     // Nível 1
      'text-emerald-700',   // Nível 2
      'text-teal-700',      // Nível 3
      'text-cyan-700',      // Nível 4
      'text-sky-700'        // Nível 5
    ]
    return colors[Math.min(level, colors.length - 1)]
  }

  const getLevelIcon = (level: number) => {
    if (level === 0) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    }
    if (level === 1) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      )
    }
    if (level === 2) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
      )
    }
    if (level === 3) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (level === 4) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
      </svg>
    )
  }

  const getLevelBadgeColor = (levelFromRoot: number) => {
    if (levelFromRoot === 0) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (levelFromRoot === 1) return 'bg-green-100 text-green-800 border-green-200'
    if (levelFromRoot === 2) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (levelFromRoot === 3) return 'bg-teal-100 text-teal-800 border-teal-200'
    if (levelFromRoot === 4) return 'bg-cyan-100 text-cyan-800 border-cyan-200'
    if (levelFromRoot === 5) return 'bg-sky-100 text-sky-800 border-sky-200'
    if (levelFromRoot === 6) return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    if (levelFromRoot === 7) return 'bg-purple-100 text-purple-800 border-purple-200'
    if (levelFromRoot === 8) return 'bg-pink-100 text-pink-800 border-pink-200'
    if (levelFromRoot === 9) return 'bg-rose-100 text-rose-800 border-rose-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="select-none">
      {/* VISUALIZAÇÃO MOBILE - Layout otimizado e organizado */}
      <div className="sm:hidden">
        <div 
          className={`
            py-4 px-4 rounded-xl transition-all duration-200 cursor-pointer
            hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200
            ${level === 0 ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm' : 'bg-white'}
            ${!node.isActive ? 'opacity-60 bg-gray-50' : ''}
            ${level > 0 ? 'ml-3' : ''}
          `}
          onClick={handleNodeClick}
        >
          {/* Container principal com indentação responsiva */}
          <div className="flex items-start space-x-3" style={{ marginLeft: `${Math.min(level * 12, 48)}px` }}>
            {/* Coluna 1: Controles de expansão */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Ícone de expansão */}
              {hasChildren && canExpand && (
                <button
                  onClick={handleNodeClick}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title={isExpanded ? "Contrair nível" : "Expandir nível"}
                >
                  {isExpanded ? (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )}
              
              {/* Espaçador quando não há expansão */}
              {(!hasChildren || !canExpand) && (
                <div className="w-8" />
              )}
            </div>

            {/* Coluna 2: Ícone do nível */}
            <div className="flex-shrink-0">
              {getLevelIcon(level)}
            </div>

            {/* Coluna 3: Informações principais organizadas */}
            <div className="flex-1 min-w-0">
              {/* Linha 1: Nome + Nível + Status */}
              <div className="flex items-center space-x-2 mb-2">
                <span className={`font-semibold text-base ${getLevelColor(level)} truncate flex-1`}>
                  {node.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${getLevelBadgeColor(node.levelFromRoot)} flex-shrink-0`}>
                  Nível {node.levelFromRoot}
                </span>
                {!node.isActive && (
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 font-medium flex-shrink-0">
                    Inativo
                  </span>
                )}
              </div>
              
              {/* Linha 2: Email + Carreira */}
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center space-x-1 flex-1 min-w-0">
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <span className="text-xs text-gray-600 truncate">{node.email}</span>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-lg font-medium border border-gray-200">
                    {node.careerLevel || 'Iniciante'}
                  </span>
                </div>
              </div>
              
              {/* Linha 3: Pacote + Filhos + Pontos */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* Pacote */}
                  {node.packageName && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 font-medium">
                        {node.packageName}
                      </span>
                    </div>
                  )}
                  
                  {/* Contador de filhos */}
                  {hasChildren && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        {node.children.length}
                      </span>
                    </div>
                  )}
                  
                  {/* Volume da equipe */}
                  {node.teamVolume > 0 && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200 font-medium">
                        {node.teamVolume.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Pontos totais */}
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="font-semibold text-gray-800 text-sm">
                    {displayPoints.toLocaleString('pt-BR')} pts
                  </span>
                </div>
              </div>
              
              {/* Linha 4: Botão Explorar (opcional para mobile) */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleExploreClick}
                  className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 font-medium hover:shadow-sm"
                  title="Clique para navegar para este usuário"
                >
                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO DESKTOP - Layout completo e organizado */}
      <div className="hidden sm:block">
        <div 
          className={`
            py-4 px-5 rounded-xl transition-all duration-200 cursor-pointer
            hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200
            ${level === 0 ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm' : 'bg-white'}
            ${!node.isActive ? 'opacity-60 bg-gray-50' : ''}
            ${level > 0 ? 'ml-3' : ''}
          `}
          onClick={handleNodeClick}
        >
          {/* Container principal com indentação responsiva - TUDO EM UMA LINHA */}
          <div className="flex items-center space-x-4" style={{ marginLeft: `${Math.min(level * 16, 80)}px` }}>
            {/* Coluna 1: Controles de expansão */}
            <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Ícone de expansão */}
            {hasChildren && canExpand && (
              <button
                onClick={handleNodeClick}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title={isExpanded ? "Contrair nível" : "Expandir nível"}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )}
            
            {/* Espaçador quando não há expansão */}
            {(!hasChildren || !canExpand) && (
                <div className="w-10" />
            )}
            </div>

            {/* Coluna 2: Ícone do nível */}
            <div className="flex-shrink-0">
              {getLevelIcon(level)}
            </div>

            {/* Coluna 3: Nome do usuário */}
            <div className="flex-shrink-0 min-w-0">
              <span className={`font-semibold text-base ${getLevelColor(level)} truncate block`}>
                    {node.name}
                  </span>
            </div>

            {/* Coluna 4: Badge de nível */}
            <div className="flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${getLevelBadgeColor(node.levelFromRoot)}`}>
                    Nível {node.levelFromRoot}
                  </span>
                </div>
                
            {/* Coluna 5: Status ativo/inativo */}
            <div className="flex-shrink-0">
                  {!node.isActive && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 font-medium">
                      Inativo
                    </span>
                  )}
                </div>

            {/* Coluna 6: Email */}
            <div className="flex-shrink-0 min-w-0">
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <span className="text-xs text-gray-600 truncate max-w-32">{node.email}</span>
              </div>
            </div>

            {/* Coluna 7: Carreira */}
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-lg font-medium border border-gray-200">
                  {node.careerLevel || 'Iniciante'}
                </span>
              </div>
              </div>
              
            {/* Coluna 8: Pacote */}
                  {node.packageName && (
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 font-medium">
                    {node.packageName}
                    </span>
                </div>
              </div>
            )}

            {/* Coluna 9: Contador de filhos */}
            {hasChildren && (
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    {node.children.length}
                  </span>
                </div>
              </div>
            )}

            {/* Coluna 10: Volume da equipe */}
            {node.teamVolume > 0 && (
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200 font-medium">
                    {node.teamVolume.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            {/* Coluna 11: Pontos totais */}
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-semibold text-gray-800 text-sm">
                  {displayPoints.toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>

            {/* Coluna 12: Botão Explorar */}
            <div className="flex-shrink-0 ml-auto">
              <button
                onClick={handleExploreClick}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 font-medium hover:shadow-sm"
                title="Clique para navegar para este usuário"
              >
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filhos expandidos - Linha de conexão mais elegante */}
      {isExpanded && hasChildren && canExpand && (
        <div className="ml-6 sm:ml-8 border-l-2 border-gray-100">
          {node.children.map((child, index) => (
            <div key={child.id} className="relative">
              {/* Linha de conexão horizontal mais sutil */}
              <div className="absolute left-0 top-0 w-4 sm:w-6 h-0.5 bg-gradient-to-r from-gray-200 to-transparent" />
              <TreeNode
                node={child}
                level={level + 1}
                onNodeClick={onNodeClick}
                maxDepth={maxDepth}
                loggedInUserId={loggedInUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const UnilevelListView: React.FC<UnilevelListViewProps> = ({ 
  data, 
  onNodeClick, 
  maxDepth = 5,
  loggedInUserId
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header melhorado - Responsivo */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Visualização em Lista</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">
              Clique na linha ou seta para expandir/contrair • Botão para navegar • Níveis em relação ao usuário logado original
            </p>
            <p className="text-sm text-gray-600 mt-1 sm:hidden">
              Toque para expandir/contrair • Layout otimizado para mobile
            </p>
          </div>
        </div>
      </div>

      {/* Árvore com padding melhorado - Responsivo */}
      <div className="p-3 sm:p-5 bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <TreeNode
            node={data}
            level={0}
            onNodeClick={onNodeClick}
            maxDepth={maxDepth}
            loggedInUserId={loggedInUserId}
          />
        </div>
      </div>
    </div>
  )
}

export default UnilevelListView

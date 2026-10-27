'use client'

import React, { useState } from 'react'

interface UnilevelNodeData {
  id: number
  name: string
  email: string
  level: number
  isActive: boolean
  packageName?: string
  totalPoints: number
  teamVolume: number
  careerLevel?: string
  isRoot?: boolean
  levelFromRoot?: number
  onNodeClick?: (nodeId: number) => void
}

interface UnilevelNetworkNodeProps {
  data: UnilevelNodeData
}

const UnilevelNetworkNode: React.FC<UnilevelNetworkNodeProps> = ({ data }) => {
  const { 
    id, 
    name, 
    email, 
    level, 
    isRoot, 
    packageName, 
    totalPoints, 
    teamVolume, 
    careerLevel, 
    isActive, 
    levelFromRoot,
    onNodeClick 
  } = data

  const [showDetails, setShowDetails] = useState(false)

  const getNodeStyle = () => {
    // Todos os nós agora usam a mesma cor clara
    return "bg-blue-50 text-gray-800 border-2 border-blue-200 hover:border-blue-300"
  }

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0]
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onNodeClick && !isRoot) {
      onNodeClick(id)
    } else {
      // Se for raiz ou não tiver onNodeClick, apenas mostrar detalhes
      setShowDetails(!showDetails)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="unilevel-network-node relative">
      {/* Nó principal com layout melhorado */}
      <div 
        className={`
          relative px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${getNodeStyle()}
          hover:scale-105 hover:shadow-lg
          flex flex-col items-center justify-center
          min-w-[160px] max-w-[200px]
          mx-auto
        `}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as any)
          }
        }}
      >
        {/* Nome do usuário */}
        <div className="font-bold text-sm text-center leading-tight text-gray-900">
          {getFirstName(name)}
        </div>
        
        {/* Nível na rede */}
        <div className="text-xs text-center leading-tight mt-1 text-blue-600 font-medium">
          Nível {levelFromRoot || level}
        </div>

        {/* Career Level */}
        {careerLevel && (
          <div className="text-xs text-center leading-tight mt-1 text-gray-600">
            {careerLevel}
          </div>
        )}

        {/* Status de Ativação - Badge pequeno */}
        <div className="mt-2">
          <span className={`
            inline-block px-2 py-1 text-xs font-medium rounded-full
            ${isActive 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
            }
          `}>
            {isActive ? '✅ ATIVO' : '❌ INATIVO'}
          </span>
        </div>

        {/* Pacote ativo - Badge pequeno */}
        {packageName && (
          <div className="mt-1">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200 font-medium">
              📦 {packageName}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip com detalhes completos */}
      {showDetails && (
        <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5">
          {/* Seta para cima */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
          
          <div className="space-y-4 text-sm">
            {/* Header com nome e email */}
            <div className="text-center border-b border-gray-200 pb-3">
              <div className="font-bold text-lg text-gray-900 mb-1">
                {name}
              </div>
              <div className="text-gray-500 text-xs">
                {email}
              </div>
            </div>

            {/* Grid de informações principais */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nível na rede */}
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 font-medium mb-1">Nível na Rede</div>
                <div className="text-lg font-bold text-blue-800">
                  {isRoot ? '🏠 Raiz' : `Nível ${levelFromRoot || level}`}
                </div>
              </div>

              {/* Career Level */}
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 font-medium mb-1">Carreira</div>
                <div className="text-lg font-bold text-green-800">
                  {careerLevel || 'N/A'}
                </div>
              </div>

              {/* Pacote ativo */}
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xs text-purple-600 font-medium mb-1">Pacote</div>
                <div className="text-lg font-bold text-purple-800">
                  {packageName || 'N/A'}
                </div>
              </div>

              {/* Status de Ativação */}
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-xs text-orange-600 font-medium mb-1">Status</div>
                <div className={`text-lg font-bold ${isActive ? 'text-green-800' : 'text-red-800'}`}>
                  {isActive ? '✅ ATIVO' : '❌ INATIVO'}
                </div>
              </div>
            </div>

            {/* Pontos e Volume da Equipe */}
            <div className="space-y-3">
              {/* Pontos pessoais */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Pontos Pessoais:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {totalPoints.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Volume da equipe */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Volume da Equipe:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(teamVolume)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão para explorar (se não for raiz) */}
            {!isRoot && (
              <div className="text-center pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onNodeClick) onNodeClick(id)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium w-full"
                >
                  🔍 Explorar Rede
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UnilevelNetworkNode

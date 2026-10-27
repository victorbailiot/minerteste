'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'

interface NetworkNodeData {
  id: number
  name: string
  email: string
  position: 'LEFT' | 'RIGHT' | null
  leftPoints: number
  rightPoints: number
  level: number
  isActive: boolean
  isRoot?: boolean
  left: NetworkNodeData | null
  right: NetworkNodeData | null
  onNodeClick?: (nodeId: number) => void
}

interface NetworkNodeProps {
  data: NetworkNodeData
  onNodeClick?: (nodeId: number) => void
}

const NetworkNode: React.FC<NetworkNodeProps> = ({ data }) => {
  const { id, name, email, position, level, isRoot, leftPoints, rightPoints, isActive, onNodeClick } = data

  const getNodeStyle = () => {
    if (isRoot) {
      return "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
    }
    
    if (position === 'LEFT') {
      return "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg"
    }
    
    return "bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg"
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🖱️ NetworkNode handleClick:', { 
      id, 
      name, 
      isRoot, 
      hasOnNodeClick: !!onNodeClick,
      position,
      level
    })
    
    // Permitir clique em qualquer nó, incluindo root
    if (onNodeClick) {
      console.log('✅ Chamando onNodeClick com id:', id)
      onNodeClick(id)
    } else {
      console.log('❌ onNodeClick não está definido')
    }
  }

  return (
    <div className="network-node">
      {/* Handle superior para receber conexões do pai */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      <div 
        className={`
          relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
          ${getNodeStyle()}
          hover:scale-105 hover:shadow-xl
          min-w-[180px]
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
        <div className="text-center">
          <div className="font-bold text-sm mb-1">{name}</div>
          

          {/* Status de Ativação */}
          <div className={`
            inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 mr-1
            ${isActive ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}
          `}>
            {isActive ? '✅ ATIVO' : '❌ INATIVO'}
          </div>

          {/* Posição na árvore */}
          {position && (
            <div className={`
              inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2
              ${position === 'LEFT' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}
            `}>
              {position === 'LEFT' ? 'Esquerda' : 'Direita'}
            </div>
          )}

          {/* Nível */}
          {level > 0 && (
            <div className="text-xs opacity-75 mt-1">
              Nível {level}
            </div>
          )}

          {/* Indicador de clique */}
          {!isRoot && (
            <div className="text-xs opacity-75 mt-1">
              👆 Clique para explorar
            </div>
          )}
        </div>
      </div>

      {/* Handles inferiores para conectar aos filhos */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="left"
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="right"
        className="w-3 h-3 !bg-orange-500 !border-2 !border-white"
        style={{ left: '75%' }}
      />
    </div>
  )
}

export default NetworkNode 
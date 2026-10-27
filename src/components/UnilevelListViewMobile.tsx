'use client'

import { useState } from 'react'

interface UnilevelNodeData {
    id: number
    name: string
    email: string
    level: number
    levelFromRoot: number
    isActive: boolean
    packageName?: string
    totalPoints: number
    networkPoints: number // Pontos da rede
    ownPoints: number // Pontos próprios
    teamVolume: number
    careerLevel?: string
    children: UnilevelNodeData[]
}

interface UnilevelListViewMobileProps {
    data: UnilevelNodeData
    onNodeClick: (nodeId: number) => void
    maxDepth?: number
    loggedInUserId?: number // ID do usuário logado para identificar quando mostrar networkPoints
}

interface TreeNodeMobileProps {
    node: UnilevelNodeData
    level: number
    onNodeClick: (nodeId: number) => void
    maxDepth: number
    loggedInUserId?: number // ID do usuário logado para identificar quando mostrar networkPoints
}

const TreeNodeMobile: React.FC<TreeNodeMobileProps> = ({ node, level, onNodeClick, maxDepth, loggedInUserId }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2)
    const hasChildren = node.children && node.children.length > 0
    const canExpand = level < maxDepth - 1

    const handleToggle = () => {
        if (canExpand) {
            setIsExpanded(!isExpanded)
        }
    }

    const handleExploreClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onNodeClick(node.id)
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

    const getStatusIcon = (isActive: boolean) => {
        return isActive ? '✅' : '❌'
    }

    return (
        <div className="w-full">
            {/* Linha principal do usuário */}
            <div
                className={`
          w-full border-b border-gray-200 py-3 px-2
          ${level === 0 ? 'bg-blue-50' : 'bg-white'}
          ${hasChildren && canExpand ? 'cursor-pointer hover:bg-gray-50' : ''}
        `}
                onClick={hasChildren && canExpand ? handleToggle : undefined}
            >
                <div className="flex items-center justify-between">
                    {/* Informações do usuário */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            {/* Ícone de nível */}
                            <span className="text-lg">{getLevelIcon(level)}</span>

                            {/* Nome e status */}
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium ${getLevelColor(level)} truncate`}>
                                    {node.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {node.email}
                                </div>
                            </div>
                        </div>

                        {/* Informações adicionais em linha */}
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                            <span>{getStatusIcon(node.isActive)} {node.isActive ? 'Ativo' : 'Inativo'}</span>


                            {/* Pacote */}
                            {node.packageName && (
                                <div className="flex items-center space-x-1">
                                    <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <span>{node.packageName}</span>
                                </div>
                            )}

                            {/* Carreira */}
                            {node.careerLevel && (
                                <div className="flex items-center space-x-1">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>{node.careerLevel}</span>
                                </div>
                            )}
                        </div>

                        {/* Pontos, volume e filhos */}
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                            {/* Pontos totais */}
                            <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>{displayPoints.toLocaleString('pt-BR')} pts</span>
                            </div>

                            <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                                <span>Nível {node.levelFromRoot}</span>
                            </div>

                            {/* Contador de filhos */}
                            {hasChildren && (
                                <div className="flex items-center space-x-1">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                                        {node.children.length} {node.children.length === 1 ? 'filho' : 'filhos'}
                                    </span>
                                </div>
                            )}

                            {/* Volume da equipe */}
                            {node.teamVolume > 0 && (
                                <div className="flex items-center space-x-1">
                                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(node.teamVolume)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center space-x-2 ml-2">
                        {/* Botão explorar */}
                        <button
                            onClick={handleExploreClick}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* Indicador de expansão */}
                        {hasChildren && canExpand && (
                            <button
                                onClick={handleToggle}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                            >
                                {isExpanded ? (
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                ) : (
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filhos expandidos */}
            {isExpanded && hasChildren && (
                <div className="ml-4 border-l-2 border-gray-200">
                    {node.children.map((child, index) => (
                        <TreeNodeMobile
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onNodeClick={onNodeClick}
                            maxDepth={maxDepth}
                            loggedInUserId={loggedInUserId}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const UnilevelListViewMobile: React.FC<UnilevelListViewMobileProps> = ({
    data,
    onNodeClick,
    maxDepth = 5,
    loggedInUserId
}) => {
    return (
        <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Cabeçalho */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm">
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Rede
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                    Toque na linha para expandir/contrair • Toque em
                    <svg className="w-3 h-3 inline mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    para explorar
                </p>
            </div>

            {/* Lista de nós */}
            <div className="w-full">
                <TreeNodeMobile
                    node={data}
                    level={0}
                    onNodeClick={onNodeClick}
                    maxDepth={maxDepth}
                    loggedInUserId={loggedInUserId}
                />
            </div>

            {/* Rodapé com instruções */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                    <p>
                        <strong>
                            <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                        </strong>
                        Raiz (Você) |
                        <strong>
                            <svg className="w-3 h-3 inline mx-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </strong>
                        Nível 1 |
                        <strong>
                            <svg className="w-3 h-3 inline mx-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                        </strong>
                        Nível 2
                    </p>
                    <p>
                        <strong>✅</strong> Ativo | <strong>❌</strong> Inativo |
                        <strong>
                            <svg className="w-3 h-3 inline mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </strong>
                        Explorar rede
                    </p>
                    <p>
                        <strong>
                            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </strong>
                        Contador de filhos |
                        <strong>
                            <svg className="w-3 h-3 inline mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </strong>
                        Pontos pessoais
                    </p>
                </div>
            </div>
        </div>
    )
}

export default UnilevelListViewMobile

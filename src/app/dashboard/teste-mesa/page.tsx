'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface TestUser {
  id: number
  name: string
  package: 'AdCentral' | 'FAMILY' | 'T-BUILD'
  packageValue: number
  points: number
  sponsorId?: number
  position?: 'LEFT' | 'RIGHT'
  level: number
}

interface SimulationStep {
  id: number
  title: string
  description: string
  newUser?: TestUser
  pointsDistribution?: {
    userId: number
    leftPoints: number
    rightPoints: number
  }[]
  cycleFormed?: {
    userId: number
    bonusAmount: number
  }
  explanation: string
}

const PACKAGES = {
  AdCentral: { value: 100, points: 5 },
  FAMILY: { value: 500, points: 25 },
  'T-BUILD': { value: 10000, points: 500 }
}

export default function TesteMesaPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [users, setUsers] = useState<TestUser[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [userPoints, setUserPoints] = useState<{ [userId: number]: { left: number, right: number } }>({})

  // Dados da simulação passo a passo
  const simulationSteps: SimulationStep[] = [
    {
      id: 0,
      title: "Inicialização do Sistema",
      description: "Configuração inicial da rede binária",
      explanation: "O sistema começa com a estrutura básica. Cada usuário pode ter até 2 pessoas diretamente abaixo (LEFT e RIGHT).",
    },
    {
      id: 1,
      title: "Primeiro Usuário - Admin",
      description: "Usuário administrador entra com pacote T-BUILD",
      newUser: {
        id: 1,
        name: "Admin",
        package: "T-BUILD",
        packageValue: 10000,
        points: 500,
        level: 0
      },
      explanation: "O primeiro usuário (Admin) entra com o pacote T-BUILD de $10.000, gerando 500 pontos que serão distribuídos na rede."
    },
    {
      id: 2,
      title: "Segundo Usuário - Lado Esquerdo",
      description: "User2 entra no lado esquerdo do Admin",
      newUser: {
        id: 2,
        name: "User2",
        package: "FAMILY",
        packageValue: 500,
        points: 25,
        sponsorId: 1,
        position: "LEFT",
        level: 1
      },
      pointsDistribution: [
        { userId: 1, leftPoints: 25, rightPoints: 0 }
      ],
      explanation: "User2 entra com pacote FAMILY ($500 = 25 pontos). Como é filho direto do Admin no lado esquerdo, o Admin ganha 25 pontos no lado LEFT."
    },
    {
      id: 3,
      title: "Terceiro Usuário - Lado Direito",
      description: "User3 entra no lado direito do Admin",
      newUser: {
        id: 3,
        name: "User3",
        package: "AdCentral",
        packageValue: 100,
        points: 5,
        sponsorId: 1,
        position: "RIGHT",
        level: 1
      },
      pointsDistribution: [
        { userId: 1, leftPoints: 25, rightPoints: 5 }
      ],
      explanation: "User3 entra com pacote AdCentral ($100 = 5 pontos) no lado direito do Admin. Agora o Admin tem 25 pontos LEFT e 5 pontos RIGHT."
    },
    {
      id: 4,
      title: "Quarto Usuário - Spillover",
      description: "User4 entra e é colocado automaticamente abaixo do User2",
      newUser: {
        id: 4,
        name: "User4",
        package: "FAMILY",
        packageValue: 500,
        points: 25,
        sponsorId: 1,
        position: "LEFT",
        level: 2
      },
      pointsDistribution: [
        { userId: 1, leftPoints: 50, rightPoints: 5 },
        { userId: 2, leftPoints: 25, rightPoints: 0 }
      ],
      explanation: "User4 é colocado automaticamente abaixo do User2 (spillover). O Admin ganha mais 25 pontos LEFT (total: 50 LEFT, 5 RIGHT). User2 também ganha 25 pontos LEFT."
    },
    {
      id: 5,
      title: "Ciclo em Formação",
      description: "Vários usuários entram para formar um ciclo",
      explanation: "Para formar um ciclo, precisamos de 900 pontos de um lado e 300 do outro. Vamos simular a entrada de mais usuários..."
    },
    {
      id: 6,
      title: "Ciclo Formado!",
      description: "Admin completa seu primeiro ciclo (900 LEFT / 300 RIGHT)",
      pointsDistribution: [
        { userId: 1, leftPoints: 900, rightPoints: 300 }
      ],
      cycleFormed: {
        userId: 1,
        bonusAmount: 600
      },
      explanation: "🎉 CICLO FORMADO! O Admin atingiu 900 pontos LEFT e 300 pontos RIGHT. Ele recebe um bônus de $600 USD e os pontos utilizados são removidos (resta 0 LEFT, 0 RIGHT)."
    }
  ]

  useEffect(() => {
    resetSimulation()
  }, [])

  const resetSimulation = () => {
    setCurrentStep(0)
    setUsers([])
    setUserPoints({})
    setIsPlaying(false)
  }

  const executeStep = (step: SimulationStep) => {
    // Adicionar novo usuário se houver
    if (step.newUser) {
      setUsers(prev => [...prev, step.newUser!])
    }

    // Atualizar pontos se houver distribuição
    if (step.pointsDistribution) {
      setUserPoints(prev => {
        const updated = { ...prev }
        step.pointsDistribution!.forEach(dist => {
          updated[dist.userId] = {
            left: dist.leftPoints,
            right: dist.rightPoints
          }
        })
        return updated
      })
    }

    // Se houve ciclo, resetar pontos do usuário
    if (step.cycleFormed) {
      setUserPoints(prev => ({
        ...prev,
        [step.cycleFormed!.userId]: { left: 0, right: 0 }
      }))
    }
  }

  const nextStep = () => {
    if (currentStep < simulationSteps.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      executeStep(simulationSteps[newStep])
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      // Reexecutar toda a simulação até o passo anterior
      resetToStep(currentStep - 1)
    }
  }

  const resetToStep = (targetStep: number) => {
    setUsers([])
    setUserPoints({})
    
    for (let i = 1; i <= targetStep; i++) {
      executeStep(simulationSteps[i])
    }
  }

  const playSimulation = async () => {
    setIsPlaying(true)
    resetSimulation()
    
    for (let i = 1; i < simulationSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCurrentStep(i)
      executeStep(simulationSteps[i])
    }
    
    setIsPlaying(false)
  }

  const renderNetworkTree = () => {
    const getPointsForUser = (userId: number) => userPoints[userId] || { left: 0, right: 0 }
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Estrutura da Rede Binária
        </h3>
        
        <div className="flex justify-center">
          <div className="space-y-8">
            {/* Nível 0 - Admin */}
            {users.filter(u => u.level === 0).map(user => {
              const points = getPointsForUser(user.id)
              return (
                <div key={user.id} className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-lg min-w-[200px] text-center">
                    <div className="font-bold text-lg">{user.name}</div>
                    <div className="text-sm opacity-90">{user.package}</div>
                    <div className="text-xs mt-1">${user.packageValue.toLocaleString()}</div>
                    <div className="mt-2 text-sm bg-white/20 rounded px-2 py-1">
                      L: {points.left} | R: {points.right}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Nível 1 */}
            <div className="flex justify-center space-x-32">
              {['LEFT', 'RIGHT'].map(side => {
                const user = users.find(u => u.level === 1 && u.position === side)
                if (!user) {
                  return (
                    <div key={side} className="w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Vazio</span>
                    </div>
                  )
                }
                
                const points = getPointsForUser(user.id)
                return (
                  <div key={user.id} className="flex flex-col items-center">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-lg shadow-md min-w-[140px] text-center">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs opacity-90">{user.package}</div>
                      <div className="text-xs">${user.packageValue.toLocaleString()}</div>
                      <div className="mt-1 text-xs bg-white/20 rounded px-1">
                        L: {points.left} | R: {points.right}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Nível 2 */}
            {users.some(u => u.level === 2) && (
              <div className="flex justify-center space-x-16">
                {users.filter(u => u.level === 2).map(user => {
                  const points = getPointsForUser(user.id)
                  return (
                    <div key={user.id} className="flex flex-col items-center">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-2 rounded-lg shadow-sm min-w-[120px] text-center">
                        <div className="font-semibold text-sm">{user.name}</div>
                        <div className="text-xs opacity-90">{user.package}</div>
                        <div className="text-xs">${user.packageValue.toLocaleString()}</div>
                        <div className="mt-1 text-xs bg-white/20 rounded px-1">
                          L: {points.left} | R: {points.right}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const currentStepData = simulationSteps[currentStep]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              Teste de Mesa - Sistema de Rede Binária
            </h1>
            <p className="text-gray-600">
              Demonstração interativa de como funciona o sistema de pontos, spillover e formação de ciclos
            </p>
          </div>

          {/* Controls */}
          <div className="bg-gray-100 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0 || isPlaying}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                
                <button
                  onClick={nextStep}
                  disabled={currentStep === simulationSteps.length - 1 || isPlaying}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                  Próximo
                </button>
                
                <button
                  onClick={playSimulation}
                  disabled={isPlaying}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  {isPlaying ? 'Executando...' : 'Play Automático'}
                </button>
                
                <button
                  onClick={resetSimulation}
                  disabled={isPlaying}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Passo {currentStep + 1} de {simulationSteps.length}
              </div>
            </div>
          </div>

          {/* Current Step Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-800 mb-2 flex items-center gap-2">
              {currentStepData.cycleFormed ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-blue-600" />
              )}
              {currentStepData.title}
            </h2>
            <p className="text-blue-700 mb-3">{currentStepData.description}</p>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-gray-700">{currentStepData.explanation}</p>
              
              {currentStepData.cycleFormed && (
                <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-semibold">
                    <DollarSign className="w-5 h-5" />
                    Bônus de Ciclo: ${currentStepData.cycleFormed.bonusAmount} USD
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    O usuário receberá este valor em sua conta e poderá solicitar saque.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Network Visualization */}
          {users.length > 0 && (
            <div className="mb-8">
              {renderNetworkTree()}
            </div>
          )}

          {/* Legend and Rules */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Regras do Sistema</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Conversão:</strong> R$ 20,00 = 1 ponto</li>
                <li>• <strong>Ciclo:</strong> 900 pontos de um lado + 300 pontos do outro</li>
                <li>• <strong>Bônus de Ciclo:</strong> $600 USD por ciclo completado</li>
                <li>• <strong>Spillover:</strong> Novos usuários são colocados automaticamente</li>
                <li>• <strong>Rede Binária:</strong> Cada usuário tem no máximo 2 filhos diretos</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pacotes Disponíveis</h3>
              <div className="space-y-3">
                {Object.entries(PACKAGES).map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center bg-white rounded p-3 shadow-sm">
                    <span className="font-medium">{name}</span>
                    <div className="text-right text-sm">
                      <div className="text-green-600 font-semibold">${data.value.toLocaleString()}</div>
                      <div className="text-gray-500">{data.points} pontos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
} 
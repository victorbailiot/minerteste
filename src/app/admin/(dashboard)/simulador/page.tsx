'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Package, 
  Play, 
  Plus, 
  Trash2, 
  TrendingUp, 
  DollarSign,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface TestUser {
  id: number
  name: string
  email: string
  sponsorId: number | null
  sponsorName: string | null
  preferredSide?: 'LEFT' | 'RIGHT' | null
}

interface Package {
  id: number
  name: string
  description: string
  price: number
  cycleBonus: number
  profitSharePercent: number
}

interface ExistingUser {
  id: number
  name: string
  email: string
}

interface SimulationResult {
  user: TestUser
  package: Package
  bonuses: {
    directBonus: number
    indirectBonuses: Array<{
      level: number
      userId: number
      userName: string
      amount: number
    }>
  }
  points: {
    leftPoints: number
    rightPoints: number
    totalPoints: number
  }
  cycles: number
  transactions: Array<{
    type: string
    amount: number
    description: string
    recipientId: number
    recipientName: string
  }>
  networkImpact: {
    affectedUsers: number
    totalBonusDistributed: number
  }
  logs: string[]
}

interface DatabaseStats {
  totalUsers: number
  usersToDelete: number
  transactions: number
  userPointsHistory: number
  userPackages: number
  userActivations: number
  cycles: number
  profitDistributions: number
  withdrawals: number
  contracts: number
  financialTransactions: number
  pixKeys: number
  bankAccounts: number
  unilevelUsers: number
  unilevelBonuses: number
  unilevelProfitDistributions: number
  unilevelUserCareer: number
  unilevelCareerQueue: number
  clube300Members: number
  paymentVouchers: number
  systemLogs: number
  estimatedTotalRecords: number
}

interface CycleExecutionResult {
  success: boolean
  message: string
  cyclesFormed?: number
  totalBonusDistributed?: number
  affectedUsers?: number
  logs?: string[]
  timestamp?: string
}

export default function SimuladorBonificacoes() {
  const [packages, setPackages] = useState<Package[]>([])
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([])
  const [testUsers, setTestUsers] = useState<TestUser[]>([])
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([])
  const [currentStep, setCurrentStep] = useState<'create-user' | 'select-package' | 'simulate'>('create-user')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [selectedSponsorId, setSelectedSponsorId] = useState<number | null>(null)
  const [selectedSide, setSelectedSide] = useState<'LEFT' | 'RIGHT' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para limpeza do banco
  const [showClearModal, setShowClearModal] = useState(false)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [clearingDatabase, setClearingDatabase] = useState(false)

  // Estados para execução de ciclos
  const [executingCycles, setExecutingCycles] = useState(false)
  const [cycleExecutionHistory, setCycleExecutionHistory] = useState<CycleExecutionResult[]>([])

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // Carregar pacotes
      const packagesResponse = await fetch('/api/packages?isActive=true')
      const packagesData = await packagesResponse.json()
      if (packagesData.success) {
        setPackages(packagesData.data)
      }

      // Carregar usuários existentes
      const usersResponse = await fetch('/api/admin/users')
      const usersData = await usersResponse.json()
      if (usersData.success) {
        setExistingUsers(usersData.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      setError('Erro ao carregar dados iniciais')
    }
  }

  const createTestUser = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validar se o lado foi selecionado quando há um patrocinador
    if (selectedSponsorId && !selectedSide) {
      setError('Selecione o lado na rede quando há um patrocinador')
      setLoading(false)
      return
    }

    try {
      const randomNumber = Math.floor(Math.random() * 10000)
      const testUserData = {
        name: `Usuário Teste ${randomNumber}`,
        email: `teste${randomNumber}@exemplo.com`,
        phone: `(11) 9${randomNumber.toString().padStart(4, '0')}-${randomNumber.toString().slice(-4)}`,
        password: '123456',
        sponsorId: selectedSponsorId,
        preferredSide: selectedSide,
        isTestUser: true
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUserData)
      })

      const data = await response.json()

      if (data.success) {
        const newTestUser: TestUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          sponsorId: data.user.sponsorId,
          sponsorName: selectedSponsorId ? existingUsers.find(u => u.id === selectedSponsorId)?.name || null : null,
          preferredSide: selectedSide
        }

        setTestUsers(prev => [...prev, newTestUser])
        setSuccess(`Usuário de teste criado com sucesso: ${newTestUser.name}`)
        setCurrentStep('select-package')
        setSelectedUserId(newTestUser.id)
        setSelectedSponsorId(null)
        setSelectedSide(null)
      } else {
        setError(data.error || 'Erro ao criar usuário de teste')
      }
    } catch (error) {
      console.error('Erro ao criar usuário de teste:', error)
      setError('Erro ao criar usuário de teste')
    } finally {
      setLoading(false)
    }
  }

  const simulatePackagePurchase = async () => {
    if (!selectedUserId || !selectedPackageId) {
      setError('Selecione um usuário e um pacote')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Simular compra do pacote
      const purchaseResponse = await fetch('/api/admin/simulator/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUserId,
          packageId: selectedPackageId,
          simulate: true
        })
      })

      const purchaseData = await purchaseResponse.json()
      console.log('Resposta da API:', purchaseData) // Debug

      if (purchaseData.success) {
        const result: SimulationResult = {
          user: testUsers.find(u => u.id === selectedUserId)!,
          package: packages.find(p => p.id === selectedPackageId)!,
          bonuses: purchaseData.data?.bonuses || { directBonus: 0, indirectBonuses: [] },
          points: purchaseData.data?.points || { leftPoints: 0, rightPoints: 0, totalPoints: 0 },
          cycles: purchaseData.data?.cycles || 0,
          transactions: purchaseData.data?.transactions || [],
          networkImpact: purchaseData.data?.networkImpact || { affectedUsers: 0, totalBonusDistributed: 0 },
          logs: purchaseData.data?.logs || []
        }

        console.log('Resultado da simulação:', result) // Debug
        setSimulationHistory(prev => [result, ...prev])
        setSuccess('Simulação executada com sucesso!')
        setCurrentStep('create-user')
        setSelectedUserId(null)
        setSelectedPackageId(null)
      } else {
        setError(purchaseData.error || 'Erro na simulação')
      }
    } catch (error) {
      console.error('Erro na simulação:', error)
      setError('Erro na simulação')
    } finally {
      setLoading(false)
    }
  }

  const clearTestUsers = async () => {
    if (testUsers.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/simulator/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: testUsers.map(u => u.id)
        })
      })

      const data = await response.json()
      if (data.success) {
        setTestUsers([])
        setSimulationHistory([])
        setSuccess('Usuários de teste removidos com sucesso')
      } else {
        setError(data.error || 'Erro ao remover usuários de teste')
      }
    } catch (error) {
      console.error('Erro ao limpar usuários de teste:', error)
      setError('Erro ao limpar usuários de teste')
    } finally {
      setLoading(false)
    }
  }

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/simulator/clear-database')
      const data = await response.json()
      if (data.success) {
        setDatabaseStats(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas do banco:', error)
    }
  }

  const handleClearDatabase = async () => {
    setClearingDatabase(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/simulator/clear-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: true })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setTestUsers([])
        setSimulationHistory([])
        setShowClearModal(false)
        
        // Recarregar dados
        await loadInitialData()
        await loadDatabaseStats()
      } else {
        setError(data.error || 'Erro ao limpar banco de dados')
      }
    } catch (error) {
      console.error('Erro ao limpar banco:', error)
      setError('Erro ao limpar banco de dados')
    } finally {
      setClearingDatabase(false)
    }
  }

  const openClearModal = async () => {
    await loadDatabaseStats()
    setShowClearModal(true)
  }

  const executeCycleDistribution = async () => {
    setExecutingCycles(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/business/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        // Buscar estatísticas dos ciclos formados
        const statsResponse = await fetch('/api/admin/bonus?type=CYCLE_BONUS&limit=10')
        const statsData = await statsResponse.json()
        
        const result: CycleExecutionResult = {
          success: true,
          message: data.message,
          cyclesFormed: statsData.data?.transactions?.length || 0,
          totalBonusDistributed: statsData.data?.transactions?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) || 0,
          affectedUsers: statsData.data?.transactions?.length || 0,
          timestamp: new Date().toISOString()
        }

        setCycleExecutionHistory(prev => [result, ...prev])
        setSuccess('Distribuição de bônus de ciclo executada com sucesso!')
      } else {
        setError(data.error || 'Erro na execução da distribuição de ciclos')
      }
    } catch (error) {
      console.error('Erro ao executar distribuição de ciclos:', error)
      setError('Erro ao executar distribuição de ciclos')
    } finally {
      setExecutingCycles(false)
    }
  }

  const renderCreateUserStep = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">1. Criar Usuário de Teste</h2>
          <p className="text-gray-600 mt-1">Crie um usuário fictício para testar o sistema</p>
        </div>
        <User className="w-8 h-8 text-blue-600" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar Patrocinador (Opcional)
          </label>
          <select
            value={selectedSponsorId || ''}
            onChange={(e) => {
              const sponsorId = e.target.value ? parseInt(e.target.value) : null
              setSelectedSponsorId(sponsorId)
              if (!sponsorId) {
                setSelectedSide(null)
              }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Nenhum patrocinador</option>
            {existingUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {selectedSponsorId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Lado na Rede
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSide('LEFT')}
                className={`p-3 border rounded-lg text-center transition-all ${
                  selectedSide === 'LEFT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Lado Esquerdo</div>
                <div className="text-sm text-gray-600">LEFT</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSide('RIGHT')}
                className={`p-3 border rounded-lg text-center transition-all ${
                  selectedSide === 'RIGHT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Lado Direito</div>
                <div className="text-sm text-gray-600">RIGHT</div>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Selecione o lado da rede binária onde o usuário será posicionado
            </p>
          </div>
        )}

        <button
          onClick={createTestUser}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Criando usuário...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Criar Usuário de Teste
            </>
          )}
        </button>
      </div>

      {testUsers.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Usuários de Teste Criados</h3>
            <button
              onClick={clearTestUsers}
              className="text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Todos
            </button>
          </div>
          <div className="space-y-2">
            {testUsers.map(user => (
              <div key={user.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.sponsorName && (
                      <p className="text-sm text-blue-600">
                        Patrocinador: {user.sponsorName}
                        {user.preferredSide && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {user.preferredSide === 'LEFT' ? 'Esquerda' : 'Direita'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">ID: {user.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderSelectPackageStep = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">2. Selecionar Pacote</h2>
          <p className="text-gray-600 mt-1">Escolha um pacote para o usuário de teste</p>
        </div>
        <Package className="w-8 h-8 text-green-600" />
      </div>

      {selectedUserId && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Usuário selecionado: {testUsers.find(u => u.id === selectedUserId)?.name}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map(pkg => (
          <div
            key={pkg.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedPackageId === pkg.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedPackageId(pkg.id)}
          >
            <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
            <div className="mt-3 space-y-1">
              <p className="text-lg font-bold text-green-600">R$ {pkg.price.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Bônus Ciclo: R$ {pkg.cycleBonus.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Participação: {pkg.profitSharePercent}%</p>
            </div>
          </div>
        ))}
      </div>

      {selectedPackageId && (
        <div className="mt-6">
          <button
            onClick={() => setCurrentStep('simulate')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Prosseguir para Simulação
          </button>
        </div>
      )}
    </div>
  )

  const renderSimulateStep = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">3. Executar Simulação</h2>
          <p className="text-gray-600 mt-1">Execute o fluxo completo de bonificações</p>
        </div>
        <Play className="w-8 h-8 text-purple-600" />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Usuário</h3>
            <p className="text-sm text-blue-700">
              {testUsers.find(u => u.id === selectedUserId)?.name}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-green-900">Pacote</h3>
            <p className="text-sm text-green-700">
              {packages.find(p => p.id === selectedPackageId)?.name} - R$ {packages.find(p => p.id === selectedPackageId)?.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-medium text-yellow-900 mb-2">O que será simulado:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Simulação de pagamento aprovado</li>
            <li>• Distribuição de bônus de indicação (direta e indireta)</li>
            <li>• Distribuição de pontos na rede binária</li>
            <li>• Verificação e formação de ciclos</li>
            <li>• Atualização da estrutura de rede</li>
          </ul>
        </div>

        <button
          onClick={simulatePackagePurchase}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Executando simulação...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Executar Simulação Completa
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderSimulationResults = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Histórico de Simulações</h2>
        
        {simulationHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma simulação executada ainda</p>
        ) : (
          <div className="space-y-4">
            {simulationHistory.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {result.user?.name || 'Usuário não identificado'} - {result.package?.name || 'Pacote não identificado'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Valor: R$ {(result.package?.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Simulação #{simulationHistory.length - index}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Bônus Distribuído</h4>
                    <p className="text-lg font-bold text-green-600">
                      R$ {(result.networkImpact?.totalBonusDistributed || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Pontos Distribuídos</h4>
                    <p className="text-lg font-bold text-blue-600">
                      {result.points?.totalPoints || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900">Usuários Impactados</h4>
                    <p className="text-lg font-bold text-purple-600">
                      {result.networkImpact?.affectedUsers || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Transações Geradas</h4>
                    <div className="space-y-2">
                      {(result.transactions || []).length > 0 ? (
                        result.transactions.map((transaction, txIndex) => (
                          <div key={txIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {transaction.recipientName || 'Usuário não identificado'}
                              </p>
                              <p className="text-xs text-gray-600">{transaction.description || 'Sem descrição'}</p>
                            </div>
                            <div className="text-sm font-bold text-green-600">
                              R$ {(transaction.amount || 0).toFixed(2)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Nenhuma transação gerada</p>
                      )}
                    </div>
                  </div>

                  <details className="border-t pt-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      Ver Logs Detalhados
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
                      {(result.logs || []).length > 0 ? (
                        result.logs.map((log, logIndex) => (
                          <div key={logIndex}>{log}</div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">Nenhum log disponível</p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderCycleExecutionSection = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Distribuição de Bônus de Ciclo</h2>
          <p className="text-gray-600 mt-1">Execute manualmente a verificação e formação de ciclos</p>
        </div>
        <RefreshCw className="w-8 h-8 text-orange-600" />
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-orange-50 rounded-lg">
          <h3 className="font-medium text-orange-900 mb-2">O que será executado:</h3>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• Verificação de usuários com pontos suficientes (900/300)</li>
            <li>• Formação automática de ciclos para usuários ativos</li>
            <li>• Distribuição de bônus de ciclo conforme pacote</li>
            <li>• Consumo de pontos utilizados nos ciclos</li>
            <li>• Registro de transações de bônus</li>
          </ul>
        </div>

        <button
          onClick={executeCycleDistribution}
          disabled={executingCycles}
          className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {executingCycles ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Executando distribuição...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Executar Distribuição de Ciclos
            </>
          )}
        </button>
      </div>

      {/* Histórico de execuções */}
      {cycleExecutionHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Execuções</h3>
          <div className="space-y-3">
            {cycleExecutionHistory.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      Execução #{cycleExecutionHistory.length - index}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {result.timestamp ? new Date(result.timestamp).toLocaleString('pt-BR') : 'Agora'}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{result.message}</p>

                {result.success && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-600 font-medium">Ciclos Formados</p>
                      <p className="text-lg font-bold text-green-700">{result.cyclesFormed || 0}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600 font-medium">Bônus Distribuído</p>
                      <p className="text-lg font-bold text-blue-700">
                        R$ {(result.totalBonusDistributed || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <p className="text-xs text-purple-600 font-medium">Usuários Afetados</p>
                      <p className="text-lg font-bold text-purple-700">{result.affectedUsers || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderClearDatabaseModal = () => (
    showClearModal && (
      <div className="fixed inset-0 bg-black/45 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
              Limpar Banco de Dados
            </h3>
            
            <p className="text-center text-gray-600 mb-6">
              ⚠️ Esta ação irá remover <strong>PERMANENTEMENTE</strong> todos os dados de teste do sistema!
            </p>

            {databaseStats && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Registros que serão removidos:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Usuários (exceto admin):</span>
                    <span className="font-semibold text-red-600">{databaseStats.usersToDelete || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transações:</span>
                    <span className="font-semibold text-red-600">{databaseStats.transactions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pontos:</span>
                    <span className="font-semibold text-red-600">{databaseStats.userPointsHistory || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pacotes de Usuários:</span>
                    <span className="font-semibold text-red-600">{databaseStats.userPackages || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ativações:</span>
                    <span className="font-semibold text-red-600">{databaseStats.userActivations || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ciclos:</span>
                    <span className="font-semibold text-red-600">{databaseStats.cycles || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distribuições:</span>
                    <span className="font-semibold text-red-600">{databaseStats.profitDistributions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saques:</span>
                    <span className="font-semibold text-red-600">{databaseStats.withdrawals || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contratos:</span>
                    <span className="font-semibold text-red-600">{databaseStats.contracts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transações Financeiras:</span>
                    <span className="font-semibold text-red-600">{databaseStats.financialTransactions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chaves PIX:</span>
                    <span className="font-semibold text-red-600">{databaseStats.pixKeys || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contas Bancárias:</span>
                    <span className="font-semibold text-red-600">{databaseStats.bankAccounts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usuários Unilevel:</span>
                    <span className="font-semibold text-red-600">{databaseStats.unilevelUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bônus Unilevel:</span>
                    <span className="font-semibold text-red-600">{databaseStats.unilevelBonuses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distribuições Unilevel:</span>
                    <span className="font-semibold text-red-600">{databaseStats.unilevelProfitDistributions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Histórico de Carreira:</span>
                    <span className="font-semibold text-red-600">{databaseStats.unilevelUserCareer || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fila de Carreira:</span>
                    <span className="font-semibold text-red-600">{databaseStats.unilevelCareerQueue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Membros Clube 300:</span>
                    <span className="font-semibold text-red-600">{databaseStats.clube300Members || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vouchers de Pagamento:</span>
                    <span className="font-semibold text-red-600">{databaseStats.paymentVouchers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logs do Sistema:</span>
                    <span className="font-semibold text-red-600">{databaseStats.systemLogs || 0}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total de registros:</span>
                    <span className="text-red-600">{databaseStats.estimatedTotalRecords || 0}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita! O usuário administrador (ID = 1) será mantido.
                </div>
              </div>
            </div>
          </div>
          
          {/* Botões fixos na parte inferior */}
          <div className="p-6 pt-0 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearingDatabase}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearDatabase}
                disabled={clearingDatabase}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {clearingDatabase ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Limpando...
                  </>
                ) : (
                  'Confirmar Limpeza'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Simulador de Bonificações</h1>
            <p className="text-gray-600 mt-2">
              Teste interativo do fluxo completo de cadastro, compra e bonificações
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={openClearModal}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Limpar Banco
            </button>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${currentStep === 'create-user' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`w-3 h-3 rounded-full ${currentStep === 'select-package' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-3 h-3 rounded-full ${currentStep === 'simulate' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Seção de Distribuição de Ciclos */}
      {renderCycleExecutionSection()}

      {/* Etapas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${currentStep === 'create-user' ? 'lg:col-span-2' : ''}`}>
          {renderCreateUserStep()}
        </div>
        
        {currentStep === 'select-package' && (
          <div className="lg:col-span-2">
            {renderSelectPackageStep()}
          </div>
        )}
        
        {currentStep === 'simulate' && (
          <div className="lg:col-span-2">
            {renderSimulateStep()}
          </div>
        )}
      </div>

      {/* Resultados */}
      {renderSimulationResults()}

      {/* Modal de limpeza do banco */}
      {renderClearDatabaseModal()}
    </div>
  )
} 
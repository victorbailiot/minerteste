'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { 
  FinancialSummaryResponse, 
  FinancialTransactionResponse,
  CreateFinancialTransactionInput 
} from '@/types/financial'
import { FinancialTransactionForm } from '@/components/FinancialTransactionForm'
import { FinancialTransactionTable } from '@/components/FinancialTransactionTable'
import { FinancialChart } from '@/components/FinancialChart'
import Loading from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Edit3,
  Eye,
  Download,
  File,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  User,
  Scale,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface MinerOption {
  id: number
  name: string
}

// Função para traduzir categorias para português
const translateCategory = (category: string): string => {
  const translations: { [key: string]: string } = {
    // Receitas
    'SALE': 'Venda de Cobre',
    'INVESTMENT': 'Investimento',
    'GRANT': 'Subsídio',
    'LOAN': 'Empréstimo',
    
    // Custos Operacionais - Extração e Processamento
    'FUEL': 'Combustível/Gasolina',
    'EXPLOSIVES': 'Explosivos',
    'PROCESSING': 'Processamento/Beneficiamento',
    'WATER': 'Água',
    'ENERGY': 'Energia/Eletricidade',
    
    // Equipamentos e Manutenção
    'EQUIPMENT': 'Equipamentos e Máquinas',
    'MAINTENANCE': 'Manutenção de Equipamentos',
    'REPAIRS': 'Reparos',
    'SUPPLY_PURCHASE': 'Compra de Suprimentos/Peças',
    
    // Transporte e Logística
    'TRANSPORT': 'Transporte Interno',
    'FREIGHT': 'Frete/Transporte Externo',
    
    // Recursos Humanos
    'SALARY': 'Salários',
    'LABOR': 'Mão de Obra',
    'TRAINING': 'Treinamento',
    'TRAVEL': 'Viagens',
    
    // Infraestrutura e Serviços
    'RENTAL': 'Aluguel',
    'UTILITIES': 'Utilidades (Água, Luz, Telefone)',
    'OFFICE': 'Despesas de Escritório',
    'SUBSCRIPTION': 'Assinaturas e Serviços',
    
    // Exploração e Desenvolvimento
    'EXPLORATION': 'Exploração e Avaliação',
    'DEVELOPMENT': 'Desenvolvimento e Construção',
    'CONSULTING': 'Consultoria Técnica',
    
    // Compliance e Legal
    'ENVIRONMENTAL': 'Compliance Ambiental',
    'INSURANCE': 'Seguros',
    'LEGAL': 'Despesas Jurídicas',
    'TAX': 'Impostos e Taxas',
    'PENALTY': 'Multas',
    
    // Marketing e Vendas
    'MARKETING': 'Marketing e Publicidade',
    
    // Financeiro
    'INTEREST': 'Juros',
    'DEPRECIATION': 'Depreciação',
    'PROFIT_DISTRIBUTION': 'Divisão de Lucro',
    'ADJUSTMENT': 'Ajuste Contábil',
    
    // Outros
    'OTHER': 'Outros',
    
    // Compatibilidade (legado)
    'SALES': 'Vendas'
  }
  
  return translations[category] || category
}

export default function FinancialDashboard() {
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null)
  const [transactions, setTransactions] = useState<FinancialTransactionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransactionResponse | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<FinancialTransactionResponse | null>(null)
  const [showProfitDistributionModal, setShowProfitDistributionModal] = useState(false)
  const [miners, setMiners] = useState<MinerOption[]>([])
  const [loadingMiners, setLoadingMiners] = useState(false)
  const [profitDistributionData, setProfitDistributionData] = useState({
    totalProfit: '',
    minerId: ''
  })
  const [viewingTransaction, setViewingTransaction] = useState<FinancialTransactionResponse | null>(null)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)
  const { isSuperAdmin } = usePermissions()

  // Função para aplicar máscara de moeda
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseInt(numbers) / 100
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Função para extrair valor numérico da máscara
  const parseCurrencyInput = (formattedValue: string): number => {
    // Remove símbolos de moeda e espaços
    const cleanValue = formattedValue.replace(/[R$\s.]/g, '').replace(',', '.')
    return parseFloat(cleanValue) || 0
  }
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  })

  const loadMiners = useCallback(async () => {
    try {
      setLoadingMiners(true)
      const response = await fetch('/api/miners')
      const result = await response.json()

      if (response.ok && result.success) {
        const mappedMiners = (result.data || []).map((miner: { id: string; name: string }) => ({
          id: Number(miner.id),
          name: miner.name
        }))
        setMiners(mappedMiners)
      }
    } catch (error) {
      console.error('Erro ao carregar mineradoras:', error)
      toast.error('Erro ao carregar mineradoras')
    } finally {
      setLoadingMiners(false)
    }
  }, [])

  // Carregar resumo financeiro
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/financial/summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      } else {
        console.error('Erro na resposta:', await response.text())
      }
    } catch (error) {
      console.error('Erro ao carregar resumo financeiro:', error)
    }
  }, [])

  // Carregar transações
  const loadTransactions = useCallback(async (customFilters?: typeof filters) => {
    try {
      const filtersToUse = customFilters || filters
      const params = new URLSearchParams()
      
      // Adicionar timezone do cliente (detecta automaticamente do navegador)
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      params.append('timezone', userTimezone)
      
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/financial?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    }
  }, [filters])

  // Criar nova transação
  const handleCreateTransaction = async (data: CreateFinancialTransactionInput) => {
    try {
      // Toast de loading
      const loadingToast = toast.loading('Salvando transação...', {
        description: 'Aguarde enquanto processamos sua solicitação.',
        icon: <CheckCircle className="w-5 h-5" />
      })

      // Preparar dados limpos, removendo campos undefined/NaN
      const cleanData: any = {
        type: data.type,
        category: data.category,
        description: data.description || '',
        transactionDate: data.transactionDate,
        totalAmount: Number(data.totalAmount)
      }

      // Adicionar quantity e unitPrice apenas se tiverem valores válidos
      if (data.quantity !== undefined && !isNaN(Number(data.quantity))) {
        cleanData.quantity = Number(data.quantity)
      }
      
      if (data.unitPrice !== undefined && !isNaN(Number(data.unitPrice))) {
        cleanData.unitPrice = Number(data.unitPrice)
      }

      const response = await fetch('/api/financial', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar transação')
      }

      const result = await response.json()
      
      setShowForm(false)
      await loadSummary()
      await loadTransactions()
      
      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast)
      toast.success('Transação criada com sucesso!', {
        description: `${data.type === 'INCOME' ? 'Entrada' : 'Saída'} de ${formatCurrency(data.totalAmount)} registrada.`,
        icon: <CheckCircle className="w-5 h-5" />
      })
      
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      toast.error('Erro ao criar transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    }
  }

  // Editar transação
  const handleEditTransaction = async (data: CreateFinancialTransactionInput) => {
    if (!editingTransaction) return

    try {
      // Toast de loading
      const loadingToast = toast.loading('Atualizando transação...', {
        description: 'Aguarde enquanto processamos as alterações.',
        icon: <Edit3 className="w-5 h-5" />
      })

      // Preparar dados limpos, removendo campos undefined/NaN
      const cleanData: any = {
        type: data.type,
        category: data.category,
        description: data.description || '',
        transactionDate: data.transactionDate,
        totalAmount: Number(data.totalAmount)
      }

      // Adicionar quantity e unitPrice apenas se tiverem valores válidos
      if (data.quantity !== undefined && !isNaN(Number(data.quantity))) {
        cleanData.quantity = Number(data.quantity)
      }
      
      if (data.unitPrice !== undefined && !isNaN(Number(data.unitPrice))) {
        cleanData.unitPrice = Number(data.unitPrice)
      }

      // Adicionar receiptUrls se existir
      if (data.receiptUrls !== undefined) {
        cleanData.receiptUrls = data.receiptUrls
      }

      const response = await fetch(`/api/financial/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar transação')
      }

      setEditingTransaction(null)
      await loadSummary()
      await loadTransactions()
      
      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast)
      toast.success('Transação atualizada com sucesso!', {
        description: `${data.type === 'INCOME' ? 'Entrada' : 'Saída'} de ${formatCurrency(data.totalAmount)} foi modificada.`,
        icon: <Edit3 className="w-5 h-5" />
      })
      
    } catch (error) {
      console.error('Erro ao atualizar transação:', error)
      toast.error('Erro ao atualizar transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    }
  }

  // Abrir modal de confirmação de exclusão
  const handleDeleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (transaction) {
      setDeletingTransaction(transaction)
    }
  }

  // Confirmar exclusão
  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return

    try {
      // Toast de loading
      const loadingToast = toast.loading('Excluindo transação...', {
        description: 'Aguarde enquanto processamos a exclusão.',
        icon: <AlertTriangle className="w-5 h-5" />
      })

      const response = await fetch(`/api/financial/${deletingTransaction.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir transação')
      }

      setDeletingTransaction(null)
      await loadSummary()
      await loadTransactions()
      
      // Remover toast de loading e mostrar sucesso
      toast.dismiss(loadingToast)
      toast.success('Transação excluída com sucesso!', {
        description: `A transação foi removida do sistema.`,
        icon: <Trash2 className="w-5 h-5" />
      })
      
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      toast.error('Erro ao excluir transação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    }
  }

  // Cancelar exclusão
  const cancelDeleteTransaction = () => {
    setDeletingTransaction(null)
  }

  // Abrir modal de edição
  const handleOpenEditModal = (transaction: FinancialTransactionResponse) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  // Fechar modal
  const handleCloseModal = () => {
    setShowForm(false)
    setEditingTransaction(null)
  }

  // Exportar CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/financial/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transacoes-financeiras-${dayjs().format('YYYY-MM-DD')}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
    }
  }

  // Executar divisão de lucro
  const handleProfitDistribution = async () => {
    let loadingToast: string | number | undefined

    try {
      // Validar dados
      if (!profitDistributionData.totalProfit) {
        toast.error('Campo obrigatório não preenchido', {
          description: 'Por favor, preencha o valor do lucro.',
          icon: <XCircle className="w-5 h-5" />
        })
        return
      }

      if (!profitDistributionData.minerId) {
        toast.error('Campo obrigatório não preenchido', {
          description: 'Selecione a mineradora para a divisão de lucro.',
          icon: <XCircle className="w-5 h-5" />
        })
        return
      }

      const totalProfit = parseCurrencyInput(profitDistributionData.totalProfit)
      if (isNaN(totalProfit) || totalProfit <= 0) {
        toast.error('Valor inválido', {
          description: 'O valor do lucro deve ser um número positivo.',
          icon: <XCircle className="w-5 h-5" />
        })
        return
      }

      // Toast de loading
      loadingToast = toast.loading('Processando divisão de lucro...', {
        description: 'Esta operação pode demorar alguns instantes.',
        icon: <CheckCircle className="w-5 h-5" />
      })

      const response = await fetch('/api/business/profit-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalProfit: totalProfit,
          minerId: Number(profitDistributionData.minerId)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar divisão de lucro')
      }

      const result = await response.json()
      const distributionSummary = result.data
      
      // Remover toast de loading
      if (loadingToast) {
        toast.dismiss(loadingToast)
      }
      
      if (distributionSummary?.totalDistributed > 0) {
        toast.success('Divisão de lucro processada com sucesso!', {
          description: `${formatCurrency(distributionSummary.totalDistributed)} foi distribuído para ${distributionSummary.distributedToUsers} usuários ativos de ${distributionSummary.activePackages} pacotes.`,
          icon: <CheckCircle className="w-5 h-5" />
        })
      } else {
        toast.info('Nenhum valor distribuído', {
          description: `Nenhum usuário ativo encontrado para o período selecionado.`,
          icon: <AlertTriangle className="w-5 h-5" />
        })
      }
      
      // Limpar dados e fechar modal
      setProfitDistributionData({
        totalProfit: '',
        minerId: ''
      })
      setShowProfitDistributionModal(false)
      
      // Recarregar dados
      await loadSummary()
      await loadTransactions()
      
    } catch (error) {
      console.error('Erro ao processar divisão de lucro:', error)
      
      // Remover toast de loading se existir
      if (loadingToast) {
        toast.dismiss(loadingToast)
      }
      
      toast.error('Erro ao processar divisão de lucro', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        icon: <XCircle className="w-5 h-5" />
      })
    }
  }

  // Carregar dados iniciais apenas uma vez
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadSummary(), loadTransactions(), loadMiners()])
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Removido filters da dependência para não recarregar automaticamente

  if (loading) {
    return (
        <Loading />
    )
  }

  return (
    <div>
      {/* Cabeçalho com Resumo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-2">Gestão de transações e análise financeira</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-600">
              Nova Transação
            </Button>
            {isSuperAdmin() && (
              <Button onClick={() => setShowProfitDistributionModal(true)} className="bg-green-500 hover:bg-green-600">
                Dividir Lucro
              </Button>
            )}
            <Button onClick={handleExport} variant="outline">
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Demonstrativo - Header com botão expandir/recolher */}
        {summary && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Demonstrativo Financeiro</h2>
                {!isSummaryExpanded && summary && (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Entradas: {formatCurrency(Number(summary?.totalIncome || 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Saídas: {formatCurrency(Number(summary?.totalExpense || 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Saldo: {formatCurrency(Number(summary?.balance || 0))}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                {isSummaryExpanded ? (
                  <>
                    <span className="text-sm">Recolher</span>
                    <ChevronUp className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span className="text-sm">Expandir</span>
                    <ChevronDown className="w-5 h-5" />
                  </>
                )}
              </div>
            </button>

            {/* Cards de Resumo - Expandido */}
            {isSummaryExpanded && (
              <div className="mt-6">
                {/* Totais Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <Card className="p-6 border-l-4 border-green-500">
                <h3 className="text-lg font-semibold text-gray-600">Total Entradas</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(Number(summary?.totalIncome || 0))}
                </p>
              </Card>
              
              <Card className="p-6 border-l-4 border-red-500">
                <h3 className="text-lg font-semibold text-gray-600">Total Saídas</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(Number(summary?.totalExpense || 0))}
                </p>
              </Card>
              
              <Card className="p-6 border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-gray-600">Saldo Atual</h3>
                <p className={`text-2xl font-bold mt-2 ${Number(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Number(summary?.balance || 0))}
                </p>
              </Card>
              
              <Card className="p-6 border-l-4 border-purple-500">
                <h3 className="text-lg font-semibold text-gray-600">Vendas</h3>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {Number(summary?.totalTonnagesSold || 0).toFixed(2)}t
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Receita: {formatCurrency(Number(summary?.salesRevenue || 0))}
                </p>
                  </Card>
                </div>

                {/* Cards de Detalhes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800">Receitas do Mês</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(Number(summary?.monthlyComparison?.[summary.monthlyComparison.length - 1]?.income || 0))}
                </p>
                <div className="flex items-center mt-2">
                  <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-sm text-green-700">Este Mês</span>
                </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800">Despesas do Mês</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(Number(summary?.monthlyComparison?.[summary.monthlyComparison.length - 1]?.expense || 0))}
                </p>
                <div className="flex items-center mt-2">
                  <svg className="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-sm text-red-700">Este Mês</span>
                </div>
                  </div>
                  
                  <div className={`bg-gradient-to-br ${Number(summary?.balance || 0) >= 0 ? 'from-blue-50 to-blue-100' : 'from-orange-50 to-orange-100'} rounded-lg p-4`}>
                <h3 className="text-sm font-medium text-blue-800">Saldo do Mês</h3>
                <p className={`text-2xl font-bold mt-2 ${Number(summary?.balance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(
                    (Number(summary?.monthlyComparison?.[summary.monthlyComparison.length - 1]?.income || 0)) -
                    (Number(summary?.monthlyComparison?.[summary.monthlyComparison.length - 1]?.expense || 0))
                  )}
                </p>
                <div className="flex items-center mt-2">
                  <svg className={`w-4 h-4 mr-1 ${Number(summary?.balance || 0) >= 0 ? 'text-blue-500' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`text-sm ${Number(summary?.balance || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balanço Mensal</span>
                </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-800">Vendas do Mês</h3>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {Number(summary?.totalTonnagesSold || 0).toFixed(2)}t
                </p>
                <div className="flex items-center mt-2">
                  <svg className="w-4 h-4 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm text-purple-700">
                    {formatCurrency(Number(summary?.salesRevenue || 0))}
                  </span>
                </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Gráficos - Recolhidos junto com o demonstrativo */}
        {summary && (
          <>
            {isSummaryExpanded ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Comparativo Mensal</h3>
                  <FinancialChart 
                    data={summary.monthlyComparison.map(item => ({
                      ...item,
                      balance: item.income - item.expense
                    }))} 
                  />
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Gastos por Categoria</h3>
                  <div className="space-y-3">
                    {summary.expensesByCategory.map((expense, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{translateCategory(expense.category)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatCurrency(expense.total)}</span>
                          <span className="text-xs text-gray-500">({expense.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Gráficos e análises detalhadas disponíveis ao expandir o demonstrativo</span>
                  <span className="text-xs text-gray-400">Comparativo Mensal • Gastos por Categoria</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabela de Transações */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Transações Recentes</h3>
          <FinancialTransactionTable 
            transactions={transactions}
            filters={filters}
            onFiltersChange={async (newFilters) => {
              setFilters(newFilters)
              await loadTransactions(newFilters)
            }}
            onRefresh={async () => {
              await loadTransactions()
            }}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteTransaction}
            onView={setViewingTransaction}
          />
        </Card>

        {/* Modal do Formulário */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg transform scale-100 transition-transform duration-200 ease-in-out my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto">
                <FinancialTransactionForm 
                  onSubmit={editingTransaction ? handleEditTransaction : handleCreateTransaction}
                  onCancel={handleCloseModal}
                  transaction={editingTransaction}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deletingTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-transform duration-200 ease-in-out">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Confirmar Exclusão
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Tem certeza que deseja excluir esta transação?
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Tipo:</span>
                  <span className={`text-sm font-semibold ${deletingTransaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {deletingTransaction.type === 'INCOME' ? 'Entrada' : 'Saída'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Valor:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(deletingTransaction.totalAmount))}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Categoria:</span>
                  <span className="text-sm text-gray-900">{deletingTransaction.category}</span>
                </div>
                
                {deletingTransaction.description && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Descrição:</span>
                    <span className="text-sm text-gray-900 truncate max-w-32" title={deletingTransaction.description}>
                      {deletingTransaction.description}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={cancelDeleteTransaction}
                  variant="outline" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmDeleteTransaction}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização Completa da Transação */}
        {viewingTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col transform scale-100 transition-transform duration-200 ease-in-out">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Detalhes da Transação
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ID: {viewingTransaction.id}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTransaction(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informações Básicas */}
                  <Card className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-gray-400" />
                      Informações Básicas
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Tipo:</span>
                        <Badge className={viewingTransaction.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {viewingTransaction.type === 'INCOME' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Categoria:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {translateCategory(viewingTransaction.category)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Data:</span>
                        <span className="text-sm text-gray-900">
                          {dayjs(viewingTransaction.transactionDate).format('DD/MM/YYYY [às] HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Valor Total:</span>
                        <span className={`text-lg font-bold ${
                          viewingTransaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {viewingTransaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(Number(viewingTransaction.totalAmount))}
                        </span>
                      </div>
                      
                      {viewingTransaction.quantity && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Quantidade:</span>
                          <span className="text-sm text-gray-900">
                            {Number(viewingTransaction.quantity).toFixed(3)} ton
                          </span>
                        </div>
                      )}
                      
                      {viewingTransaction.unitPrice && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-600">Preço Unitário:</span>
                          <span className="text-sm text-gray-900">
                            {formatCurrency(Number(viewingTransaction.unitPrice))}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm font-medium text-gray-600">Descrição:</span>
                        <span className="text-sm text-gray-900 text-right max-w-xs">
                          {viewingTransaction.description || '-'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Informações Adicionais */}
                  <Card className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-gray-400" />
                      Informações Adicionais
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Usuário:</span>
                        <span className="text-sm text-gray-900">
                          {(transactions.find(t => t.id === viewingTransaction.id) as any)?.user?.name || 'Sistema'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Criado em:</span>
                        <span className="text-sm text-gray-900">
                          {dayjs(viewingTransaction.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Atualizado em:</span>
                        <span className="text-sm text-gray-900">
                          {dayjs(viewingTransaction.updatedAt).format('DD/MM/YYYY [às] HH:mm')}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Comprovantes */}
                <Card className="p-6 mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-400" />
                    Comprovantes 
                    {viewingTransaction.receiptUrls && viewingTransaction.receiptUrls.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({viewingTransaction.receiptUrls.length})
                      </span>
                    )}
                  </h4>
                  {viewingTransaction.receiptUrls && viewingTransaction.receiptUrls.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {viewingTransaction.receiptUrls.map((url: string, index: number) => {
                        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url)
                        const isPdf = /\.pdf$/i.test(url)
                        const fileName = url.split('/').pop() || `comprovante-${index + 1}`
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            {isImage ? (
                              <div className="relative group">
                                <Image
                                  src={url}
                                  alt={`Comprovante ${index + 1}`}
                                  width={400}
                                  height={192}
                                  className="w-full h-48 object-cover"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="flex gap-2">
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                      title="Visualizar"
                                    >
                                      <Eye className="w-5 h-5 text-gray-700" />
                                    </a>
                                    <a
                                      href={url}
                                      download={fileName}
                                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                                      title="Baixar"
                                    >
                                      <Download className="w-5 h-5 text-gray-700" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : isPdf ? (
                              <div className="p-8 bg-red-50 flex flex-col items-center justify-center min-h-[200px]">
                                <File className="w-16 h-16 text-red-500 mb-4" />
                                <p className="text-sm font-medium text-gray-700 mb-2 truncate max-w-full px-2">
                                  {fileName}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Visualizar
                                  </a>
                                  <a
                                    href={url}
                                    download={fileName}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Baixar
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="p-8 bg-gray-100 flex flex-col items-center justify-center min-h-[200px]">
                                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                                <p className="text-sm font-medium text-gray-700 mb-2 truncate max-w-full px-2">
                                  {fileName}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Visualizar
                                  </a>
                                  <a
                                    href={url}
                                    download={fileName}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Baixar
                                  </a>
                                </div>
                              </div>
                            )}
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                              <p className="text-xs text-gray-600 truncate" title={fileName}>
                                {fileName}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-2">Nenhum comprovante anexado</p>
                      <p className="text-sm text-gray-500">
                        Esta transação não possui comprovantes. Você pode adicionar comprovantes ao editar a transação.
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <Button
                  onClick={() => {
                    setViewingTransaction(null)
                    handleOpenEditModal(viewingTransaction)
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => setViewingTransaction(null)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Divisão de Lucro */}
        {showProfitDistributionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-transform duration-200 ease-in-out">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Divisão de Lucro
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Distribua lucros para usuários ativos do sistema
              </p>
              
              <div className="space-y-4 mb-6">
                {/* Saldo Disponível */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">Saldo Disponível</span>
                    </div>
                    <span className={`text-lg font-bold ${Number(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Number(summary?.balance || 0))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mineradora *
                  </label>
                  <select
                    value={profitDistributionData.minerId}
                    onChange={(e) => {
                      setProfitDistributionData({
                        ...profitDistributionData,
                        minerId: e.target.value
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loadingMiners}
                  >
                    <option value="">
                      {loadingMiners ? 'Carregando mineradoras...' : 'Selecione a mineradora'}
                    </option>
                    {miners.map((miner) => (
                      <option key={miner.id} value={miner.id}>
                        {miner.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total do Lucro (R$) *
                  </label>
                  <input
                    type="text"
                    value={profitDistributionData.totalProfit}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(e.target.value)
                      setProfitDistributionData({
                        ...profitDistributionData,
                        totalProfit: formatted
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: R$ 10.000,00"
                  />
                </div>
                

              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Atenção!</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Esta ação distribuirá lucros apenas para cotas ativas da mineradora selecionada.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowProfitDistributionModal(false)}
                  variant="outline" 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleProfitDistribution}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirmar Divisão
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
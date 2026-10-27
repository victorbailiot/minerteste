'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FinancialTransactionResponse } from '@/types/financial'
import { formatCurrency } from '@/lib/utils'
import dayjs from 'dayjs'
import { File, FileText, Eye, Download, X, Loader2 } from 'lucide-react'

interface FinancialTransactionTableProps {
  transactions: FinancialTransactionResponse[]
  filters: {
    type: string
    category: string
    startDate: string
    endDate: string
    page: number
    limit: number
  }
  onFiltersChange: (filters: any) => Promise<void>
  onRefresh: () => Promise<void>
  onEdit: (transaction: FinancialTransactionResponse) => void
  onDelete: (transactionId: string) => void
  onView?: (transaction: FinancialTransactionResponse) => void
}

export const FinancialTransactionTable: React.FC<FinancialTransactionTableProps> = ({
  transactions,
  filters,
  onFiltersChange,
  onRefresh,
  onEdit,
  onDelete,
  onView
}) => {
  const [localFilters, setLocalFilters] = useState(filters)
  const [isFiltering, setIsFiltering] = useState(false)

  // Sincronizar localFilters quando filters mudarem externamente
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...localFilters, [field]: value, page: 1 }
    setLocalFilters(newFilters)
    // Não atualiza os filters do pai automaticamente
  }

  const handleApplyFilters = async () => {
    try {
      setIsFiltering(true)
      // Aplica os filtros - onFiltersChange já faz a requisição
      await onFiltersChange(localFilters)
    } finally {
      setIsFiltering(false)
    }
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      type: '',
      category: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    onRefresh()
  }

  const getTypeLabel = (type: string) => {
    return type === 'INCOME' ? 'Entrada' : 'Saída'
  }

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
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
    return categories[category] || category
  }

  const getTypeBadgeColor = (type: string) => {
    return type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-6 shadow-sm border border-gray-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filtros de Transações</h3>
          <p className="text-sm text-gray-500 mt-1">Selecione os critérios para filtrar as transações</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={localFilters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900"
            >
              <option value="">Todos</option>
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <select
              value={localFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900"
            >
              <option value="">Todas</option>
              <optgroup label="Receitas">
                <option value="SALE">Venda de Cobre</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="GRANT">Subsídio</option>
                <option value="LOAN">Empréstimo</option>
              </optgroup>
              <optgroup label="Custos Operacionais - Extração e Processamento">
                <option value="FUEL">Combustível/Gasolina</option>
                <option value="EXPLOSIVES">Explosivos</option>
                <option value="PROCESSING">Processamento/Beneficiamento</option>
                <option value="WATER">Água</option>
                <option value="ENERGY">Energia/Eletricidade</option>
              </optgroup>
              <optgroup label="Equipamentos e Manutenção">
                <option value="EQUIPMENT">Equipamentos e Máquinas</option>
                <option value="MAINTENANCE">Manutenção de Equipamentos</option>
                <option value="REPAIRS">Reparos</option>
                <option value="SUPPLY_PURCHASE">Compra de Suprimentos/Peças</option>
              </optgroup>
              <optgroup label="Transporte e Logística">
                <option value="TRANSPORT">Transporte Interno</option>
                <option value="FREIGHT">Frete/Transporte Externo</option>
              </optgroup>
              <optgroup label="Recursos Humanos">
                <option value="SALARY">Salários</option>
                <option value="LABOR">Mão de Obra</option>
                <option value="TRAINING">Treinamento</option>
                <option value="TRAVEL">Viagens</option>
              </optgroup>
              <optgroup label="Infraestrutura e Serviços">
                <option value="RENTAL">Aluguel</option>
                <option value="UTILITIES">Utilidades (Água, Luz, Telefone)</option>
                <option value="OFFICE">Despesas de Escritório</option>
                <option value="SUBSCRIPTION">Assinaturas e Serviços</option>
              </optgroup>
              <optgroup label="Exploração e Desenvolvimento">
                <option value="EXPLORATION">Exploração e Avaliação</option>
                <option value="DEVELOPMENT">Desenvolvimento e Construção</option>
                <option value="CONSULTING">Consultoria Técnica</option>
              </optgroup>
              <optgroup label="Compliance e Legal">
                <option value="ENVIRONMENTAL">Compliance Ambiental</option>
                <option value="INSURANCE">Seguros</option>
                <option value="LEGAL">Despesas Jurídicas</option>
                <option value="TAX">Impostos e Taxas</option>
                <option value="PENALTY">Multas</option>
              </optgroup>
              <optgroup label="Marketing e Vendas">
                <option value="MARKETING">Marketing e Publicidade</option>
              </optgroup>
              <optgroup label="Financeiro">
                <option value="INTEREST">Juros</option>
                <option value="DEPRECIATION">Depreciação</option>
                <option value="PROFIT_DISTRIBUTION">Divisão de Lucro</option>
                <option value="ADJUSTMENT">Ajuste Contábil</option>
              </optgroup>
              <optgroup label="Outros">
                <option value="OTHER">Outros</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={localFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={localFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            onClick={handleClearFilters} 
            variant="outline" 
            className="px-4 py-2 text-gray-700 hover:bg-gray-50 border-gray-300"
            disabled={isFiltering}
          >
            Limpar Filtros
          </Button>
          <Button 
            onClick={handleApplyFilters} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isFiltering}
          >
            {isFiltering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Filtrando...
              </>
            ) : (
              'Filtrar'
            )}
          </Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-right p-3 font-medium">Valor Total</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                transactions.map((transaction: any) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="text-sm">
                        {dayjs(transaction.transactionDate).format('DD/MM/YYYY')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayjs(transaction.transactionDate).format('HH:mm')}
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <Badge className={getTypeBadgeColor(transaction.type)}>
                        {getTypeLabel(transaction.type)}
                      </Badge>
                    </td>
                    
                    <td className="p-3">
                      <span className="text-sm font-medium">
                        {getCategoryLabel(transaction.category)}
                      </span>
                    </td>
                    
                    <td className="p-3 text-right">
                      <span className={`text-sm font-medium ${
                        transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(Number(transaction.totalAmount))}
                      </span>
                    </td>
                    
                    <td className="p-3">
                      <div className="flex gap-2">
                        {onView && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onView(transaction)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Visualizar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(transaction)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(transaction.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {transactions.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Mostrando {(filters.page - 1) * filters.limit + 1} - {Math.min(filters.page * filters.limit, transactions.length)} de {transactions.length} registros
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
              >
                Anterior
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, page: filters.page + 1 })}
                disabled={transactions.length < filters.limit}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
} 
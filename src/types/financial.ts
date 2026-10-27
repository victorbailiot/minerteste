import { z } from 'zod'

// Schemas para validação das transações financeiras
export const createFinancialTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(['SALE', 'INVESTMENT', 'ADJUSTMENT', 'FREIGHT', 'SUPPLY_PURCHASE', 'SALARY', 'TAX', 'PROFIT_DISTRIBUTION', 'FUEL', 'EQUIPMENT', 'MAINTENANCE', 'LABOR', 'EXPLOSIVES', 'PROCESSING', 'EXPLORATION', 'DEVELOPMENT', 'WATER', 'ENERGY', 'ENVIRONMENTAL', 'TRANSPORT', 'REPAIRS', 'RENTAL', 'INSURANCE', 'LEGAL', 'MARKETING', 'OFFICE', 'TRAVEL', 'TRAINING', 'CONSULTING', 'UTILITIES', 'PENALTY', 'INTEREST', 'DEPRECIATION', 'LOAN', 'GRANT', 'SUBSCRIPTION', 'OTHER']),
  description: z.string().optional(),
  transactionDate: z.string().datetime({
    message: 'Data e hora inválidas'
  }),
  quantity: z.number().positive({
    message: 'Quantidade deve ser maior que zero'
  }).optional(),
  unitPrice: z.number().positive({
    message: 'Preço unitário deve ser maior que zero'
  }).optional(),
  totalAmount: z.number().positive({
    message: 'Valor total deve ser maior que zero'
  }),
  receiptUrls: z.array(z.string().url()).optional(),
}).refine((data) => {
  // Para vendas, quantidade e preço unitário são obrigatórios
  if (data.category === 'SALE') {
    if (!data.quantity || !data.unitPrice) {
      return false
    }
    // Validar se o valor total corresponde à multiplicação
    const calculatedTotal = data.quantity * data.unitPrice
    return Math.abs(calculatedTotal - data.totalAmount) < 0.01 // permitir pequena diferença por causa de arredondamento
  }
  return true
}, {
  message: 'Para vendas, quantidade e preço unitário são obrigatórios e o valor total deve ser igual à multiplicação',
  path: ['totalAmount'] // mostrar erro no campo de valor total
})

export const updateFinancialTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.enum(['SALE', 'INVESTMENT', 'ADJUSTMENT', 'FREIGHT', 'SUPPLY_PURCHASE', 'SALARY', 'TAX', 'PROFIT_DISTRIBUTION', 'FUEL', 'EQUIPMENT', 'MAINTENANCE', 'LABOR', 'EXPLOSIVES', 'PROCESSING', 'EXPLORATION', 'DEVELOPMENT', 'WATER', 'ENERGY', 'ENVIRONMENTAL', 'TRANSPORT', 'REPAIRS', 'RENTAL', 'INSURANCE', 'LEGAL', 'MARKETING', 'OFFICE', 'TRAVEL', 'TRAINING', 'CONSULTING', 'UTILITIES', 'PENALTY', 'INTEREST', 'DEPRECIATION', 'LOAN', 'GRANT', 'SUBSCRIPTION', 'OTHER']).optional(),
  description: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  receiptUrls: z.array(z.string().url()).optional(),
})

export const getFinancialTransactionsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.enum(['SALE', 'INVESTMENT', 'ADJUSTMENT', 'FREIGHT', 'SUPPLY_PURCHASE', 'SALARY', 'TAX', 'PROFIT_DISTRIBUTION', 'FUEL', 'EQUIPMENT', 'MAINTENANCE', 'LABOR', 'EXPLOSIVES', 'PROCESSING', 'EXPLORATION', 'DEVELOPMENT', 'WATER', 'ENERGY', 'ENVIRONMENTAL', 'TRANSPORT', 'REPAIRS', 'RENTAL', 'INSURANCE', 'LEGAL', 'MARKETING', 'OFFICE', 'TRAVEL', 'TRAINING', 'CONSULTING', 'UTILITIES', 'PENALTY', 'INTEREST', 'DEPRECIATION', 'LOAN', 'GRANT', 'SUBSCRIPTION', 'OTHER']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['transactionDate', 'totalAmount', 'category']).optional().default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const getFinancialSummarySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['month', 'year', 'all']).optional().default('month'),
})

// Tipos inferidos dos schemas
export type CreateFinancialTransactionInput = z.infer<typeof createFinancialTransactionSchema>
export type UpdateFinancialTransactionInput = z.infer<typeof updateFinancialTransactionSchema>
export type GetFinancialTransactionsInput = z.infer<typeof getFinancialTransactionsSchema>
export type GetFinancialSummaryInput = z.infer<typeof getFinancialSummarySchema>

// Tipos para as respostas da API
export type FinancialTransactionResponse = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  category: string
  description: string | null
  transactionDate: string
  quantity: number | null
  unitPrice: number | null
  totalAmount: number
  receiptUrls: string[] | null
  createdAt: string
  updatedAt: string
}

export type FinancialSummaryResponse = {
  totalIncome: number
  totalExpense: number
  balance: number
  salesRevenue: number
  totalTonnagesSold: number
  monthlyComparison: Array<{
    month: string
    income: number
    expense: number
    balance: number // Adicionando o campo balance
  }>
  expensesByCategory: Array<{
    category: string
    total: number
    percentage: number
  }>
} 
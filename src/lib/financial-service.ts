import { Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { 
  CreateFinancialTransactionInput, 
  UpdateFinancialTransactionInput, 
  GetFinancialTransactionsInput,
  GetFinancialSummaryInput
} from '@/types/financial'
import dayjs from 'dayjs'

export class FinancialService {
  // Criar nova transação financeira
  static async createTransaction(data: CreateFinancialTransactionInput & { userId: string }) {
    const { userId, ...transactionData } = data
    
    // Para vendas, calcular totalAmount automaticamente
    if (transactionData.category === 'SALE' && transactionData.quantity && transactionData.unitPrice) {
      transactionData.totalAmount = transactionData.quantity * transactionData.unitPrice
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        ...transactionData,
        receiptUrls: transactionData.receiptUrls ? transactionData.receiptUrls as any : null,
        userId: BigInt(userId),
        transactionDate: new Date(transactionData.transactionDate),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return this.formatTransactionResponse(transaction)
  }

  // Atualizar transação financeira
  static async updateTransaction(id: string, data: UpdateFinancialTransactionInput) {
    const transaction = await prisma.financialTransaction.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        receiptUrls: data.receiptUrls !== undefined ? (data.receiptUrls ? data.receiptUrls as any : null) : undefined,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return this.formatTransactionResponse(transaction)
  }

  // Listar transações com filtros
  static async getTransactions(params: GetFinancialTransactionsInput) {
    const { page, limit, type, category, startDate, endDate, sortBy, sortOrder } = params

    const where: Prisma.FinancialTransactionWhereInput = {}

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) {
        where.transactionDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate)
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialTransaction.count({ where })
    ])

    return {
      transactions: transactions.map(this.formatTransactionResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }
  }

  // Obter resumo financeiro
  static async getFinancialSummary(params: GetFinancialSummaryInput): Promise<any> {
    const { startDate, endDate, period } = params

    // Definir período baseado no parâmetro period
    let dateRange: { start: Date; end: Date }
    
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      const now = dayjs()
      switch (period) {
        case 'month':
          dateRange = {
            start: now.startOf('month').toDate(),
            end: now.endOf('month').toDate()
          }
          break
        case 'year':
          dateRange = {
            start: now.startOf('year').toDate(),
            end: now.endOf('year').toDate()
          }
          break
        default:
          dateRange = {
            start: new Date(0),
            end: new Date()
          }
      }
    }

    // Totais por tipo
    const [incomeData, expenseData] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: {
          type: 'INCOME',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.financialTransaction.aggregate({
        where: {
          type: 'EXPENSE',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: {
          totalAmount: true
        }
      })
    ])

    const totalIncome = Number(incomeData._sum.totalAmount || 0)
    const totalExpense = Number(expenseData._sum.totalAmount || 0)
    const balance = totalIncome - totalExpense

    // Receita com vendas e toneladas vendidas
    const [salesData, tonnagesData] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: {
          type: 'INCOME',
          category: 'SALE',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      prisma.financialTransaction.aggregate({
        where: {
          type: 'INCOME',
          category: 'SALE',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: {
          quantity: true
        }
      })
    ])

    const salesRevenue = Number(salesData._sum.totalAmount || 0)
    const totalTonnagesSold = Number(tonnagesData._sum.quantity || 0)

    // Comparação mensal (últimos 6 meses)
    const monthlyData: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(transactionDate, '%Y-%m') as month,
        SUM(CASE WHEN type = 'INCOME' THEN totalAmount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN totalAmount ELSE 0 END) as expense
      FROM FinancialTransaction
      WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(transactionDate, '%Y-%m')
      ORDER BY month DESC
    `

    const monthlyComparison = monthlyData.map((item: any) => ({
      month: dayjs(item.month).format('MMM/YY'),
      income: Number(item.income) || 0,
      expense: Number(item.expense) || 0,
      balance: (Number(item.income) || 0) - (Number(item.expense) || 0)
    }))

    // Gastos por categoria
    const expensesByCategory = await this.getExpensesByCategory(dateRange)

    // Receitas por categoria
    const incomeByCategory = await this.getIncomeByCategory(dateRange)

    return {
      totalIncome,
      totalExpense,
      balance,
      salesRevenue,
      totalTonnagesSold,
      monthlyComparison,
      expensesByCategory,
      incomeByCategory
    }
  }

  // Obter comparação mensal
  private static async getMonthlyComparison() {
    const months: any[] = []
    const now = dayjs()
    
    for (let i = 5; i >= 0; i--) {
      const month = now.subtract(i, 'month')
      const startOfMonth = month.startOf('month').toDate()
      const endOfMonth = month.endOf('month').toDate()

      const [income, expense] = await Promise.all([
        prisma.financialTransaction.aggregate({
          where: {
            type: 'INCOME',
            transactionDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalAmount: true
          }
        }),
        prisma.financialTransaction.aggregate({
          where: {
            type: 'EXPENSE',
            transactionDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalAmount: true
          }
        })
      ])

      const incomeValue = Number(income._sum.totalAmount || 0)
      const expenseValue = Number(expense._sum.totalAmount || 0)

      months.push({
        month: month.format('MMM/YYYY'),
        income: incomeValue,
        expense: expenseValue,
        balance: incomeValue - expenseValue
      })
    }

    return months
  }

  // Obter gastos por categoria
  private static async getExpensesByCategory(dateRange: { start: Date; end: Date }) {
    const expenses = await prisma.financialTransaction.groupBy({
      by: ['category'],
      where: {
        type: 'EXPENSE',
        transactionDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      _sum: {
        totalAmount: true
      }
    })

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense._sum.totalAmount || 0), 0)

    return expenses.map(expense => ({
      category: expense.category,
      total: Number(expense._sum.totalAmount || 0),
      percentage: totalExpenses > 0 ? (Number(expense._sum.totalAmount || 0) / totalExpenses) * 100 : 0
    }))
  }

  // Obter receitas por categoria
  private static async getIncomeByCategory(dateRange: { start: Date; end: Date }) {
    const incomes = await prisma.financialTransaction.groupBy({
      by: ['category'],
      where: {
        type: 'INCOME',
        transactionDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      _sum: {
        totalAmount: true
      }
    })

    const totalIncome = incomes.reduce((sum, income) => sum + Number(income._sum.totalAmount || 0), 0)

    return incomes.map(income => ({
      category: income.category,
      total: Number(income._sum.totalAmount || 0),
      percentage: totalIncome > 0 ? (Number(income._sum.totalAmount || 0) / totalIncome) * 100 : 0
    }))
  }

  // Deletar transação
  static async deleteTransaction(id: string) {
    await prisma.financialTransaction.delete({
      where: { id: BigInt(id) }
    })
  }

  // Exportar dados para CSV
  static async exportToCsv(params: GetFinancialTransactionsInput) {
    const { transactions } = await this.getTransactions({ ...params, limit: 10000 })
    
    const csvData = transactions.map(transaction => ({
      'Data': dayjs(transaction.transactionDate).format('DD/MM/YYYY'),
      'Tipo': transaction.type === 'INCOME' ? 'Entrada' : 'Saída',
      'Categoria': transaction.category,
      'Descrição': transaction.description || '',
      'Quantidade': transaction.quantity || '',
      'Preço Unitário': transaction.unitPrice || '',
      'Valor Total': transaction.totalAmount.toFixed(2),
      'Usuário': transaction.user.name,
      'Criado em': dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')
    }))

    return csvData
  }

  // Formatar resposta da transação
  static formatTransactionResponse(transaction: any): any {
    // ReceiptUrls já vem como array do Prisma (tipo Json)
    let receiptUrls: string[] | null = null
    if (transaction.receiptUrls) {
      try {
        if (Array.isArray(transaction.receiptUrls)) {
          receiptUrls = transaction.receiptUrls
        } else if (typeof transaction.receiptUrls === 'string') {
          // Fallback para strings (caso tenha dados antigos)
          receiptUrls = JSON.parse(transaction.receiptUrls)
        } else {
          receiptUrls = transaction.receiptUrls
        }
      } catch (e) {
        receiptUrls = null
      }
    }

    return {
      id: transaction.id.toString(),
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      transactionDate: transaction.transactionDate.toISOString(),
      quantity: transaction.quantity ? Number(transaction.quantity) : null,
      unitPrice: transaction.unitPrice ? Number(transaction.unitPrice) : null,
      totalAmount: Number(transaction.totalAmount),
      receiptUrls,
      userId: transaction.userId.toString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      user: {
        id: transaction.user?.id?.toString(),
        name: transaction.user?.name,
        email: transaction.user?.email
      }
    }
  }
} 
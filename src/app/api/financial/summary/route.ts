import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar dados para o resumo
    const [
      totalIncome,
      totalExpense,
      totalSales,
      expensesByCategory,
      monthlyData
    ] = await Promise.all([
      // Total de entradas
      prisma.financialTransaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { totalAmount: true }
      }),
      // Total de saídas
      prisma.financialTransaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { totalAmount: true }
      }),
      // Total de vendas
      prisma.financialTransaction.aggregate({
        where: { 
          type: 'INCOME',
          category: 'SALE'
        },
        _sum: {
          totalAmount: true,
          quantity: true
        }
      }),
      // Gastos por categoria
      prisma.financialTransaction.groupBy({
        by: ['category'],
        where: { type: 'EXPENSE' },
        _sum: { totalAmount: true }
      }),
      // Dados mensais
      prisma.financialTransaction.findMany({
        where: {
          transactionDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
          }
        },
        select: {
          type: true,
          totalAmount: true,
          transactionDate: true
        }
      })
    ])

    // Calcular valores
    const totalIncomeAmount = Number(totalIncome._sum.totalAmount || 0)
    const totalExpenseAmount = Number(totalExpense._sum.totalAmount || 0)
    const balance = totalIncomeAmount - totalExpenseAmount

    // Formatar gastos por categoria
    const categoryExpenses = expensesByCategory.map(expense => {
      const amount = Number(expense._sum.totalAmount || 0)
      return {
        category: expense.category,
        total: amount,
        percentage: totalExpenseAmount > 0 
          ? (amount * 100) / totalExpenseAmount
          : 0
      }
    })

    // Formatar dados mensais
    const monthlyComparison = Array.from({ length: 6 }).map((_, index) => {
      const month = new Date()
      month.setMonth(month.getMonth() - index)
      
      const monthTransactions = monthlyData.filter(data => {
        const dataMonth = new Date(data.transactionDate).getMonth()
        return dataMonth === month.getMonth()
      })

      const monthIncome = monthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0)

      const monthExpense = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0)

      return {
        month: month.toLocaleString('pt-BR', { month: 'short' }),
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense
      }
    }).reverse()

    // Preparar resposta
    const response = {
      totalIncome: totalIncomeAmount,
      totalExpense: totalExpenseAmount,
      balance,
      totalTonnagesSold: Number(totalSales._sum.quantity || 0),
      salesRevenue: Number(totalSales._sum.totalAmount || 0),
      expensesByCategory: categoryExpenses,
      monthlyComparison
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resumo financeiro' },
      { status: 500 }
    )
  }
} 
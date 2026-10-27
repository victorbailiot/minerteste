import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { FinancialTransactionCategory, FinancialTransactionType, Prisma } from '@/generated/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.FinancialTransactionWhereInput = {
      ...(type && { type: type as FinancialTransactionType }),
      ...(category && { category: category as FinancialTransactionCategory }),
      ...(startDate && endDate && {
        transactionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    }

    const transactions = await prisma.financialTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' }
    })

    // Criar CSV
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Quantidade', 'Preço Unitário', 'Valor Total']
    const rows = transactions.map(t => [
      format(t.transactionDate, 'dd/MM/yyyy'),
      t.type,
      t.category,
      t.description,
      t.quantity?.toString() || '',
      t.unitPrice?.toString() || '',
      t.totalAmount.toString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Retornar arquivo CSV
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`
      }
    })
  } catch (error) {
    console.error('Erro ao exportar transações:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar transações' },
      { status: 500 }
    )
  }
} 
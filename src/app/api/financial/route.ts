import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { serializeBigInt } from '@/lib/utils'
import { FinancialTransactionCategory, FinancialTransactionType, Prisma } from '@/generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FinancialService } from '@/lib/financial-service'
import { fromZonedTime } from 'date-fns-tz'

// Schema para validação da transação
const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(['SALE', 'INVESTMENT', 'ADJUSTMENT', 'FREIGHT', 'SUPPLY_PURCHASE', 'SALARY', 'TAX', 'PROFIT_DISTRIBUTION', 'FUEL', 'EQUIPMENT', 'MAINTENANCE', 'LABOR', 'EXPLOSIVES', 'PROCESSING', 'EXPLORATION', 'DEVELOPMENT', 'WATER', 'ENERGY', 'ENVIRONMENTAL', 'TRANSPORT', 'REPAIRS', 'RENTAL', 'INSURANCE', 'LEGAL', 'MARKETING', 'OFFICE', 'TRAVEL', 'TRAINING', 'CONSULTING', 'UTILITIES', 'PENALTY', 'INTEREST', 'DEPRECIATION', 'LOAN', 'GRANT', 'SUBSCRIPTION', 'OTHER']),
  description: z.string().optional(),
  transactionDate: z.string(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  totalAmount: z.number(),
  receiptUrls: z.array(z.string().url()).optional(),
  userId: z.string().optional() // userId opcional - se não fornecido, usa o da sessão
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 20

    // Função para validar timezone (verifica se é um timezone válido do IANA)
    const isValidTimezone = (tz: string): boolean => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch (error) {
        return false
      }
    }

    // Função para converter data do timezone do cliente para UTC
    const convertDateToUTC = (dateString: string, hour: string, tz: string): Date => {
      // Valida o timezone - usa America/Sao_Paulo como fallback
      const validTimezone = isValidTimezone(tz) ? tz : 'America/Sao_Paulo'
      
      // Cria uma string ISO no formato esperado: YYYY-MM-DD HH:mm:ss
      // fromZonedTime aceita strings neste formato ou Date objects
      const dateTimeString = `${dateString} ${hour}`
      
      // fromZonedTime interpreta a data/hora como se estivesse no timezone especificado
      // e retorna a representação UTC correspondente
      // Exemplo: "2026-01-16 00:00:00.000" em "America/Sao_Paulo" vira UTC correspondente
      return fromZonedTime(dateTimeString, validTimezone)
    }

    const where: Prisma.FinancialTransactionWhereInput = {
      ...(type && { type: type as FinancialTransactionType }),
      ...(category && { category: category as FinancialTransactionCategory }),
      ...(startDate && endDate && {
        transactionDate: {
          // Início do dia no timezone do cliente convertido para UTC
          gte: convertDateToUTC(startDate, '00:00:00.000', timezone),
          // Fim do dia no timezone do cliente convertido para UTC
          lte: convertDateToUTC(endDate, '23:59:59.999', timezone)
        }
      })
    }

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.financialTransaction.count({ where })
    ])

    // Formatar transações usando FinancialService para processar receiptUrls
    const formattedTransactions = transactions.map((t: any) => {
      // Criar objeto temporário com user para formatTransactionResponse
      const tempTransaction = {
        ...t,
        user: t.user || { id: t.userId, name: null, email: null }
      }
      return FinancialService.formatTransactionResponse(tempTransaction)
    })

    // Serializar os dados antes de retornar
    const serializedData = serializeBigInt({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

    return NextResponse.json(serializedData)
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar transações' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    // Determinar userId: usar o fornecido no body ou o da sessão
    const userId = validatedData.userId 
      ? BigInt(validatedData.userId)
      : BigInt(session.user.id)

    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Criar a transação
    const transaction = await prisma.financialTransaction.create({
      data: {
        type: validatedData.type,
        category: validatedData.category,
        description: validatedData.description || '',
        transactionDate: new Date(validatedData.transactionDate),
        quantity: validatedData.quantity,
        unitPrice: validatedData.unitPrice,
        totalAmount: validatedData.totalAmount,
        receiptUrls: validatedData.receiptUrls ? validatedData.receiptUrls as any : null,
        userId: userId
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    // Formatar transação usando FinancialService para processar receiptUrls
    const formattedTransaction = FinancialService.formatTransactionResponse(transaction)
    
    // Serializar a transação antes de retornar
    const serializedTransaction = serializeBigInt(formattedTransaction)

    return NextResponse.json(serializedTransaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar transação:', error)
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    )
  }
} 